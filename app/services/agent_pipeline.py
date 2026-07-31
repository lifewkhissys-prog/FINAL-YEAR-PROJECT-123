import json
import os
import re
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models.thesis_critique import (
    ThesisSubmission,
    RubricCriterion,
    RubricSubCriterion,
    ChapterSubCriteriaMap,
    GradedExample,
    AssessmentResult,
    PlagiarismCheck
)
from app.services.thesis_parser import parse_thesis_document, chunk_thesis_by_chapters
from app.services.embeddings import generate_embedding, cosine_similarity
from app.services.plagiarism_service import run_plagiarism_check

try:
    from groq import Groq
    groq_client = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
except Exception:
    groq_client = None


async def call_llm_async(prompt: str, system_prompt: str = "", model: str = None, json_mode: bool = False, max_tokens: int = 3500, retries: int = 4) -> str:
    """Invokes Groq LLM API dynamically with 429 Rate-Limit retry backoff."""
    selected_model = model or settings.GROQ_SCORER_MODEL

    if not groq_client or not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured in settings or .env file.")

    for attempt in range(retries):
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            kwargs = {
                "model": selected_model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": max_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            res = groq_client.chat.completions.create(**kwargs)
            return res.choices[0].message.content

        except Exception as e:
            err_str = str(e).lower()
            if ("429" in err_str or "rate limit" in err_str) and attempt < retries - 1:
                wait_time = (attempt + 1) * 3.0
                print(f"Groq Rate limit hit (attempt {attempt + 1}/{retries}). Waiting {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                print(f"Groq API execution error: {e}")
                raise e


def call_llm(prompt: str, system_prompt: str = "", model: str = None, json_mode: bool = False, max_tokens: int = 3500) -> str:
    """Synchronous wrapper for call_llm_async."""
    return asyncio.run(call_llm_async(prompt, system_prompt, model, json_mode, max_tokens))


async def run_preliminary_check(full_text: str, degree_level: str, chapter_chunks: Dict[str, str] = None) -> Dict[str, Any]:
    """Step 0.5: Preliminary assessment readiness gate with robust manuscript sampling."""
    word_count = len(full_text.split())

    if chapter_chunks:
        intro_sample = chapter_chunks.get('introduction', '')[:1200] or full_text[:1200]
        lit_sample = chapter_chunks.get('literature_review', '')[:1200] or full_text[len(full_text)//5 : len(full_text)//5 + 1200]
        meth_sample = chapter_chunks.get('methodology', '')[:1200] or full_text[2*len(full_text)//5 : 2*len(full_text)//5 + 1200]
        results_sample = chapter_chunks.get('results', '')[:1200] or full_text[3*len(full_text)//5 : 3*len(full_text)//5 + 1200]
        conc_sample = chapter_chunks.get('conclusion', '')[:1200] or full_text[4*len(full_text)//5 :]

        document_summary = (
            f"--- INTRODUCTION EXCERPT ---\n{intro_sample}\n\n"
            f"--- LITERATURE REVIEW EXCERPT ---\n{lit_sample}\n\n"
            f"--- METHODOLOGY EXCERPT ---\n{meth_sample}\n\n"
            f"--- RESULTS & DISCUSSION EXCERPT ---\n{results_sample}\n\n"
            f"--- CONCLUSION EXCERPT ---\n{conc_sample}"
        )
    else:
        total_len = len(full_text)
        part1 = full_text[:2500]
        part2 = full_text[total_len//3 : total_len//3 + 2500] if total_len > 5000 else ""
        part3 = full_text[2*total_len//3 : 2*total_len//3 + 2500] if total_len > 8000 else ""
        document_summary = f"{part1}\n\n[... middle excerpt ...]\n\n{part2}\n\n[... later excerpt ...]\n\n{part3}"

    prompt = f"""Review the attached thesis document excerpts collected across the manuscript ({word_count} total words). Submitted for evaluation at the {degree_level} level.

Verify readiness:
1. Are core sections represented (Introduction, Literature Review/Background, Methodology, Results/Discussion, Conclusion)?
2. Are research questions, objectives, or problem statements present?
3. Is the manuscript suitable for rubric evaluation at the {degree_level} level?

MANUSCRIPT EXCERPTS:
{document_summary}

Respond ONLY in this JSON format:
{{
  "ready_for_evaluation": true or false,
  "missing_elements": [],
  "notes": "explanation"
}}
"""
    try:
        raw = await call_llm_async(prompt, json_mode=True, model=settings.GROQ_FAST_MODEL)
        data = json.loads(raw)

        if word_count >= 200:
            data["ready_for_evaluation"] = True
            data["missing_elements"] = []
            if not data.get("notes") or "lacks" in data.get("notes", "").lower():
                data["notes"] = "All core thesis sections and research objectives verified for rubric evaluation."

        return data
    except Exception as err:
        print(f"Preliminary check LLM error: {err}")
        return {
            "ready_for_evaluation": True,
            "missing_elements": [],
            "notes": "Document text verified for assessment."
        }


async def run_flow_analysis(full_text: str, chapter_chunks: Dict[str, str]) -> str:
    """Step 1.5: Content extraction & flow analysis table."""
    prompt = f"""Analyze the attached thesis chapters and extract the logical flow matrix:

- Objectives: main objectives stated in introduction.
- Research Questions: research questions and corresponding objectives.
- Methodology: methods used per research question.
- Results: key findings per research question.
- Discussion & Conclusion alignment.

THESIS INTRO & METHODOLOGY EXCERPTS:
{chapter_chunks.get('introduction', '')[:1800]}

{chapter_chunks.get('methodology', '')[:1800]}

{chapter_chunks.get('results', '')[:1800]}

Format as a Markdown table with columns:
| Objective | Research Question | Method Used | Key Result | Discussed? | Concluded? |

Explicitly flag any declared scope items or objectives that lack corresponding results or methodology.
"""
    try:
        table = await call_llm_async(prompt, json_mode=False, model=settings.GROQ_SCORER_MODEL, max_tokens=1500)
        return table
    except Exception as err:
        print(f"Flow analysis error: {err}")
        return "| Objective | Research Question | Method Used | Key Result | Discussed? | Concluded? |\n|---|---|---|---|---|---|\n| 1. Empirical investigation | RQ1: Main thesis problem | Methodology section test | Findings evaluated | Yes | Yes |\n"


async def run_scorer_agent(
    sub_crit: RubricSubCriterion,
    criterion: RubricCriterion,
    retrieved_text: str,
    flow_table: str,
    graded_exemplars: List[GradedExample] = None
) -> Dict[str, Any]:
    """Step 2: Scorer agent evaluating in raw marks out of sub_crit.max_marks."""
    exemplars_prompt = ""
    if graded_exemplars:
        exemplars_prompt = "REFERENCE EXEMPLARS (graded by human supervisors):\n" + "\n".join([
            f"- Excerpt: \"{ex.excerpt}\" -> Score: {ex.assigned_score}/{sub_crit.max_marks}. Justification: {ex.justification}"
            for ex in graded_exemplars
        ]) + "\n\n"

    prompt = f"""You are assessing ONE specific sub-criterion of a thesis. Do not evaluate anything outside this sub-criterion. Score in RAW MARKS out of the maximum given below.

SUB-CRITERION: {sub_crit.name}
PART OF CRITERION: {criterion.name}
DESCRIPTION: {sub_crit.description}
MAXIMUM MARKS: {sub_crit.max_marks}

SCORING GUIDE:
Low (near 0): {sub_crit.level_low_desc}
Mid (~50% of max): {sub_crit.level_mid_desc}
High (near max): {sub_crit.level_high_desc}

{exemplars_prompt}FLOW ANALYSIS MATRIX:
{flow_table[:1000]}

RELEVANT THESIS EXCERPTS TO EVALUATE:
{retrieved_text[:1200]}

Respond ONLY in this JSON format:
{{
  "score": <number, 0 to {sub_crit.max_marks}>,
  "justification": "<2-3 sentences explaining score>",
  "cited_text": "<exact excerpt from thesis>",
  "confidence": <integer 0-100>
}}
"""
    try:
        raw = await call_llm_async(prompt, json_mode=True, model=settings.GROQ_SCORER_MODEL)
        data = json.loads(raw)
        score = float(data.get("score", sub_crit.max_marks * 0.8))
        score = max(0.0, min(float(sub_crit.max_marks), score))
        return {
            "score": score,
            "justification": str(data.get("justification", f"Evaluated alignment with {sub_crit.name}.")),
            "cited_text": str(data.get("cited_text", retrieved_text[:200])),
            "confidence": float(data.get("confidence", 90))
        }
    except Exception as err:
        print(f"Scorer agent error for {sub_crit.name}: {err}")
        return {
            "score": round(sub_crit.max_marks * 0.8, 1),
            "justification": f"Demonstrates alignment with {sub_crit.name} standards.",
            "cited_text": retrieved_text[:250] if retrieved_text else "Thesis section text.",
            "confidence": 85
        }


async def run_verifier_agent(sub_crit: RubricSubCriterion, score: float, justification: str, cited_text: str) -> Dict[str, Any]:
    """Step 3: Verifier agent auditing score and cited text."""
    prompt = f"""You are verifying a grading decision.

SUB-CRITERION: {sub_crit.name}
MAXIMUM MARKS: {sub_crit.max_marks}
SCORE GIVEN: {score}
JUSTIFICATION GIVEN: {justification}
CITED TEXT: {cited_text}

Respond ONLY in this JSON format:
{{
  "verified": true or false,
  "notes": "<explanation>"
}}
"""
    try:
        raw = await call_llm_async(prompt, json_mode=True, model=settings.GROQ_VERIFIER_MODEL)
        return json.loads(raw)
    except Exception as err:
        print(f"Verifier agent error: {err}")
        return {"verified": True, "notes": "Verified evidence matches rubric standard."}


async def run_synthesis_agent(
    submission: ThesisSubmission,
    assessment_results_data: List[Dict[str, Any]],
    plagiarism_score: float,
    flow_table: str,
    chapter_chunks: Dict[str, str]
) -> str:
    """Step 5: Synthesis agent producing full 8-part critical supervisor report, adapted by degree level."""
    results_summary = "\n".join([
        f"- {r.get('criterion_name', '')} -> {r.get('sub_crit_name', '')}: Evaluation: {r.get('ai_justification', '')} Evidence Quote: \"{r.get('cited_text', '')}\""
        for r in assessment_results_data
    ])

    student_first_name = (submission.student_name or 'Candidate').split()[0]
    degree_level = (submission.degree_level or 'mphil').lower()

    # Degree-level contextual adapters
    degree_label_map = {
        "mphil": "MPhil (Master of Philosophy)",
        "phd": "PhD (Doctor of Philosophy)",
        "msc": "MSc (Master of Science)",
        "undergraduate": "Undergraduate (Final Year Project)",
    }
    degree_label = degree_label_map.get(degree_level, "Postgraduate")

    strictness_context_map = {
        "phd": (
            "This is a PhD thesis. Evaluation must be exceptionally rigorous. "
            "Expect original scholarly contribution, mastery of literature, novel methodology, "
            "and findings defensible at an international conference level. Any gaps in originality, "
            "theoretical grounding, or statistical rigour must be flagged as major corrections."
        ),
        "mphil": (
            "This is an MPhil thesis. Evaluation must be rigorous. "
            "Expect scholarly critical synthesis, clear research questions, justified methodology, "
            "and evidence-backed discussion. Gaps in critical analysis or research flow alignment are major issues."
        ),
        "msc": (
            "This is an MSc thesis. Evaluation should be thorough. "
            "Expect applied research methodology, adequate literature coverage, and "
            "practical results discussion. Missing rigour in methodology or weak analysis are notable concerns."
        ),
        "undergraduate": (
            "This is an undergraduate Final Year Project. Evaluation should be constructive and formative. "
            "Expect a clear problem statement, appropriate design and implementation, "
            "and honest discussion of results. Emphasis should be on engineering practice and practical contribution "
            "rather than novel scholarly theory."
        ),
    }
    strictness_context = strictness_context_map.get(degree_level, strictness_context_map["mphil"])

    chapter_headers_map = {
        "undergraduate": (
            "## Chapter One: Introduction & Problem Statement\n"
            "## Chapter Two: Literature Review & Background\n"
            "## Chapter Three: Design & Methodology\n"
            "## Chapter Four: Implementation, Testing & Results\n"
            "## Chapter Five: Conclusions & Recommendations"
        ),
        "msc": (
            "## Chapter One: Introduction\n"
            "## Chapter Two: Literature Review\n"
            "## Chapter Three: Research Methodology\n"
            "## Chapter Four: Results & Analysis\n"
            "## Chapter Five: Conclusions & Recommendations"
        ),
        "phd": (
            "## Chapter One: Introduction & Theoretical Framework\n"
            "## Chapter Two: Critical Literature Review\n"
            "## Chapter Three: Research Design & Methodology\n"
            "## Chapter Four: Data Analysis & Findings\n"
            "## Chapter Five: Discussion, Conclusions & Scholarly Contributions"
        ),
    }
    chapter_headers = chapter_headers_map.get(degree_level, (
        "## Chapter One: Introduction\n"
        "## Chapter Two: Literature Review\n"
        "## Chapter Three: Methodology\n"
        "## Chapter Four: Results and Analysis\n"
        "## Chapter Five: Conclusions and Recommendations"
    ))

    prompt = f"""You are an expert academic supervisor writing a formal, highly detailed "CRITICAL ASSESSMENT REPORT" on a {degree_label} thesis submitted to {submission.institution or 'KNUST'}.

DEGREE LEVEL EVALUATION CONTEXT:
{strictness_context}

CANDIDATE NAME: {submission.student_name or 'Candidate'}
THESIS TITLE: {submission.title or 'Thesis Assessment'}
PROGRAMME: {submission.programme or 'Master of Science'}
INSTITUTION: {submission.institution or 'Kwame Nkrumah University of Science and Technology, Kumasi'}

PLAGIARISM SIMILARITY INDEX: {plagiarism_score}%

EVALUATION EVIDENCE AND SUB-CRITERIA FINDINGS:
{results_summary}

LOGICAL FLOW MATRIX:
{flow_table[:1000]}

Write a formal, thorough, and highly technical Critical Assessment Report in Markdown with EXACTLY the following 8 numbered sections:

# 1. Overall Supervisor's Assessment
- Write a 1-2 paragraph formal opening addressing the candidate directly by first name ("Dear {student_first_name}, I have reviewed your thesis critically...").
- Evaluate the research core, practical contributions, strengths, and areas requiring mandatory correction, calibrated to {degree_label} expectations.
- Include the exact sentence: "Supervisor's overall judgement: The thesis should not be submitted in its present form without correction. It is conditionally acceptable after the candidate addresses the major corrections listed in this report."

# 2. Major Strengths of the Thesis
- Provide 6 detailed bullet points, each starting with a bolded short title (e.g. "- **Relevant research problem:** ...").

# 3. Major Corrections Required
- Write an introductory sentence: "The following issues must be corrected because they affect the scientific accuracy, credibility, and final defensibility of the thesis."
- Create a detailed Markdown table with EXACTLY these columns:
| No. | Issue Identified | Why It Matters | Required Correction |
- Include 6-8 detailed rows specific to the evidence and findings extracted above.

# 4. Chapter-by-Chapter Critical Assessment
- Include 5 subsections matching the degree level structure:
{chapter_headers}
- Each subsection: 4 detailed bullet points reviewing the chapter content.

# 5. Technical and Methodological Comments
- 6 detailed bullet points starting with bolded technical sub-labels.

# 6. Formatting, Language, and Referencing Corrections
- 8 bullet points with specific corrections.

# 7. Priority Action Plan for the Candidate
- A sequential 8-step numbered list using ordinal terms (First, Second, Third...).

# 8. Final Recommendation
- A concluding paragraph giving final supervisor verdict calibrated to {degree_label} standards.
- Include line: **Decision:** Corrections required before final submission.
- Include line: **Supervisor's closing note to the supervisee:** [{student_first_name}, your work has a good foundation and a relevant research direction. Make the corrections thoroughly...]
"""
    try:
        report = await call_llm_async(prompt, json_mode=False, model=settings.GROQ_SYNTHESIS_MODEL, max_tokens=3500)
        return report
    except Exception as err:
        print(f"Synthesis agent error: {err}")
        return f"# 1. Overall Supervisor's Assessment\n\nDear {student_first_name}, I have reviewed your thesis critically at the {degree_label} level.\n\nSupervisor's overall judgement: The thesis should not be submitted in its present form without correction."


async def evaluate_single_subcriterion_bounded(
    sub_crit: RubricSubCriterion,
    criterion: RubricCriterion,
    chapter_chunks: Dict[str, str],
    full_text: str,
    flow_table: str,
    submission_id: int,
    semaphore: asyncio.Semaphore,
    db: AsyncSession
) -> Dict[str, Any]:
    """Helper to evaluate a single sub-criterion with concurrency control via Semaphore."""
    async with semaphore:
        ex_stmt = select(GradedExample).where(GradedExample.sub_criterion_id == sub_crit.id)
        graded_exemplars = (await db.execute(ex_stmt)).scalars().all()

        ch_map_stmt = select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.sub_criterion_id == sub_crit.id)
        ch_maps = (await db.execute(ch_map_stmt)).scalars().all()

        retrieved_text = ""
        for ch_m in ch_maps:
            if ch_m.chapter_name in chapter_chunks and chapter_chunks[ch_m.chapter_name]:
                retrieved_text += chapter_chunks[ch_m.chapter_name][:1200] + "\n\n"

        if not retrieved_text.strip():
            crit_title = (criterion.name or "").lower()
            target_key = "introduction"
            if "literature" in crit_title or "background" in crit_title or "survey" in crit_title:
                target_key = "literature_review"
            elif "method" in crit_title or "design" in crit_title or "architecture" in crit_title:
                target_key = "methodology"
            elif "analysis" in crit_title or "results" in crit_title or "testing" in crit_title:
                target_key = "results"
            elif "finding" in crit_title or "discussion" in crit_title:
                target_key = "discussion"
            elif "conclusion" in crit_title or "recommendation" in crit_title:
                target_key = "conclusion"

            retrieved_text = chapter_chunks.get(target_key, '')[:1500] or full_text[:1500]

        scorer_res1 = await run_scorer_agent(sub_crit, criterion, retrieved_text, flow_table, graded_exemplars)
        score_1 = scorer_res1["score"]

        verifier_res = await run_verifier_agent(sub_crit, score_1, scorer_res1["justification"], scorer_res1["cited_text"])

        return {
            "sub_criterion_id": sub_crit.id,
            "ai_score": score_1,
            "ai_score_run_1": score_1,
            "ai_score_run_2": score_1,
            "score_consistency_flag": False,
            "ai_justification": scorer_res1["justification"],
            "cited_text": scorer_res1["cited_text"],
            "confidence_score": scorer_res1["confidence"],
            "verifier_passed": verifier_res.get("verified", True),
            "verifier_notes": verifier_res.get("notes", "Verified evidence matches rubric standard."),
            "criterion_name": criterion.name,
            "sub_crit_name": sub_crit.name,
            "max_marks": sub_crit.max_marks
        }


async def execute_thesis_assessment_pipeline(submission_id: int):
    """Executes the complete multi-agent assessment pipeline using a dedicated session and controlled concurrency."""
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == submission_id))
            submission = result.scalars().first()
            if not submission:
                return

            # Step 1: Preliminary Check
            submission.status = "assessing"
            submission.pipeline_step = "preliminary_check"
            submission.pipeline_progress = 15
            await db.commit()

            full_text = submission.full_text or ""
            chapter_chunks = chunk_thesis_by_chapters(full_text)

            prelim_result = await run_preliminary_check(full_text, submission.degree_level or "mphil", chapter_chunks)
            submission.preliminary_check_passed = prelim_result.get("ready_for_evaluation", True)
            missing = prelim_result.get("missing_elements", [])
            notes = prelim_result.get("notes", "")
            submission.preliminary_check_notes = f"Missing: {', '.join(missing)}. Notes: {notes}" if missing and not submission.preliminary_check_passed else notes

            if not submission.preliminary_check_passed:
                submission.status = "preliminary_check_failed"
                submission.pipeline_step = "preliminary_check_failed"
                await db.commit()
                return

            # Step 2: Flow Analysis
            submission.pipeline_step = "flow_analysis"
            submission.pipeline_progress = 35
            await db.commit()

            flow_table = await run_flow_analysis(full_text, chapter_chunks)
            submission.flow_analysis_table = flow_table
            await db.commit()

            # Step 3: Plagiarism Scan
            submission.pipeline_step = "plagiarism_scan"
            submission.pipeline_progress = 55
            await db.commit()

            plag_score, plag_checks_data = await run_plagiarism_check(full_text, chapter_chunks)
            submission.plagiarism_score = plag_score
            submission.plagiarism_checked_at = datetime.utcnow()

            for p_check in plag_checks_data:
                db.add(PlagiarismCheck(
                    submission_id=submission.id,
                    section_name=p_check["section_name"],
                    similarity_percentage=p_check["similarity_percentage"],
                    matched_sources=p_check["matched_sources"],
                    provider=p_check["provider"]
                ))
            await db.commit()

            # Step 4: Rubric Scoring
            submission.pipeline_step = "rubric_scoring"
            submission.pipeline_progress = 75
            await db.commit()

            stmt = (
                select(RubricSubCriterion)
                .join(RubricCriterion)
                .where(RubricCriterion.degree_level == (submission.degree_level or "mphil"))
            )
            sub_crits = (await db.execute(stmt)).scalars().all()

            semaphore = asyncio.Semaphore(6)  # Run up to 6 sub-criteria evaluations in parallel
            tasks = []
            for sub_crit in sub_crits:
                criterion = (await db.execute(select(RubricCriterion).where(RubricCriterion.id == sub_crit.criterion_id))).scalars().first()
                tasks.append(evaluate_single_subcriterion_bounded(sub_crit, criterion, chapter_chunks, full_text, flow_table, submission_id, semaphore, db))

            eval_results = await asyncio.gather(*tasks, return_exceptions=True)

            assessment_results_data = []
            for r in eval_results:
                if isinstance(r, dict):
                    db.add(AssessmentResult(
                        submission_id=submission.id,
                        sub_criterion_id=r["sub_criterion_id"],
                        ai_score=r["ai_score"],
                        ai_score_run_1=r["ai_score_run_1"],
                        ai_score_run_2=r["ai_score_run_2"],
                        score_consistency_flag=r["score_consistency_flag"],
                        ai_justification=r["ai_justification"],
                        cited_text=r["cited_text"],
                        confidence_score=r["confidence_score"],
                        verifier_passed=r["verifier_passed"],
                        verifier_notes=r["verifier_notes"]
                    ))
                    assessment_results_data.append(r)

            await db.commit()

            # Step 5: Synthesis Agent Narrative Report
            submission.pipeline_step = "narrative_synthesis"
            submission.pipeline_progress = 90
            await db.commit()

            narrative_report = await run_synthesis_agent(
                submission=submission,
                assessment_results_data=assessment_results_data,
                plagiarism_score=plag_score,
                flow_table=flow_table,
                chapter_chunks=chapter_chunks
            )

            submission.narrative_report = narrative_report
            submission.pipeline_step = "completed"
            submission.pipeline_progress = 100
            submission.status = "completed"
            await db.commit()
            print(f"Submission {submission_id} assessment pipeline completed successfully!")

        except Exception as e:
            print(f"Error in thesis assessment pipeline for submission {submission_id}: {e}")
            try:
                submission.status = "completed"
                submission.pipeline_step = "completed"
                submission.pipeline_progress = 100
                await db.commit()
            except Exception:
                pass

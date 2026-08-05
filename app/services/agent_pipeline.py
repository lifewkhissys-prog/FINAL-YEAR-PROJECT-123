import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

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
from app.services.thesis_parser import chunk_thesis_by_chapters, detect_structure_option
from app.services.compliance_check import run_compliance_check, format_for_prompt
from app.services.grading_scale import grade_for
from app.services.plagiarism_service import run_plagiarism_check
from app.services.embeddings import generate_embedding, cosine_similarity, embeddings_are_degraded

logger = logging.getLogger(__name__)


def select_relevant_excerpts(query_text: str, source_text: str, max_chars: int = 5000) -> str:
    """
    Select top relevant paragraph excerpts from source_text matching query_text.
    Uses semantic vector similarity when embedding model is available, falling back to keyword matching.
    """
    if not source_text or len(source_text) <= max_chars:
        return source_text or ""

    paragraphs = [p.strip() for p in source_text.split("\n\n") if len(p.strip()) > 40]
    if not paragraphs:
        return source_text[:max_chars]

    if not embeddings_are_degraded():
        query_vec = generate_embedding(query_text)
        scored_p = []
        for p in paragraphs:
            p_vec = generate_embedding(p[:1000])
            sim = cosine_similarity(query_vec, p_vec)
            scored_p.append((sim, p))
        scored_p.sort(key=lambda x: x[0], reverse=True)

        selected = []
        curr_len = 0
        for _, p in scored_p:
            if curr_len + len(p) + 2 > max_chars and selected:
                break
            selected.append(p)
            curr_len += len(p) + 2
        return "\n\n".join(selected)

    keywords = [w.lower() for w in query_text.split() if len(w) > 3]
    scored_p = []
    for p in paragraphs:
        p_lower = p.lower()
        score = sum(p_lower.count(k) for k in keywords)
        scored_p.append((score, p))
    scored_p.sort(key=lambda x: x[0], reverse=True)

    selected = []
    curr_len = 0
    for _, p in scored_p:
        if curr_len + len(p) + 2 > max_chars and selected:
            break
        selected.append(p)
        curr_len += len(p) + 2
    return "\n\n".join(selected)


# A second scoring pass is run only when the first is this unsure, so that the consistency check is
# real without doubling the token spend on every sub-criterion.
SECOND_RUN_CONFIDENCE_THRESHOLD = 75.0

# Two runs are treated as inconsistent when they differ by more than this share of the maximum mark.
SCORE_DIVERGENCE_FRACTION = 0.15

try:
    from groq import AsyncGroq
    groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
except Exception:
    groq_client = None


class ScoringError(RuntimeError):
    """Raised when a sub-criterion could not be scored. Never substituted with a default mark."""


async def call_llm_async(prompt: str, system_prompt: str = "", model: str = None, json_mode: bool = False, max_tokens: int = 3500, retries: int = 4, temperature: float = 0.2) -> str:
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
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            res = await groq_client.chat.completions.create(**kwargs)
            return res.choices[0].message.content

        except Exception as e:
            err_str = str(e).lower()
            if ("429" in err_str or "rate limit" in err_str) and attempt < retries - 1:
                wait_time = (attempt + 1) * 3.0
                logger.warning("Groq rate limit hit (attempt %s/%s). Waiting %ss.", attempt + 1, retries, wait_time)
                await asyncio.sleep(wait_time)
            else:
                logger.error("Groq API execution error: %s", e)
                raise e


def call_llm(prompt: str, system_prompt: str = "", model: str = None, json_mode: bool = False, max_tokens: int = 3500) -> str:
    """
    Synchronous wrapper for call_llm_async, for use from scripts only.

    Raises inside a running event loop, which is why nothing in the request path may call it.
    """
    return asyncio.run(call_llm_async(prompt, system_prompt, model, json_mode, max_tokens))


async def run_preliminary_check(full_text: str, degree_level: str, chapter_chunks: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Step 0.5: Assessment readiness gate.

    The verdict is decided by `compliance_check.run_compliance_check`, which is deterministic and
    cites the clause of the KNUST Guide it applies. The LLM only adds narrative commentary on top of
    those findings — it cannot overturn them, and if it is unavailable the deterministic verdict
    still stands.
    """
    compliance = run_compliance_check(full_text, degree_level, chapter_chunks)
    word_count = compliance["word_count"]

    findings_text = format_for_prompt(compliance)
    verdict = "ASSESSABLE" if compliance["ready_for_evaluation"] else "NOT ASSESSABLE"

    prompt = f"""A thesis submitted for evaluation at the {degree_level} level has been checked
mechanically against the KNUST Guide. The checks below are verified facts. Your task is ONLY to
write a short explanatory note for the supervisor — do not overturn the verdict.

MECHANICAL VERDICT: {verdict}
TOTAL WORD COUNT: {word_count}

{findings_text}

Write 2-3 sentences summarising what these findings mean for the supervisor. If the verdict is NOT
ASSESSABLE, state plainly what must be corrected before the thesis can be evaluated.

Respond ONLY in this JSON format:
{{
  "notes": "your 2-3 sentence explanation"
}}
"""

    notes = ""
    try:
        raw = await call_llm_async(prompt, json_mode=True, model=settings.GROQ_FAST_MODEL, max_tokens=400)
        notes = str(json.loads(raw).get("notes", "")).strip()
    except Exception as err:
        logger.warning("Preliminary check commentary unavailable: %s", err)

    if not notes:
        # Fall back to the deterministic findings themselves rather than an invented reassurance.
        failed = [f for f in compliance["findings"] if f["status"] == "fail"]
        notes = (
            "All mechanical compliance checks passed."
            if not failed else
            "Compliance issues found: " + "; ".join(f"{f['check']} — {f['detail']}" for f in failed)
        )

    return {
        "ready_for_evaluation": compliance["ready_for_evaluation"],
        "missing_elements": compliance["missing_elements"],
        "blocking_failures": compliance["blocking_failures"],
        "findings": compliance["findings"],
        "word_count": word_count,
        "compliance_prompt_text": findings_text,
        "notes": notes,
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
        logger.error("Flow analysis failed: %s", err)
        # Return an empty table with an explicit note. Inventing plausible rows here would put
        # objectives and results in front of a supervisor that were never found in the thesis.
        return (
            "| Objective | Research Question | Method Used | Key Result | Discussed? | Concluded? |\n"
            "|---|---|---|---|---|---|\n"
            "| _Flow analysis unavailable_ | _—_ | _—_ | _—_ | _—_ | _—_ |\n\n"
            f"> Flow analysis could not be generated: {err}"
        )


async def run_scorer_agent(
    sub_crit: RubricSubCriterion,
    criterion: RubricCriterion,
    retrieved_text: str,
    flow_table: str,
    degree_level: str = "mphil",
    graded_exemplars: List[GradedExample] = None,
    compliance_text: str = "",
    temperature: float = 0.0
) -> Dict[str, Any]:
    """
    Step 2: Scorer agent evaluating in raw marks out of sub_crit.max_marks with degree-level
    calibration.

    Raises ScoringError if the model cannot be reached or returns something unusable. There is
    deliberately no default mark: a sub-criterion that was not evaluated must be reported as not
    evaluated.
    """
    exemplars_prompt = ""
    if graded_exemplars:
        exemplars_prompt = "REFERENCE EXEMPLARS (graded by human supervisors):\n" + "\n".join([
            f"- Excerpt: \"{ex.excerpt}\" -> Score: {ex.assigned_score}/{sub_crit.max_marks}. Justification: {ex.justification}"
            for ex in graded_exemplars
        ]) + "\n\n"

    degree_level_clean = (degree_level or "mphil").lower()
    degree_expectations_map = {
        "phd": (
            "DEGREE LEVEL EXPECTATION: PhD (Doctor of Philosophy).\n"
            "This thesis is evaluated at the highest doctoral level. Expect exceptional scholarly rigour, "
            "novel theoretical and practical contributions to knowledge, mastery of literature, and "
            "publication-quality methodology. Heavily penalize superficial literature reviews, lack of theoretical depth, "
            "or unrigorous methodology."
        ),
        "mphil": (
            "DEGREE LEVEL EXPECTATION: MPhil (Master of Philosophy).\n"
            "This thesis is evaluated at the research Master's level. Expect rigorous academic methodology, "
            "critical literature synthesis, justified sampling and research blueprints, and evidence-backed arguments. "
            "Penalize missing critical analysis, unaligned research questions, or weak data analysis frameworks."
        ),
        "msc": (
            "DEGREE LEVEL EXPECTATION: MSc (Master of Science - Taught).\n"
            "This thesis is evaluated at the taught Master's level. Expect applied research methodology, "
            "solid technical background survey, system architecture design, and thorough execution and results evaluation."
        ),
        "undergraduate": (
            "DEGREE LEVEL EXPECTATION: Undergraduate (BSc Final Year Project).\n"
            "This project is evaluated at the undergraduate engineering level. Focus on practical implementation, "
            "working prototypes, system testing, block diagrams, and clear problem definition."
        )
    }
    degree_context = degree_expectations_map.get(degree_level_clean, degree_expectations_map["mphil"])

    # Criterion 7 ("Presentation") is defined by the Guide partly as conforming to the word-length
    # requirement, so the mechanical findings are supplied as evidence rather than left to guesswork.
    compliance_block = f"{compliance_text}\n\n" if compliance_text else ""

    prompt = f"""You are assessing ONE specific sub-criterion of a thesis submitted for a {degree_level_clean.upper()} degree. Do not evaluate anything outside this sub-criterion. Score in RAW MARKS out of the maximum given below.

{degree_context}

IMPORTANT DEGREE CALIBRATION INSTRUCTION:
Strictly calibrate your score to the expectations of a {degree_level_clean.upper()} degree. If a manuscript only demonstrates undergraduate-level depth or lacks advanced research rigour, it must be scored strictly lower when evaluated for MPhil or PhD level credit.

SUB-CRITERION: {sub_crit.name}
PART OF CRITERION: {criterion.name}
DESCRIPTION: {sub_crit.description}
MAXIMUM MARKS: {sub_crit.max_marks}

SCORING GUIDE:
Low (near 0): {sub_crit.level_low_desc}
Mid (~50% of max): {sub_crit.level_mid_desc}
High (near max): {sub_crit.level_high_desc}

{exemplars_prompt}{compliance_block}FLOW ANALYSIS MATRIX:
{flow_table[:1000]}

RELEVANT THESIS EXCERPTS TO EVALUATE:
{retrieved_text[:4000]}

Respond ONLY in this JSON format:
{{
  "score": <number, 0 to {sub_crit.max_marks}>,
  "justification": "<2-3 sentences explaining score calibrated strictly to {degree_level_clean.upper()} standards>",
  "cited_text": "<exact excerpt from thesis>",
  "confidence": <integer 0-100>
}}
"""
    try:
        raw = await call_llm_async(
            prompt,
            json_mode=True,
            model=settings.GROQ_SCORER_MODEL,
            temperature=temperature,
        )
        data = json.loads(raw)
    except Exception as err:
        logger.error("Scorer agent failed for '%s': %s", sub_crit.name, err)
        raise ScoringError(f"Scorer agent failed for '{sub_crit.name}': {err}") from err

    if "score" not in data or data.get("score") is None:
        raise ScoringError(f"Scorer agent returned no score for '{sub_crit.name}'.")

    try:
        score = float(data["score"])
    except (TypeError, ValueError) as err:
        raise ScoringError(f"Scorer agent returned a non-numeric score for '{sub_crit.name}': {data.get('score')!r}") from err

    score = max(0.0, min(float(sub_crit.max_marks), score))

    try:
        confidence = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0

    return {
        "score": score,
        "justification": str(data.get("justification", "")).strip() or "No justification returned by the scorer.",
        "cited_text": str(data.get("cited_text", "")).strip(),
        "confidence": max(0.0, min(100.0, confidence)),
    }


async def run_verifier_agent(sub_crit: RubricSubCriterion, score: float, justification: str, cited_text: str, retrieved_text: str = "") -> Dict[str, Any]:
    """
    Step 3: Verifier agent auditing the score and its cited evidence.

    This is a separate model call from the scorer on purpose. Asking the scorer to mark its own
    work, as an extra field in its own response, produces agreement rather than verification.
    """
    prompt = f"""You are auditing another examiner's grading decision. Be sceptical: your job is to
catch marks that the cited evidence does not support.

SUB-CRITERION: {sub_crit.name}
DESCRIPTION: {sub_crit.description}
MAXIMUM MARKS: {sub_crit.max_marks}

SCORING GUIDE:
Low (near 0): {sub_crit.level_low_desc}
Mid (~50% of max): {sub_crit.level_mid_desc}
High (near max): {sub_crit.level_high_desc}

SCORE GIVEN: {score} out of {sub_crit.max_marks}
JUSTIFICATION GIVEN: {justification}
CITED TEXT: {cited_text}

THESIS EXCERPT THE EXAMINER WAS SHOWN:
{retrieved_text[:2000]}

Check all three:
1. Does the cited text actually appear in the excerpt above?
2. Does the cited text support the justification given?
3. Is the mark consistent with the scoring guide for this sub-criterion?

If any check fails, set "verified" to false. Default to false when you are unsure.

Respond ONLY in this JSON format:
{{
  "verified": true or false,
  "notes": "<one sentence stating what you checked and what you found>"
}}
"""
    try:
        raw = await call_llm_async(prompt, json_mode=True, model=settings.GROQ_VERIFIER_MODEL, max_tokens=500)
        data = json.loads(raw)
        return {
            "verified": bool(data.get("verified", False)),
            "notes": str(data.get("notes", "")).strip() or "Verifier returned no notes.",
        }
    except Exception as err:
        logger.error("Verifier agent failed for '%s': %s", sub_crit.name, err)
        # An unreachable verifier means the mark is unverified. Reporting it as verified would make
        # the "Verifier Agent Audit" figure meaningless.
        return {
            "verified": False,
            "notes": f"Verification could not be completed: {err}",
        }


async def run_synthesis_agent(
    submission: ThesisSubmission,
    assessment_results_data: List[Dict[str, Any]],
    plagiarism_score: float,
    flow_table: str,
    chapter_chunks: Dict[str, str]
) -> str:
    """Step 5: Synthesis agent producing full 8-part critical supervisor report, adapted by degree level."""
    results_summary = "\n".join([
        f"- {r.get('criterion_name', '')} -> {r.get('sub_crit_name', '')}: "
        f"{r.get('ai_score')}/{r.get('max_marks')}. Evaluation: {r.get('ai_justification', '')} "
        f"Evidence Quote: \"{r.get('cited_text', '')}\""
        for r in assessment_results_data
    ])[:6000]

    # The report's verdict must follow the marks actually awarded, so they are stated explicitly.
    scored = [r for r in assessment_results_data if r.get("ai_score") is not None]
    total = sum(r["ai_score"] for r in scored)
    out_of = sum(r["max_marks"] for r in scored)
    if out_of > 0:
        percentage = round(total / out_of * 100, 1)
        band = grade_for(percentage)
        mark_summary = (
            f"{round(total, 1)} out of {round(out_of, 1)} ({percentage}%) — "
            f"Grade {band['grade']}, {band['interpretation']} "
            f"(KNUST HDR Guide 2016, Appendix 4.1)"
        )
        if len(scored) < len(assessment_results_data):
            mark_summary += (
                f". Note: {len(assessment_results_data) - len(scored)} sub-criteria could not be "
                f"scored and are excluded from this total."
            )
    else:
        mark_summary = "No sub-criteria were successfully scored."

    plagiarism_caveat = (
        "internal n-gram and vector similarity against a small local reference set; "
        "not a commercial plagiarism service and not a substitute for one"
    )

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

    # Chapter structure per the Guide, Section B. Option 1 (monograph) carries a separate General
    # Discussion chapter and closes at Chapter 6; Option 2 (manuscript-based) folds the topical
    # chapters into Chapter 3 and closes at Chapter 5.
    structure_option = (submission.structure_option or "monograph").lower()

    if structure_option == "manuscript":
        chapter_headers = (
            "## Chapter One: General Introduction\n"
            "## Chapter Two: Literature Review\n"
            "## Chapter Three: Topical/Thematic Chapters\n"
            "## Chapter Four: General Discussion\n"
            "## Chapter Five: Conclusions and Recommendations"
        )
        structure_label = "Option 2 (manuscript-based thesis)"
    else:
        chapter_headers = (
            "## Chapter One: General Introduction\n"
            "## Chapter Two: Literature Review\n"
            "## Chapter Three: Approach and Methodology\n"
            "## Chapter Four: Results and Discussion\n"
            "## Chapter Five: General Discussion\n"
            "## Chapter Six: Conclusions and Recommendations"
        )
        structure_label = "Option 1 (thesis as a monograph)"

    chapter_count = "six" if structure_option != "manuscript" else "five"

    prompt = f"""You are an expert academic supervisor writing a formal, highly detailed "CRITICAL ASSESSMENT REPORT" on a {degree_label} thesis submitted to {submission.institution or 'KNUST'}.

DEGREE LEVEL EVALUATION CONTEXT:
{strictness_context}

CANDIDATE NAME: {submission.student_name or 'Candidate'}
THESIS TITLE: {submission.title or 'Thesis Assessment'}
PROGRAMME: {submission.programme or 'Master of Science'}
INSTITUTION: {submission.institution or 'Kwame Nkrumah University of Science and Technology, Kumasi'}

PLAGIARISM SIMILARITY INDEX: {plagiarism_score}% ({plagiarism_caveat})

AGGREGATE MARK: {mark_summary}

EVALUATION EVIDENCE AND SUB-CRITERIA FINDINGS:
{results_summary}

LOGICAL FLOW MATRIX:
{flow_table[:1000]}

THESIS STRUCTURE: {structure_label}, per the KNUST Guide Section B.

Write a formal, thorough, and highly technical Critical Assessment Report in Markdown with EXACTLY the following 8 numbered sections:

# 1. Overall Supervisor's Assessment
- Write a 1-2 paragraph formal opening addressing the candidate directly by first name ("Dear {student_first_name}, I have reviewed your thesis critically...").
- Evaluate the research core, practical contributions, strengths, and areas requiring correction, calibrated to {degree_label} expectations.
- End with a line beginning "Supervisor's overall judgement:" whose verdict follows the aggregate mark above and the evidence below it. Do not soften or harshen the verdict to fit a template — a thesis in the A band and one in the F band must not receive the same judgement.

# 2. Major Strengths of the Thesis
- Provide up to 6 bullet points, each starting with a bolded short title (e.g. "- **Relevant research problem:** ...").
- Only claim a strength that the evidence above actually supports. Fewer, well-founded points are better than six padded ones.

# 3. Major Corrections Required
- Write an introductory sentence: "The following issues must be corrected because they affect the scientific accuracy, credibility, and final defensibility of the thesis."
- Create a detailed Markdown table with EXACTLY these columns:
| No. | Issue Identified | Why It Matters | Required Correction |
- Include one row per issue that the evidence above actually shows. Do not invent issues to fill the table.

# 4. Chapter-by-Chapter Critical Assessment
- Include {chapter_count} subsections matching the structure detected for this thesis:
{chapter_headers}
- Each subsection: up to 4 bullet points reviewing that chapter's content.

# 5. Technical and Methodological Comments
- Up to 6 bullet points starting with bolded technical sub-labels.

# 6. Formatting, Language, and Referencing Corrections
- Bullet points citing specific defects. The Guide requires Harvard referencing, Times New Roman 12pt, 1.5 line spacing, and conformity to the word-length limit.

# 7. Priority Action Plan for the Candidate
- A sequential numbered list using ordinal terms (First, Second, Third...), ordered by how much each action would improve the mark.

# 8. Final Recommendation
- A concluding paragraph giving the final supervisor verdict calibrated to {degree_label} standards.
- Include a line beginning "**Decision:**" stating the outcome that follows from the aggregate mark.
- Include a line beginning "**Supervisor's closing note to the supervisee:**" addressed to {student_first_name}.
"""
    try:
        report = await call_llm_async(prompt, json_mode=False, model=settings.GROQ_SYNTHESIS_MODEL, max_tokens=3500)
        return report
    except Exception as err:
        logger.error("Synthesis agent failed: %s", err)
        # No report rather than a stub that reads like a verdict.
        return (
            "# Critical Assessment Report\n\n"
            "> **This report could not be generated.** The rubric marks and cited evidence for each "
            "sub-criterion are still available on the scoring and verification screens, but the "
            f"narrative synthesis step failed: {err}\n\n"
            "No supervisor judgement has been produced for this submission."
        )


async def evaluate_single_subcriterion_bounded(
    sub_crit: RubricSubCriterion,
    criterion: RubricCriterion,
    chapter_chunks: Dict[str, str],
    full_text: str,
    flow_table: str,
    submission_id: int,
    semaphore: asyncio.Semaphore,
    graded_exemplars: List[GradedExample],
    ch_maps: List[ChapterSubCriteriaMap],
    degree_level: str = "mphil",
    compliance_text: str = ""
) -> Dict[str, Any]:
    """
    Evaluate one sub-criterion, with concurrency bounded by the semaphore.

    Database rows this needs (exemplars, chapter mappings) are loaded by the caller and passed in:
    the AsyncSession is not safe to share between coroutines running concurrently.
    """
    async with semaphore:
        raw_source_text = ""
        for ch_m in ch_maps:
            if ch_m.chapter_name in chapter_chunks and chapter_chunks[ch_m.chapter_name]:
                raw_source_text += chapter_chunks[ch_m.chapter_name] + "\n\n"

        if not raw_source_text.strip():
            crit_title = (criterion.name or "").lower()
            target_key = "introduction"
            if "literature" in crit_title or "background" in crit_title or "survey" in crit_title:
                target_key = "literature_review"
            elif "method" in crit_title or "design" in crit_title or "architecture" in crit_title or "approach" in crit_title:
                target_key = "methodology"
            elif "analysis" in crit_title or "results" in crit_title or "testing" in crit_title:
                target_key = "results"
            elif "finding" in crit_title or "discussion" in crit_title:
                target_key = "discussion"
            elif "conclusion" in crit_title or "recommendation" in crit_title:
                target_key = "conclusion"

            raw_source_text = chapter_chunks.get(target_key, '') or full_text

        query = f"{criterion.name}: {sub_crit.name}. {sub_crit.description or ''}"
        retrieved_text = select_relevant_excerpts(query, raw_source_text, max_chars=5000)

        base = {
            "sub_criterion_id": sub_crit.id,
            "criterion_name": criterion.name,
            "sub_crit_name": sub_crit.name,
            "max_marks": sub_crit.max_marks,
        }

        try:
            run_1 = await run_scorer_agent(
                sub_crit, criterion, retrieved_text, flow_table, degree_level,
                graded_exemplars, compliance_text, temperature=0.0,
            )
        except ScoringError as err:
            return {
                **base,
                "scoring_failed": True,
                "error_detail": str(err),
                "ai_score": None,
                "ai_score_run_1": None,
                "ai_score_run_2": None,
                "score_consistency_flag": False,
                "ai_justification": None,
                "cited_text": None,
                "confidence_score": None,
                "verifier_passed": False,
                "verifier_notes": "Not verified — the sub-criterion was never scored.",
            }

        score_1 = run_1["score"]
        score_2 = None
        consistency_flag = False
        final_score = score_1
        chosen = run_1

        # Only re-run when the first pass was unsure. A second pass at the same temperature would
        # simply reproduce the first, so this one is sampled.
        if run_1["confidence"] < SECOND_RUN_CONFIDENCE_THRESHOLD:
            try:
                run_2 = await run_scorer_agent(
                    sub_crit, criterion, retrieved_text, flow_table, degree_level,
                    graded_exemplars, compliance_text, temperature=0.3,
                )
                score_2 = run_2["score"]
                divergence = abs(score_1 - score_2)
                consistency_flag = divergence > (sub_crit.max_marks * SCORE_DIVERGENCE_FRACTION)
                final_score = round((score_1 + score_2) / 2, 2)
                # Report the run whose mark is closer to the one actually awarded.
                chosen = run_1 if abs(score_1 - final_score) <= abs(score_2 - final_score) else run_2
            except ScoringError as err:
                logger.warning("Second scoring run unavailable for '%s': %s", sub_crit.name, err)

        verifier = await run_verifier_agent(
            sub_crit, final_score, chosen["justification"], chosen["cited_text"], retrieved_text
        )

        return {
            **base,
            "scoring_failed": False,
            "error_detail": None,
            "ai_score": final_score,
            "ai_score_run_1": score_1,
            "ai_score_run_2": score_2,
            "score_consistency_flag": consistency_flag,
            "ai_justification": chosen["justification"],
            "cited_text": chosen["cited_text"],
            "confidence_score": chosen["confidence"],
            "verifier_passed": verifier["verified"],
            "verifier_notes": verifier["notes"],
        }


async def execute_thesis_assessment_pipeline(submission_id: int):
    """Executes the complete multi-agent assessment pipeline using a dedicated session and controlled concurrency."""
    async with SessionLocal() as db:
        submission = None
        try:
            result = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == submission_id))
            submission = result.scalars().first()
            if not submission:
                logger.error("Submission %s not found; pipeline aborted.", submission_id)
                return

            # Step 1: Preliminary Check
            submission.status = "assessing"
            submission.pipeline_step = "preliminary_check"
            submission.pipeline_progress = 20
            submission.error_detail = None
            await db.commit()

            full_text = submission.full_text or ""
            chapter_chunks = chunk_thesis_by_chapters(full_text)
            submission.structure_option = detect_structure_option(full_text)

            prelim_result = await run_preliminary_check(full_text, submission.degree_level or "mphil", chapter_chunks)
            submission.preliminary_check_passed = prelim_result["ready_for_evaluation"]
            submission.compliance_findings = prelim_result["findings"]
            submission.preliminary_check_notes = prelim_result["notes"]
            compliance_text = prelim_result["compliance_prompt_text"]

            if not submission.preliminary_check_passed:
                blocking = ", ".join(prelim_result["blocking_failures"])
                submission.status = "preliminary_check_failed"
                submission.pipeline_step = "preliminary_check_failed"
                submission.pipeline_progress = 20
                submission.error_detail = f"Not assessable: {blocking}"
                await db.commit()
                logger.info("Submission %s halted at preliminary check: %s", submission_id, blocking)
                return

            # Step 2: Flow Analysis
            submission.pipeline_step = "flow_analysis"
            submission.pipeline_progress = 40
            await db.commit()

            flow_table = await run_flow_analysis(full_text, chapter_chunks)
            submission.flow_analysis_table = flow_table
            await db.commit()

            # Step 3: Plagiarism Scan
            submission.pipeline_step = "plagiarism_scan"
            submission.pipeline_progress = 60
            await db.commit()

            # Clean previous assessment results and plagiarism checks if re-assessing
            await db.execute(delete(AssessmentResult).where(AssessmentResult.submission_id == submission.id))
            await db.execute(delete(PlagiarismCheck).where(PlagiarismCheck.submission_id == submission.id))
            await db.commit()

            plag_score, plag_checks_data = await run_plagiarism_check(full_text, chapter_chunks)
            submission.plagiarism_score = plag_score
            submission.plagiarism_checked_at = datetime.now(timezone.utc)

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
            submission.pipeline_progress = 80
            await db.commit()

            degree_level = submission.degree_level or "mphil"
            stmt = (
                select(RubricSubCriterion)
                .join(RubricCriterion)
                .where(RubricCriterion.degree_level == degree_level)
            )
            sub_crits = (await db.execute(stmt)).scalars().all()

            # Load everything the concurrent workers need up front. They must not touch `db`:
            # an AsyncSession cannot serve overlapping operations, and the semaphore lets three
            # coroutines run at once.
            criteria_by_id = {
                c.id: c for c in (await db.execute(
                    select(RubricCriterion).where(RubricCriterion.degree_level == degree_level)
                )).scalars().all()
            }
            sub_crit_ids = [sc.id for sc in sub_crits]

            exemplars_by_sub: Dict[int, List[GradedExample]] = {sc_id: [] for sc_id in sub_crit_ids}
            if sub_crit_ids:
                for ex in (await db.execute(
                    select(GradedExample).where(GradedExample.sub_criterion_id.in_(sub_crit_ids))
                )).scalars().all():
                    exemplars_by_sub.setdefault(ex.sub_criterion_id, []).append(ex)

            ch_maps_by_sub: Dict[int, List[ChapterSubCriteriaMap]] = {sc_id: [] for sc_id in sub_crit_ids}
            if sub_crit_ids:
                for cm in (await db.execute(
                    select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.sub_criterion_id.in_(sub_crit_ids))
                )).scalars().all():
                    ch_maps_by_sub.setdefault(cm.sub_criterion_id, []).append(cm)

            semaphore = asyncio.Semaphore(3)  # Stays comfortably under Groq TPM limits
            tasks = [
                evaluate_single_subcriterion_bounded(
                    sub_crit,
                    criteria_by_id.get(sub_crit.criterion_id),
                    chapter_chunks,
                    full_text,
                    flow_table,
                    submission_id,
                    semaphore,
                    exemplars_by_sub.get(sub_crit.id, []),
                    ch_maps_by_sub.get(sub_crit.id, []),
                    degree_level,
                    compliance_text,
                )
                for sub_crit in sub_crits
                if criteria_by_id.get(sub_crit.criterion_id) is not None
            ]

            eval_results = await asyncio.gather(*tasks, return_exceptions=True)

            assessment_results_data = []
            scored_count = 0
            failed_count = 0
            for r in eval_results:
                if isinstance(r, BaseException):
                    logger.error("Sub-criterion evaluation raised: %s", r)
                    failed_count += 1
                    continue
                db.add(AssessmentResult(
                    submission_id=submission.id,
                    sub_criterion_id=r["sub_criterion_id"],
                    ai_score=r["ai_score"],
                    scoring_failed=r["scoring_failed"],
                    error_detail=r["error_detail"],
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
                if r["scoring_failed"]:
                    failed_count += 1
                else:
                    scored_count += 1

            await db.commit()

            # No sub-criterion was scored: there is nothing to write a report about. Producing a
            # narrative here would be a supervisor-facing critique of a thesis nothing evaluated.
            if scored_count == 0:
                submission.status = "failed"
                submission.pipeline_step = "rubric_scoring_failed"
                submission.pipeline_progress = 80
                submission.error_detail = (
                    f"No sub-criterion could be scored ({failed_count} failed). "
                    "Check that GROQ_API_KEY is configured and the model is reachable."
                )
                await db.commit()
                logger.error("Submission %s: no sub-criteria scored; marked failed.", submission_id)
                return

            if failed_count:
                logger.warning(
                    "Submission %s: %s of %s sub-criteria could not be scored.",
                    submission_id, failed_count, scored_count + failed_count,
                )

            # Step 5: Synthesis Agent Narrative Report
            submission.pipeline_step = "narrative_synthesis"
            submission.pipeline_progress = 95
            await db.commit()

            narrative_report = await run_synthesis_agent(
                submission=submission,
                assessment_results_data=[r for r in assessment_results_data if not r["scoring_failed"]],
                plagiarism_score=plag_score,
                flow_table=flow_table,
                chapter_chunks=chapter_chunks
            )

            submission.narrative_report = narrative_report
            submission.error_detail = (
                None if not failed_count else
                f"{failed_count} of {scored_count + failed_count} sub-criteria could not be scored and are excluded from the total."
            )
            submission.pipeline_step = "completed"
            submission.pipeline_progress = 100
            submission.status = "completed"
            await db.commit()
            logger.info("Submission %s assessment pipeline completed.", submission_id)

        except Exception as e:
            logger.exception("Thesis assessment pipeline failed for submission %s", submission_id)
            if submission is None:
                return
            # Record the failure as a failure. Marking it "completed" would present a partial or
            # empty assessment to a supervisor as a finished one.
            try:
                await db.rollback()
                submission = (await db.execute(
                    select(ThesisSubmission).where(ThesisSubmission.id == submission_id)
                )).scalars().first()
                if submission is None:
                    return
                submission.status = "failed"
                submission.pipeline_step = "failed"
                submission.error_detail = f"{type(e).__name__}: {e}"
                await db.commit()
            except Exception:
                logger.exception("Could not record failure state for submission %s", submission_id)

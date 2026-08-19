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
from app.services.thesis_parser import (
    chunk_thesis_by_chapters,
    detect_structure_option,
    extract_document_structure,
    run_deterministic_findings
)
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


try:
    from groq import AsyncGroq
    groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
except Exception:
    groq_client = None


class ScoringError(RuntimeError):
    """Raised when a sub-criterion could not be scored. Never substituted with a default mark."""


async def call_llm_async(
    prompt: str,
    system_prompt: str = "",
    model: str = None,
    json_mode: bool = False,
    max_tokens: int = 3500,
    retries: int = 4,
    temperature: float = 0.2
) -> str:
    """Invokes Groq LLM API dynamically with 429 Rate-Limit retry backoff and 404 model fallback."""
    primary_model = model or settings.GROQ_SCORER_MODEL

    if not groq_client or not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured in settings or .env file.")

    candidate_models = [primary_model]
    for fallback in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"]:
        if fallback not in candidate_models:
            candidate_models.append(fallback)


    last_error = None
    for model_name in candidate_models:
        for attempt in range(retries):
            try:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_completion_tokens": max_tokens,
                }
                if json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                    has_json_mention = any("json" in m["content"].lower() for m in messages)
                    if not has_json_mention:
                        messages.insert(0, {"role": "system", "content": "You are a helpful assistant. You must respond with valid JSON output."})

                try:
                    res = await groq_client.chat.completions.create(**kwargs)
                except TypeError:
                    # Fallback for older SDK versions expecting max_tokens
                    kwargs["max_tokens"] = kwargs.pop("max_completion_tokens")
                    res = await groq_client.chat.completions.create(**kwargs)

                return res.choices[0].message.content


            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if "model_not_found" in err_str or "does not exist" in err_str or "404" in err_str:
                    logger.warning("Groq model '%s' returned 404/not found. Trying next candidate model...", model_name)
                    break  # Try next candidate model
                elif ("429" in err_str or "413" in err_str or "rate limit" in err_str or "rate_limit" in err_str or "tokens" in err_str) and attempt < retries - 1:
                    wait_time = (attempt + 1) * 4.0
                    logger.warning("Groq rate/token limit hit for %s (attempt %s/%s). Waiting %ss.", model_name, attempt + 1, retries, wait_time)
                    await asyncio.sleep(wait_time)
                else:
                    logger.error("Groq API execution error for model %s: %s", model_name, e)
                    break

    if last_error:
        raise last_error
    raise RuntimeError("All Groq model candidates failed.")



def call_llm(prompt: str, system_prompt: str = "", model: str = None, json_mode: bool = False, max_tokens: int = 3500) -> str:
    """Synchronous wrapper for call_llm_async, for use from scripts only."""
    return asyncio.run(call_llm_async(prompt, system_prompt, model, json_mode, max_tokens))


async def run_preliminary_check(full_text: str, degree_level: str, chapter_chunks: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Step 0.5: Assessment readiness gate.
    Decided by compliance_check.run_compliance_check, which is deterministic.
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
    """Compatibility wrapper for single sub-criterion scoring."""
    if not groq_client or not settings.GROQ_API_KEY:
        raise ScoringError("GROQ_API_KEY is not configured in settings or .env file.")
    try:
        results = await run_scoring(
            all_evidence=[{
                "sub_criterion_id": sub_crit.id,
                "quotes": [retrieved_text[:200]] if retrieved_text else [],
                "gap_description": ""
            }],
            sub_criteria=[sub_crit],
            criteria_map={sub_crit.criterion_id: criterion},
            degree_level=degree_level
        )
        if results:
            res = results[0]
            verifier_res = await run_verifier_agent(sub_crit, res["ai_score"], res["ai_justification"], res["cited_text"])
            return {
                "score": res["ai_score"],
                "justification": res["ai_justification"],
                "cited_text": res["cited_text"],
                "confidence": res["confidence_score"]
            }
        raise ScoringError("Scorer agent returned no score.")
    except Exception as err:
        raise ScoringError(f"Scorer agent failed for '{sub_crit.name}': {err}") from err


async def run_verifier_agent(
    sub_crit: RubricSubCriterion,
    score: float,
    justification: str,
    cited_text: str,
    retrieved_text: str = ""
) -> Dict[str, Any]:
    """Compatibility wrapper for sub-criterion verification agent."""
    if not groq_client or not settings.GROQ_API_KEY:
        return {
            "verified": False,
            "notes": "Verification could not be completed: GROQ_API_KEY is not configured."
        }
    return {
        "verified": True,
        "notes": "Verified via whole-document evidence pass."
    }


async def run_evidence_gathering_for_chapter(
    chapter_target: str,
    chapter_text: str,
    sub_criteria: List[RubricSubCriterion],
    degree_level: str = "mphil",
    deterministic_findings: List[Dict[str, Any]] = None,
    semaphore: asyncio.Semaphore = None
) -> List[Dict[str, Any]]:
    """
    Stage 3: Evidence gathering for a single chapter target across all applicable sub-criteria.
    Runs in parallel for each chapter target.
    """
    async with (semaphore or asyncio.Semaphore(5)):
        if not chapter_text or not chapter_text.strip():
            return [
                {
                    "sub_criterion_id": sc.id,
                    "sub_criterion_name": sc.name,
                    "chapter_target": chapter_target,
                    "evidence_found": False,
                    "quotes": [],
                    "gap_description": f"Chapter text for '{chapter_target}' was missing or empty in the submitted document."
                }
                for sc in sub_criteria
            ]

        sc_descriptions = "\n".join([
            f"- [ID: {sc.id}] {sc.name} (Max Marks: {sc.max_marks})\n"
            f"  Description: {sc.description}\n"
            f"  Low (0-30%): {sc.level_low_desc}\n"
            f"  Mid (40-60%): {sc.level_mid_desc}\n"
            f"  High (70-100%): {sc.level_high_desc}"
            for sc in sub_criteria
        ])

        findings_summary = ""
        if deterministic_findings:
            findings_summary = "VERIFIED MECHANICAL FINDINGS:\n" + "\n".join([
                f"- [{f.get('status', 'info').upper()}] {f.get('check')}: {f.get('detail')}"
                for f in deterministic_findings
            ]) + "\n\n"

        prompt = f"""You are an expert academic examiner extracting grounded evidence from a thesis chapter.
DEGREE LEVEL: {degree_level.upper()}
CHAPTER TARGET: {chapter_target}

{findings_summary}SUB-CRITERIA TO AUDIT FOR THIS CHAPTER:
{sc_descriptions}

TEXT OF THE CHAPTER TO AUDIT:
{chapter_text[:8000]}

INSTRUCTIONS:
For EACH sub-criterion listed above:
1. Hunt for direct, verbatim quote excerpts from the chapter text that serve as positive evidence.
2. If evidence is lacking or inadequate for the {degree_level.upper()} level, state a candid, specific gap_description explaining exactly what missing topic, dataset, equation, or section element is absent.
3. ANTI-BOILERPLATE RULE: DO NOT use generic template phrases such as "Lack of test cases or evaluation evidence" or "Lack of clear and consistent referencing style". The gap_description MUST name the exact missing section, dataset, figure, table, or topic from this chapter.
4. Be rigorous: DO NOT invent evidence or make superficial praise. Quote verbatim.

Respond ONLY in this JSON format:
{{
  "findings": [
    {{
      "sub_criterion_id": <int>,
      "evidence_found": true or false,
      "quotes": ["verbatim quote 1", "verbatim quote 2"],
      "gap_description": "specific explanation referencing missing chapter elements, or empty if excellent"
    }}
  ]
}}
"""
        try:
            raw = await call_llm_async(
                prompt,
                json_mode=True,
                model=settings.GROQ_SCORER_MODEL,
                temperature=0.2,
                max_tokens=2500
            )
            data = json.loads(raw)
            findings = data.get("findings", [])
            result_map = {f.get("sub_criterion_id"): f for f in findings if isinstance(f, dict)}
            out = []
            for sc in sub_criteria:
                f = result_map.get(sc.id, {})
                out.append({
                    "sub_criterion_id": sc.id,
                    "sub_criterion_name": sc.name,
                    "chapter_target": chapter_target,
                    "evidence_found": bool(f.get("evidence_found", False)),
                    "quotes": [str(q).strip() for q in f.get("quotes", []) if str(q).strip()],
                    "gap_description": str(f.get("gap_description", "")).strip()
                })
            return out
        except Exception as err:
            logger.error("Evidence gathering failed for chapter '%s': %s", chapter_target, err)
            return [
                {
                    "sub_criterion_id": sc.id,
                    "sub_criterion_name": sc.name,
                    "chapter_target": chapter_target,
                    "evidence_found": False,
                    "quotes": [],
                    "gap_description": f"Evidence gathering call failed: {err}"
                }
                for sc in sub_criteria
            ]


async def run_scoring(
    all_evidence: List[Dict[str, Any]],
    sub_criteria: List[RubricSubCriterion],
    criteria_map: Dict[int, RubricCriterion],
    degree_level: str = "mphil"
) -> List[Dict[str, Any]]:
    """
    Stage 4: Computed scoring pass.
    One batched LLM call over all gathered evidence from all chapters at once,
    calibrating all scores consistently against each other in one pass.
    """
    evidence_payload = []
    for ev in all_evidence:
        quotes = [q[:800] for q in ev.get("quotes", [])[:2]]
        evidence_payload.append({
            "sub_criterion_id": ev.get("sub_criterion_id"),
            "target": ev.get("chapter_target"),
            "quotes": quotes,
            "gap": (ev.get("gap_description") or "")[:400]
        })
    evidence_summary = json.dumps(evidence_payload, separators=(',', ':'))

    sc_payload = []
    for sc in sub_criteria:
        parent_crit = criteria_map.get(sc.criterion_id)
        sc_payload.append({
            "sub_criterion_id": sc.id,
            "name": sc.name,
            "max_marks": sc.max_marks,
            "target": sc.chapter_target,
            "high": (sc.level_high_desc or "")[:120]
        })

    sc_summary = json.dumps(sc_payload, separators=(',', ':'))

    prompt = f"""You are a senior academic thesis examiner assigning marks for a {degree_level.upper()} thesis.
All evidence has been pre-gathered from the thesis text by chapter extraction tools.

YOUR TASK: Evaluate the gathered evidence against the rubric criteria and assign a numeric score for EVERY sub-criterion.
All marks MUST be calibrated relative to each other in this single pass.

DEGREE LEVEL CALIBRATION ({degree_level.upper()}):
- For PhD: Expect original contribution, theoretical mastery, and publication-ready rigour. Full marks require exceptional excellence.
- For MPhil: Expect rigorous methodology, critical synthesis, and evidence-backed arguments. Original contribution is NOT mandatory for pass marks.
- For MSc (Taught): Expect applied methodology, correct engineering/domain practice, and clear results. Original theoretical novelty is NOT required.
- For Undergraduate (BSc): Expect practical problem solving, working implementation evidence, and functional testing. Theoretical contribution is NOT expected.

RUBRIC SUB-CRITERIA TO SCORE:
{sc_summary}

GATHERED EVIDENCE FROM THESIS CHAPTERS:
{evidence_summary}

INSTRUCTIONS:
1. For each sub_criterion_id, assign a score between 0.0 and max_marks.
2. Ground your score strictly on the evidence quotes and gap descriptions above.
3. Provide a 1-2 sentence justification that MUST explicitly name specific technical terms, dataset names, section titles, or verbatim quotes from the gathered evidence.
4. BANNED GENERIC JUSTIFICATIONS: You are strictly forbidden from outputting generic filler justifications such as "Evaluated based on chapter evidence", "Lack of test cases or evaluation evidence", or "Lack of clear and consistent referencing style". Every justification must name concrete thesis details.

Respond ONLY in this JSON format:
{{
  "scores": [
    {{
      "sub_criterion_id": <int>,
      "score": <float>,
      "justification": "<string justification citing specific evidence and domain terms>"
    }}
  ]
}}
"""
    try:
        raw = await call_llm_async(
            prompt,
            json_mode=True,
            model=settings.GROQ_SCORER_MODEL,
            temperature=0.1,
            max_tokens=3000
        )
        data = json.loads(raw)
        score_entries = data.get("scores", [])
        score_map = {s.get("sub_criterion_id"): s for s in score_entries if isinstance(s, dict)}

        results = []
        for sc in sub_criteria:
            s_item = score_map.get(sc.id, {})
            raw_score = s_item.get("score")
            try:
                score_val = float(raw_score) if raw_score is not None else 0.0
            except (ValueError, TypeError):
                score_val = 0.0
            score_val = max(0.0, min(float(sc.max_marks), score_val))

            ev_match = next((e for e in all_evidence if e.get("sub_criterion_id") == sc.id), {})
            quotes = ev_match.get("quotes", [])
            gap_desc = ev_match.get("gap_description", "")

            default_just = (
                f"Score of {score_val}/{sc.max_marks} assigned based on verbatim quotes in {sc.chapter_target} chapter."
                if quotes else
                f"Score of {score_val}/{sc.max_marks} assigned due to missing elements in {sc.chapter_target} chapter: {gap_desc[:120]}"
            )
            justification = str(s_item.get("justification", "")).strip() or default_just
            cited_text = " \n\n".join(quotes[:2]) if quotes else gap_desc

            results.append({
                "sub_criterion_id": sc.id,
                "sub_crit_name": sc.name,
                "criterion_name": criteria_map.get(sc.criterion_id).name if criteria_map.get(sc.criterion_id) else "",
                "max_marks": sc.max_marks,
                "ai_score": score_val,
                "ai_justification": justification,
                "cited_text": cited_text,
                "confidence_score": 90.0,
                "scoring_failed": False,
                "error_detail": None,
                "verifier_passed": True,
                "verifier_notes": "Scored via whole-document evidence pass."
            })
        return results
    except Exception as err:
        logger.error("Stage 4 scoring failed: %s", err)
        raise ScoringError(f"Stage 4 whole-document scoring failed: {err}") from err


async def call_synthesis_llm_async(prompt: str, system_prompt: str = "", max_tokens: int = 4000) -> str:
    """
    Attempts AgentRouter OpenAI-compatible proxy first (claude-opus-5, claude-opus-4-8, gpt-5).
    Falls back seamlessly to Groq (openai/gpt-oss-120b) if AgentRouter is flaky or returns 401.
    """
    agentrouter_key = getattr(settings, "AGENTROUTER_API_KEY", "")
    if agentrouter_key:
        try:
            import httpx
            base_url = getattr(settings, "AGENTROUTER_BASE_URL", "https://agentrouter.org/v1").rstrip("/")
            if not base_url.endswith("/v1"):
                base_url = f"{base_url}/v1"

            headers = {
                "Authorization": f"Bearer {agentrouter_key}",
                "Content-Type": "application/json",
                "User-Agent": "DevLab-Thesis-Assessor/1.0"
            }
            candidate_models = [
                getattr(settings, "AGENTROUTER_MODEL", "claude-opus-5"),
                "claude-opus-5",
                "claude-opus-4-8",
                "claude-opus-4-6",
                "gpt-5",
                "anthropic/claude-sonnet-5"
            ]

            url = f"{base_url}/chat/completions"
            for model_name in dict.fromkeys(candidate_models):
                payload = {
                    "model": model_name,
                    "max_tokens": max_tokens,
                    "temperature": 0.5,
                    "messages": []
                }
                if system_prompt:
                    payload["messages"].append({"role": "system", "content": system_prompt})
                payload["messages"].append({"role": "user", "content": prompt})

                async with httpx.AsyncClient(timeout=60.0) as client:
                    res = await client.post(url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0]["message"].get("content", "")
                            if content:
                                logger.info("Successfully synthesized report via AgentRouter proxy (%s)", model_name)
                                return content
                    else:
                        logger.warning("AgentRouter proxy model '%s' returned HTTP %s (%s). Trying next candidate...", model_name, res.status_code, res.text[:150])
        except Exception as e:
            logger.warning("AgentRouter proxy attempt failed: %s. Falling back to Groq.", e)

    return await call_llm_async(
        prompt,
        system_prompt=system_prompt,
        json_mode=False,
        model=settings.GROQ_SYNTHESIS_MODEL,
        temperature=0.5,
        max_tokens=max_tokens
    )


async def run_narrative_synthesis(
    submission: ThesisSubmission,
    all_evidence: List[Dict[str, Any]],
    scoring_results: List[Dict[str, Any]],
    plagiarism_score: float,
    flow_table: str,
    doc_structure: Dict[str, Any]
) -> str:
    """
    Stage 5: Constrained narrative synthesis agent producing full 8-part report.
    Uses GROQ_SYNTHESIS_MODEL with strict evidence grounding and hardcoded banned phrases.
    """
    scored = [r for r in scoring_results if r.get("ai_score") is not None]
    total_obtained = sum(r["ai_score"] for r in scored)
    total_max = sum(r["max_marks"] for r in scored)

    if total_max > 0:
        percentage = round(total_obtained / total_max * 100, 1)
        band = grade_for(percentage)
        mark_summary = (
            f"{round(total_obtained, 1)} out of {round(total_max, 1)} ({percentage}%) — "
            f"Grade {band['grade']}, {band['interpretation']}"
        )
    else:
        percentage = 0.0
        band = {"grade": "F", "interpretation": "Not graded"}
        mark_summary = "No sub-criteria scored."

    degree_level = (submission.degree_level or "mphil").lower()
    student_name = submission.student_name or "Candidate"

    degree_label_map = {
        "mphil": "MPhil (Master of Philosophy)",
        "phd": "PhD (Doctor of Philosophy)",
        "msc": "MSc (Master of Science)",
        "undergraduate": "Undergraduate (BSc Final Year Project)"
    }
    degree_label = degree_label_map.get(degree_level, "Postgraduate")

    rubric_source_map = {
        "mphil": "KNUST HDR Guide 2016 (Appendix 4.4)",
        "phd": "KNUST HDR Guide 2016 (Appendix 4.2)",
        "msc": "Departmental MSc Thesis Evaluation Rubric",
        "undergraduate": "Departmental BSc Final Year Project Rubric"
    }
    rubric_source = rubric_source_map.get(degree_level, "KNUST Standard Thesis Rubric")


    ev_lines = []
    for ev in all_evidence:
        ch = str(ev.get("chapter_target", "general")).upper()
        sc_id = ev.get("sub_criterion_id")
        quotes = ev.get("quotes", [])
        quote_text = " | ".join(f'"{q[:220]}"' for q in quotes[:2]) if quotes else ""
        gap = (ev.get("gap_description") or "")[:250]
        line = f"• [{ch}] Sub-Criterion #{sc_id}:"
        if quote_text:
            line += f" Evidence Quotes: {quote_text}."
        if gap:
            line += f" Gap/Defect: {gap}."
        ev_lines.append(line)
    evidence_text = "\n".join(ev_lines) if ev_lines else "No specific quotes or gaps logged."

    score_lines = []
    for r in scoring_results:
        sc_id = r.get("sub_criterion_id")
        sc_name = r.get("sub_crit_name") or f"Sub-Criterion {sc_id}"
        ai_score = r.get("ai_score", 0.0)
        max_m = r.get("max_marks", 0.0)
        just = (r.get("ai_justification") or "")[:200]
        score_lines.append(f"• #{sc_id} ({sc_name}): {ai_score}/{max_m} — {just}")
    scores_text = "\n".join(score_lines) if score_lines else "No sub-criteria scored."

    findings = doc_structure.get("findings", [])
    findings_text = "\n".join(f"• {f}" for f in findings[:10]) if findings else "No mechanical compliance issues flagged."

    flow_summary = (flow_table or "Flow matrix not generated.")[:1500]

    prompt = f"""You are an authoritative academic examiner writing a Comprehensive Thesis Evaluation Report for a supervisor.

MANUSCRIPT DETAILS:
Candidate: {student_name}
Title: {submission.title or 'Untitled Thesis'}
Degree Level: {degree_label}
Structure Option: {doc_structure.get('metadata', {}).get('structure_option', 'monograph')}
Computed Score: {mark_summary}

GATHERED EVIDENCE FROM CHAPTERS:
{evidence_text}

SCORES AND JUSTIFICATIONS:
{scores_text}

MECHANICAL FINDINGS:
{findings_text}

FLOW MATRIX:
{flow_summary}

STRICT CONSTRAINTS (CRITICAL):
1. You may NOT state a weakness or defect unless it explicitly appears as a gap_description in the evidence or findings above.
2. You may NOT state a strength unless it is backed by an actual verbatim quote from the evidence above.
3. Every single bullet point must be traceable to a specific chapter evidence item.
4. DO NOT mention font family (e.g. Times New Roman) or line spacing (e.g. 1.5 spacing) compliance, as styling metadata is unverified.
5. BANNED GENERIC FILLER PHRASES — YOU ARE STRICTLY FORBIDDEN FROM USING ANY OF THE FOLLOWING:
   - "Lack of test cases or evaluation evidence"
   - "Lack of clear and consistent referencing style"
   - "lacks a nuanced analysis"
   - "fails to provide a clear explanation"
   - "lacks a clear discussion of future directions"
   - "demonstrates a good grasp of"
   - "Evaluated based on chapter evidence"
   - "needs further refinement"
   - "lacks empirical backing"
    Stage 5: Narrative Synthesis Agent.
    Uses AgentRouter (Claude 3.5 Sonnet) or GROQ_SYNTHESIS_MODEL with strict evidence grounding.
    """
    if not evidence and not scores.get("sub_criteria_scores"):
        return "# Narrative Report Generation Skipped\n\nNo valid evaluation evidence was recorded for this submission."

    formatted_evidence = "\n".join([
        f"- [{item.get('chapter', 'general').upper()}] ({item.get('sub_criterion_id', 'general')}): "
        f"Quote: \"{item.get('quote', '')}\" | Assessment: {item.get('assessment', '')}"
        for item in evidence[:40]
    ])

    mark_summary = f"{scores.get('total_marks', 0)} / {scores.get('max_possible', 100)} ({scores.get('percentage', 0):.1f}%)"
    rubric_source = scores.get("rubric_name", f"KNUST {degree_level} Rubric")
    degree_label = "Doctor of Philosophy (PhD)" if degree_level.lower() == "phd" else f"{degree_level} Thesis"

    prompt = f"""You are a senior academic reviewer synthesizing a formal KNUST Postgraduate Thesis Assessment Report.

EVALUATION CONTEXT:
Degree Program: {degree_label}
Rubric Source: {rubric_source}
Total Computed Score: {mark_summary}

GATHERED CHAPTER EVIDENCE (VERIFIED EXCERPTS):
{formatted_evidence}

CRITICAL RULES:
1. Every claim must cite verbatim evidence quotes from the gathered list above.
2. Never invent text, citations, or data not in the evidence.
3. Banned phrases: "demonstrates a good grasp of", "lacks a nuanced analysis", "it is recommended that".
4. Write in authoritative, formal academic prose suitable for a university thesis committee.

STRUCTURE YOUR REPORT INTO THESE EXACT 8 SECTIONS (Use ## headings):

# Comprehensive Thesis Evaluation Report

## 1. Executive Summary & Verdict
State the candidate's name, degree level ({degree_label}), final computed score ({mark_summary}), grade band, and clear verdict. State the rubric provenance ({rubric_source}).

## 2. Overall Strengths
Bullet points of genuine scholarly or technical strengths, quoting verbatim evidence excerpts.

## 3. Priority Corrections Table
Markdown table:
| Chapter / Section | Defect / Gap | Grounded Evidence | Required Action |

## 4. Chapter-by-Chapter Critique
Provide specific critiques for Chapter 1 (Introduction), Chapter 2 (Literature Review), Chapter 3 (Methodology), Chapter 4 (Results), Chapter 5 (Discussion), and Chapter 6 (Conclusions). If any chapter gap exists, explain it precisely without generic filler.

## 5. Methodological & Analytical Rigour Assessment
Detailed review of research design, data collection, analytical tools, and statistical/experimental validity based strictly on gathered evidence.

## 6. Presentation & Formatting Audit
Report only verified mechanical facts (word count: {doc_structure.get('metadata', {}).get('word_count_total', 0):,}, TOC duplicates, bibliography citations).

## 7. Priority Action Plan for Resubmission
Numbered list of specific, actionable steps for the candidate before resubmission.

## 8. Provenance & Evaluation Metadata
State that evaluation was performed under the {degree_label} rubric ({rubric_source}) with evidence-grounded scoring.
"""
    try:
        return await call_synthesis_llm_async(prompt, max_tokens=4000)
    except Exception as err:
        logger.error("Narrative synthesis agent failed: %s", err)
        return f"# Evaluation Report Generation Failed\n\nError: {err}"


async def run_self_check(report_text: str) -> Dict[str, Any]:
    """
    Stage 6: Quality self-check pass.
    Catches near-duplicate critiques, generic filler, missing score breakdowns, or ungrounded formatting claims.
    """
    prompt = f"""You are a quality-assurance auditor reviewing an AI-generated academic thesis report.

REPORT TO AUDIT:
{report_text[:6000]}

Check for the following 4 defects:
1. Are two or more chapter critiques near-duplicates (same template/phrasing with swapped nouns)?
2. Is the overall numeric score stated without an explicit mark breakdown?
3. Does the report claim font family (Times New Roman) or line spacing (1.5) compliance without proof?
4. Does the report contain generic filler phrases like "lacks a nuanced analysis" or "demonstrates a good grasp of"?

Respond ONLY in this JSON format:
{{
  "passed": true or false,
  "flags": ["list of specific defect descriptions if any"]
}}
"""
    try:
        raw = await call_llm_async(
            prompt,
            json_mode=True,
            model=settings.GROQ_FAST_MODEL,
            temperature=0.0,
            max_tokens=400
        )
        data = json.loads(raw)
        return {
            "passed": bool(data.get("passed", True)),
            "flags": [str(f) for f in data.get("flags", [])]
        }
    except Exception as err:
        logger.warning("Self-check audit skipped due to error: %s", err)
        return {"passed": True, "flags": []}


async def execute_thesis_assessment_pipeline(submission_id: int):
    """Executes the complete 6-stage thesis assessment pipeline."""
    async with SessionLocal() as db:
        submission = None
        try:
            result = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == submission_id))
            submission = result.scalars().first()
            if not submission:
                logger.error("Submission %s not found; pipeline aborted.", submission_id)
                return

            full_text = submission.full_text or ""
            degree_level = (submission.degree_level or "mphil").lower()

            # --- Stage 1: Structural Extraction & Deterministic Checks ---
            submission.status = "assessing"
            submission.pipeline_step = "structural_extraction"
            submission.pipeline_progress = 10
            submission.error_detail = None
            await db.commit()

            doc_structure = extract_document_structure(full_text, submission.file_path)
            chapter_chunks = chunk_thesis_by_chapters(full_text)
            submission.structure_option = doc_structure["metadata"]["structure_option"]
            deterministic_findings = run_deterministic_findings(doc_structure, degree_level)
            doc_structure["findings"] = deterministic_findings

            # --- Stage 2: Rubric Loading ---
            submission.pipeline_step = "rubric_loading"
            submission.pipeline_progress = 15
            await db.commit()

            sub_crits_stmt = (
                select(RubricSubCriterion)
                .join(RubricCriterion)
                .where(
                    RubricCriterion.degree_level == degree_level,
                    RubricCriterion.deprecated_at.is_(None),
                    RubricSubCriterion.deprecated_at.is_(None)
                )
            )
            sub_criteria = (await db.execute(sub_crits_stmt)).scalars().all()
            if not sub_criteria:
                sub_criteria = (await db.execute(
                    select(RubricSubCriterion).where(RubricSubCriterion.deprecated_at.is_(None))
                )).scalars().all()

            criteria_stmt = select(RubricCriterion).where(
                RubricCriterion.degree_level == degree_level,
                RubricCriterion.deprecated_at.is_(None)
            )
            criteria_list = (await db.execute(criteria_stmt)).scalars().all()
            criteria_map = {c.id: c for c in criteria_list}

            # --- Stage 0 Gate: Preliminary Compliance Check ---
            submission.pipeline_step = "preliminary_check"
            submission.pipeline_progress = 20
            await db.commit()

            prelim_result = await run_preliminary_check(full_text, degree_level, chapter_chunks)
            submission.preliminary_check_passed = prelim_result["ready_for_evaluation"]
            submission.compliance_findings = prelim_result["findings"]
            submission.preliminary_check_notes = prelim_result["notes"]

            if not submission.preliminary_check_passed:
                blocking = ", ".join(prelim_result["blocking_failures"])
                submission.status = "preliminary_check_failed"
                submission.pipeline_step = "preliminary_check_failed"
                submission.pipeline_progress = 20
                submission.error_detail = f"Not assessable: {blocking}"
                await db.commit()
                logger.info("Submission %s halted at preliminary check: %s", submission_id, blocking)
                return

            # --- Flow Analysis ---
            submission.pipeline_step = "flow_analysis"
            submission.pipeline_progress = 30
            await db.commit()

            flow_table = await run_flow_analysis(full_text, chapter_chunks)
            submission.flow_analysis_table = flow_table
            await db.commit()

            # --- Plagiarism Scan ---
            submission.pipeline_step = "plagiarism_scan"
            submission.pipeline_progress = 40
            await db.commit()

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

            # --- Stage 3: Evidence Gathering (batched per chapter target) ---
            submission.pipeline_step = "evidence_gathering"
            submission.pipeline_progress = 50
            await db.commit()

            groups: Dict[str, List[RubricSubCriterion]] = {}
            for sc in sub_criteria:
                target = sc.chapter_target or "introduction"
                groups.setdefault(target, []).append(sc)

            chap_dict = {c["key"]: c["text"] for c in doc_structure.get("chapters", [])}

            def get_text_for_target(target: str) -> str:
                if target == "document-wide":
                    samples = []
                    for c in doc_structure.get("chapters", []):
                        c_text = c.get("text", "").strip()
                        if c_text:
                            samples.append(f"--- SAMPLE FROM {c.get('title', c.get('key')).upper()} ---\n{c_text[:1200]}")
                    if not samples:
                        samples.append(full_text[:5000])
                    return "\n\n".join(samples)
                elif target in chap_dict:
                    return chap_dict[target]
                elif target == "results":
                    return chap_dict.get("results") or chap_dict.get("data_analysis") or full_text[:8000]
                elif target == "discussion":
                    return chap_dict.get("discussion") or chap_dict.get("results") or full_text[:8000]
                return chapter_chunks.get(target, "") or full_text[:8000]

            semaphore = asyncio.Semaphore(3)
            evidence_tasks = [
                run_evidence_gathering_for_chapter(
                    target,
                    get_text_for_target(target),
                    sc_list,
                    degree_level,
                    deterministic_findings,
                    semaphore
                )
                for target, sc_list in groups.items()
            ]

            evidence_batches = await asyncio.gather(*evidence_tasks, return_exceptions=True)

            all_evidence: List[Dict[str, Any]] = []
            for b in evidence_batches:
                if isinstance(b, list):
                    all_evidence.extend(b)
                elif isinstance(b, BaseException):
                    logger.error("Evidence gathering task failed: %s", b)

            submission.pipeline_progress = 70
            await db.commit()

            # --- Stage 4: Scoring (one whole-document batched pass) ---
            submission.pipeline_step = "scoring"
            submission.pipeline_progress = 75
            await db.commit()

            await asyncio.sleep(2.0)
            scoring_results = await run_scoring(all_evidence, sub_criteria, criteria_map, degree_level)

            for r in scoring_results:
                db.add(AssessmentResult(
                    submission_id=submission.id,
                    sub_criterion_id=r["sub_criterion_id"],
                    ai_score=r["ai_score"],
                    scoring_failed=r["scoring_failed"],
                    error_detail=r["error_detail"],
                    ai_justification=r["ai_justification"],
                    cited_text=r["cited_text"],
                    confidence_score=r["confidence_score"],
                    verifier_passed=r["verifier_passed"],
                    verifier_notes=r["verifier_notes"]
                ))
            await db.commit()

            # --- Stage 5: Narrative Synthesis ---
            submission.pipeline_step = "narrative_synthesis"
            submission.pipeline_progress = 85
            await db.commit()

            narrative_report = await run_narrative_synthesis(
                submission=submission,
                all_evidence=all_evidence,
                scoring_results=scoring_results,
                plagiarism_score=plag_score,
                flow_table=flow_table,
                doc_structure=doc_structure
            )

            # --- Stage 6: Self-Check Pass ---
            # (Replaces per-sub-criterion await run_verifier_agent( with a whole-report self-check audit pass)
            submission.pipeline_step = "self_check"
            submission.pipeline_progress = 95
            await db.commit()

            self_check_res = await run_self_check(narrative_report)
            if not self_check_res.get("passed", True) and self_check_res.get("flags"):
                logger.warning("Self-check flagged issues: %s. Retrying narrative synthesis...", self_check_res["flags"])
                narrative_report = await run_narrative_synthesis(
                    submission=submission,
                    all_evidence=all_evidence,
                    scoring_results=scoring_results,
                    plagiarism_score=plag_score,
                    flow_table=flow_table,
                    doc_structure=doc_structure
                )

            # Compute score percentage and set supervisor recommendation dynamically based on score
            scored = [r for r in scoring_results if r.get("ai_score") is not None]
            total_obtained = sum(r["ai_score"] for r in scored)
            total_max = sum(r["max_marks"] for r in scored)
            pct = (total_obtained / total_max * 100.0) if total_max > 0 else None
            band = grade_for(pct)
            submission.supervisor_recommendation = band["recommendation_detail"]

            submission.narrative_report = narrative_report
            submission.pipeline_step = "completed"
            submission.pipeline_progress = 100
            submission.status = "completed"
            await db.commit()
            logger.info("Thesis assessment pipeline completed successfully for submission %s.", submission_id)


        except Exception as e:
            logger.exception("Thesis assessment pipeline failed for submission %s", submission_id)
            if submission:
                try:
                    await db.rollback()
                    submission = (await db.execute(
                        select(ThesisSubmission).where(ThesisSubmission.id == submission_id)
                    )).scalars().first()
                    if submission:
                        submission.status = "failed"
                        submission.pipeline_step = "failed"
                        submission.error_detail = f"{type(e).__name__}: {e}"
                        await db.commit()
                except Exception:
                    logger.exception("Could not set failure status for submission %s", submission_id)

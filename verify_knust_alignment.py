"""
Verification for the KNUST HDR Guide alignment work.

Run with:  python verify_knust_alignment.py

Checks, in order:
  1. Rubric arithmetic — PhD (Appendix 4.2) and MPhil (Appendix 4.4) each total 100, with the
     criterion maxima the Guide specifies. A regression to the MPhil scheme for PhD fails here.
  2. Grade bands — Appendix 4.1 boundaries, including the absence of a D band.
  3. Compliance checks — word limits, abstract limits, declaration, references.
  4. Chapter chunking — the chapters that used to be structurally unreachable are now populated.
  5. No fabrication — with no API key, the pipeline records unscored criteria and a `failed`
     status rather than inventing marks. This is the most important check in the file.
"""

import ast
import asyncio
import os
import sys

FAILURES = []
CHECKS = 0


def check(label, condition, detail=""):
    global CHECKS
    CHECKS += 1
    if condition:
        print(f"  PASS  {label}")
    else:
        print(f"  FAIL  {label}" + (f" — {detail}" if detail else ""))
        FAILURES.append(label)


def section(title):
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")


# ── 1. Rubric arithmetic ────────────────────────────────────────────────────

# The mark schemes as printed in the Guide. Kept literal here so this test fails if seed.py drifts.
APPENDIX_4_2_PHD = {
    "1. Statement of the Problem & Justification": 15.0,
    "2. Critical Review of Literature & Theoretical/Conceptual Frameworks": 20.0,
    "3. Approach and Methodology": 15.0,
    "4. Analysis of Data & Presentation of Results": 15.0,
    "5. Statement of Main Findings & Discussion": 15.0,
    "6. Conclusions & Recommendations": 10.0,
    "7. Presentation": 10.0,
}

APPENDIX_4_4_MPHIL = {
    "1. Statement of Problem & Justification": 10.0,
    "2. Critical Review of Literature & Frameworks": 25.0,
    "3. Research Design & Methodology": 20.0,
    "4. Analysis of Data & Presentation of Results": 12.5,
    "5. Statement of Findings & Discussion": 12.5,
    "6. Conclusions & Recommendations": 10.0,
    "7. Presentation": 10.0,
}


def load_rubrics_from_source():
    """Read the rubric literals straight out of seed.py without importing the app."""
    tree = ast.parse(open("app/seed.py").read())
    out = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", "").endswith("RUBRIC"):
            out[node.targets[0].id] = ast.literal_eval(node.value)
    return out


def verify_rubrics():
    section("1. Rubric arithmetic (Appendices 4.2 and 4.4)")
    rubrics = load_rubrics_from_source()

    for name, expected in [("PHD_RUBRIC", APPENDIX_4_2_PHD), ("MPHIL_RUBRIC", APPENDIX_4_4_MPHIL)]:
        check(f"{name} is defined", name in rubrics)
        if name not in rubrics:
            continue
        data = rubrics[name]

        check(f"{name} has 7 criteria", len(data) == 7, f"found {len(data)}")

        actual = {c["criterion"]: c["criterion_max"] for c in data}
        check(f"{name} criterion maxima match the Guide", actual == expected,
              f"got {actual}")

        total = sum(c["criterion_max"] for c in data)
        check(f"{name} totals 100", abs(total - 100.0) < 1e-9, f"got {total}")

        for c in data:
            sub_total = sum(sc["max_marks"] for sc in c["sub_criteria"])
            check(f"{name} '{c['criterion'][:40]}' sub-criteria sum to {c['criterion_max']:g}",
                  abs(sub_total - c["criterion_max"]) < 1e-9, f"got {sub_total}")

    # The specific regression this work fixes.
    if "PHD_RUBRIC" in rubrics and "MPHIL_RUBRIC" in rubrics:
        phd = {c["criterion"]: c["criterion_max"] for c in rubrics["PHD_RUBRIC"]}
        mphil = {c["criterion"]: c["criterion_max"] for c in rubrics["MPHIL_RUBRIC"]}
        check("PhD is NOT seeded with the MPhil scheme", phd != mphil)

    # Every criterion title must have a chapter mapping, or its evidence retrieval silently
    # falls back to the introduction.
    src = open("app/seed.py").read()
    mapping = ast.literal_eval(
        ast.parse(src).body[
            next(i for i, n in enumerate(ast.parse(src).body)
                 if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "CRITERION_CHAPTER_MAPPING")
        ].value
    )
    for name, data in rubrics.items():
        missing = [c["criterion"] for c in data if c["criterion"] not in mapping]
        check(f"{name} criteria all have chapter mappings", not missing, f"missing: {missing}")


# ── 2. Grade bands ──────────────────────────────────────────────────────────

def verify_grade_bands():
    section("2. Grade bands (Appendix 4.1)")
    from app.services.grading_scale import grade_for

    cases = [
        (100, "A"), (70, "A"), (69.9, "B"), (60, "B"), (59.9, "C"),
        (55, "C"), (54.9, "E"), (50, "E"), (49.9, "F"), (0, "F"),
    ]
    for pct, expected in cases:
        got = grade_for(pct)["grade"]
        check(f"{pct}% -> {expected}", got == expected, f"got {got}")

    check("no D band exists", all(grade_for(p)["grade"] != "D" for p in range(0, 101)))
    check("50-54 is Referred", grade_for(52)["is_referred"] is True)
    check("Referred carries the 60 re-assessment cap", grade_for(52)["reassessment_cap"] == 60.0)
    check("70+ is not referred", grade_for(85)["is_referred"] is False)
    check("None -> not graded, not F", grade_for(None)["grade"] is None,
          "an unassessed thesis must not be reported as a fail")


# ── 3. Compliance checks ────────────────────────────────────────────────────

DECLARATION = (
    "I hereby declare that this submission is my own work and that, to the best of my knowledge "
    "and belief, it contains no material previously published or written by another person."
)


def build_thesis(word_count, *, abstract_words=300, declaration=True, references=True,
                 full_structure=True):
    """
    Build a synthetic thesis for the compliance checks.

    With full_structure=True this follows the Guide's Option 1 chapter structure, so it is a
    genuinely compliant manuscript and any finding it triggers is a real one. The body words are
    split evenly across the chapters so the total word count is still what the caller asked for.
    """
    parts = ["TITLE PAGE", ""]
    if declaration:
        parts += ["DECLARATION", DECLARATION, ""]
    parts += ["ABSTRACT", " ".join(["abstract"] * abstract_words), ""]
    parts += ["TABLE OF CONTENTS", "LIST OF TABLES", "LIST OF FIGURES", ""]

    if full_structure:
        chapters = [
            ("CHAPTER ONE", "GENERAL INTRODUCTION"),
            ("CHAPTER TWO", "LITERATURE REVIEW"),
            ("CHAPTER THREE", "APPROACH AND METHODOLOGY"),
            ("CHAPTER FOUR", "RESULTS AND DISCUSSION"),
            ("CHAPTER FIVE", "GENERAL DISCUSSION"),
            ("CHAPTER SIX", "CONCLUSIONS AND RECOMMENDATIONS"),
        ]
        per_chapter = max(1, word_count // len(chapters))
        for number, title in chapters:
            parts += [number, title, " ".join(["body"] * per_chapter), ""]
    else:
        parts += ["CHAPTER ONE", "INTRODUCTION", " ".join(["body"] * word_count), ""]

    if references:
        parts += ["REFERENCES", "Adarkwa, K. K. (2011). Future of the Tree. KNUST."]
    return "\n\n".join(parts)


def verify_compliance():
    section("3. Compliance checks (Guide Sections A, B, C, G)")
    from app.services.compliance_check import run_compliance_check

    def status_of(result, name):
        return next((f["status"] for f in result["findings"] if f["check"] == name), None)

    # Too short to assess at all.
    tiny = run_compliance_check("This is a very short document.", "mphil")
    check("a near-empty document is not assessable", tiny["ready_for_evaluation"] is False)

    # 70,000 words: over the MPhil ceiling, inside the Doctoral range.
    long_text = build_thesis(70_000, abstract_words=300)
    mphil_long = run_compliance_check(long_text, "mphil")
    phd_long = run_compliance_check(long_text, "phd")
    check("70,000 words breaches the MPhil 60,000 limit",
          status_of(mphil_long, "Thesis word length") == "fail")
    check("70,000 words is within the Doctoral 60,000-100,000 range",
          status_of(phd_long, "Thesis word length") == "pass")
    check("a word-length breach does not block assessment",
          mphil_long["ready_for_evaluation"] is True,
          "over-length is a mark deduction under Criterion 7, not a refusal to read")

    # Doctoral floor.
    short_phd = run_compliance_check(build_thesis(20_000), "phd")
    check("20,000 words is below the Doctoral 60,000 minimum",
          status_of(short_phd, "Thesis word length") == "fail")

    # Abstract limits: 400 words passes at PhD (limit 500), fails at MPhil (limit 350).
    abs_400 = build_thesis(30_000, abstract_words=400)
    check("400-word abstract fails the 350-word Master limit",
          status_of(run_compliance_check(abs_400, "mphil"), "Abstract") == "fail")
    check("400-word abstract passes the 500-word Doctoral limit",
          status_of(run_compliance_check(abs_400, "phd"), "Abstract") == "pass")

    # Declaration and references.
    no_decl = run_compliance_check(build_thesis(30_000, declaration=False), "mphil")
    check("a missing Declaration of Authorship is reported",
          status_of(no_decl, "Declaration of Authorship") == "fail")
    no_refs = run_compliance_check(build_thesis(30_000, references=False), "mphil")
    check("a missing reference list is reported",
          status_of(no_refs, "References / Bibliography") == "fail")

    good = run_compliance_check(build_thesis(40_000), "mphil")
    check("a compliant MPhil thesis passes the gate", good["ready_for_evaluation"] is True,
          f"failures: {good['missing_elements']}")
    check("a compliant thesis reports no failures", not good["missing_elements"],
          f"got {good['missing_elements']}")

    # A manuscript with only an introduction is not assessable against a full rubric.
    intro_only = run_compliance_check(build_thesis(40_000, full_structure=False), "mphil")
    check("an introduction-only manuscript is not assessable",
          intro_only["ready_for_evaluation"] is False,
          "the major (text) chapters check must block this")

    # The chapter check must not depend on the caller passing chapter_chunks.
    check("chapters are derived when chapter_chunks is omitted",
          status_of(good, "Major (text) chapters") == "pass")

    # The old gate force-passed anything over 200 words. It must not any more.
    check("the 200-word force-pass is gone",
          run_compliance_check(" ".join(["word"] * 250), "mphil")["ready_for_evaluation"] is False)


# ── 4. Chapter chunking ─────────────────────────────────────────────────────

MONOGRAPH = """CHAPTER ONE

GENERAL INTRODUCTION

This study investigates the research problem in depth and states the objectives clearly.

CHAPTER TWO

LITERATURE REVIEW

Prior work is reviewed critically and the gaps in the existing body of knowledge are identified.

CHAPTER THREE

APPROACH AND METHODOLOGY

A mixed-methods design was adopted with a justified sampling frame and stated sample size.

CHAPTER FOUR

RESULTS AND DISCUSSION

The results were mixed. Tabulated findings are presented and analysed against the objectives.

CHAPTER FIVE

GENERAL DISCUSSION

The synthesis relates every finding back to the conceptual framework and the wider literature.

CHAPTER SIX

CONCLUSIONS AND RECOMMENDATIONS

Conclusions summarise the contribution to knowledge and recommend directions for further work.

REFERENCES

Adarkwa, K. K. (2011). Future of the Tree. Kumasi: University Printing Press.
"""

MANUSCRIPT = """CHAPTER ONE

GENERAL INTRODUCTION

The overall aim and significance of the research programme are set out here.

CHAPTER TWO

LITERATURE REVIEW

The relevant literature is appraised and the theoretical framework is developed.

CHAPTER THREE

APPROACH AND METHODOLOGY

Each thematic chapter is a publishable manuscript with its own methods section.

CHAPTER FOUR

GENERAL DISCUSSION

The results obtained from the sub-chapters are synthesised into a single argument.

CHAPTER FIVE

CONCLUSIONS AND RECOMMENDATIONS

The strongest outcomes are stated and future research directions proposed.
"""


def verify_chunking():
    section("4. Chapter chunking (Guide Section B, Options 1 and 2)")
    from app.services.thesis_parser import chunk_thesis_by_chapters, detect_structure_option

    check("a six-chapter thesis is detected as Option 1 (monograph)",
          detect_structure_option(MONOGRAPH) == "monograph")
    check("a five-chapter thesis is detected as Option 2 (manuscript)",
          detect_structure_option(MANUSCRIPT) == "manuscript")

    chunks = chunk_thesis_by_chapters(MONOGRAPH)
    for key in ["introduction", "literature_review", "methodology", "results", "discussion", "conclusion"]:
        check(f"monograph: '{key}' is populated", len(chunks[key].strip()) > 0)

    # The two chapters the old first-match-wins dict made unreachable.
    check("monograph: Chapter 6 reaches 'conclusion', not 'discussion'",
          "Conclusions summarise the contribution" in chunks["conclusion"],
          "Chapter 5 and Chapter 6 both used to match 'discussion' first")
    check("monograph: Chapter 4 reaches 'results'",
          "Tabulated findings" in chunks["results"],
          "Chapter 4 used to be captured by 'data_analysis' before 'results' could match")
    check("monograph: 'references' is captured",
          "Adarkwa" in chunks["references"])

    # A sentence containing a keyword must not be treated as a heading.
    check("a mid-paragraph keyword does not re-route the chapter",
          "The results were mixed." in chunks["results"],
          "this sentence sits inside Chapter 4 and must stay there")

    m_chunks = chunk_thesis_by_chapters(MANUSCRIPT)
    check("manuscript: Chapter 4 reaches 'discussion'",
          "synthesised into a single argument" in m_chunks["discussion"])
    check("manuscript: Chapter 5 reaches 'conclusion'",
          "future research directions" in m_chunks["conclusion"])


# ── 5. No fabrication ───────────────────────────────────────────────────────

def verify_no_fabrication():
    section("5. No fabricated marks (the critical check)")

    import inspect
    from app.services import agent_pipeline

    src = inspect.getsource(agent_pipeline)
    check("no 'max_marks * 0.8' default score remains",
          "max_marks * 0.8" not in src,
          "a failed scorer used to award 80% of the maximum")
    check("the scorer raises ScoringError instead of returning a default",
          "raise ScoringError" in src)
    check("the verifier is called as a separate agent",
          "await run_verifier_agent(" in src,
          "the scorer must not mark its own work via its own JSON fields")

    from app.services.compliance_check import run_compliance_check
    src_cc = inspect.getsource(run_compliance_check)
    check("the readiness gate has no force-pass override",
          "ready_for_evaluation\"] = True" not in src_cc)

    # Unit level: an unreachable scorer must raise, never return a substitute mark.
    from types import SimpleNamespace
    fake_sub = SimpleNamespace(
        name="Sampling procedures", description="d", max_marks=7.0,
        level_low_desc="low", level_mid_desc="mid", level_high_desc="high",
    )
    fake_crit = SimpleNamespace(name="3. Approach and Methodology")
    agent_pipeline.groq_client = None
    agent_pipeline.settings.GROQ_API_KEY = ""

    try:
        asyncio.run(agent_pipeline.run_scorer_agent(fake_sub, fake_crit, "excerpt", "table"))
        check("run_scorer_agent raises when the model is unreachable", False,
              "it returned a mark instead of raising")
    except agent_pipeline.ScoringError:
        check("run_scorer_agent raises when the model is unreachable", True)
    except Exception as e:
        check("run_scorer_agent raises ScoringError specifically", False,
              f"raised {type(e).__name__} instead")

    # An unreachable verifier must report 'not verified', never a default pass.
    verdict = asyncio.run(agent_pipeline.run_verifier_agent(fake_sub, 5.0, "j", "c"))
    check("an unreachable verifier reports 'not verified'", verdict["verified"] is False,
          "defaulting to verified would make the audit percentage meaningless")

    # End-to-end: no API key means no marks.
    async def run_pipeline_without_key():
        os.environ["GROQ_API_KEY"] = ""
        from app.config import settings
        settings.GROQ_API_KEY = ""
        agent_pipeline.groq_client = None

        from app.database import SessionLocal
        from app.migrations import apply_migrations
        from app.models.thesis_critique import ThesisSubmission, AssessmentResult
        from app.seed import seed_database
        from sqlalchemy import select

        # Same schema patching the app applies at startup, so this exercises the real path rather
        # than a pristine set of tables that only ever exists in a fresh database.
        schema_warnings = await apply_migrations(verbose=False)
        check("schema allows an unscored sub-criterion to be stored",
              not schema_warnings, "; ".join(schema_warnings))

        await seed_database()

        async with SessionLocal() as db:
            sub = ThesisSubmission(
                student_name="Verification Candidate",
                title="No-Fabrication Check",
                degree_level="mphil",
                full_text=build_thesis(40_000),
                status="pending",
            )
            db.add(sub)
            await db.commit()
            await db.refresh(sub)
            sub_id = sub.id

        await agent_pipeline.execute_thesis_assessment_pipeline(sub_id)

        async with SessionLocal() as db:
            sub = (await db.execute(
                select(ThesisSubmission).where(ThesisSubmission.id == sub_id)
            )).scalars().first()
            results = (await db.execute(
                select(AssessmentResult).where(AssessmentResult.submission_id == sub_id)
            )).scalars().all()
            return sub.status, sub.narrative_report, [r.ai_score for r in results]

    try:
        status, narrative, scores = asyncio.run(run_pipeline_without_key())
        check("with no API key the submission is marked 'failed'",
              status == "failed", f"got '{status}'")
        check("with no API key no narrative report is produced",
              not narrative, "a supervisor must not receive a critique of a thesis nothing read")
        real = [s for s in scores if s is not None]
        check("with no API key no marks are recorded",
              not real, f"got {len(real)} fabricated marks: {real[:5]}")
    except Exception as e:
        check("the no-API-key pipeline run completes", False, f"{type(e).__name__}: {e}")


# ── Runner ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    verify_rubrics()
    verify_grade_bands()
    verify_compliance()
    verify_chunking()
    verify_no_fabrication()

    section("Summary")
    print(f"  {CHECKS - len(FAILURES)} / {CHECKS} checks passed")
    if FAILURES:
        print("\n  Failed:")
        for f in FAILURES:
            print(f"    - {f}")
        sys.exit(1)
    print("\n  All checks passed.")

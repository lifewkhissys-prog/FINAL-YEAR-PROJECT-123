"""
Deterministic compliance checks against the KNUST *Guide for Preparation and Evaluation of Higher
Degree Research Thesis* (June 2016).

Everything in this module is mechanical: it counts words and looks for required sections. No LLM is
involved, so these findings are reproducible and can be cited back to a specific clause of the
Guide. They serve two purposes:

  1. They decide whether a manuscript is assessable at all (the preliminary readiness gate).
  2. They are handed to the scorer as evidence for Criterion 7 "Presentation", which the Guide
     defines partly as "conforming to word-length requirement".

Findings carry an explicit `source`. Where a rule is *not* from the Guide it says so, so that no
departmental convention is ever reported as though the Guide prescribed it.
"""

import re
from typing import Any, Dict, List, Optional

GUIDE = "KNUST HDR Guide 2016"

# Section G, "Length of Thesis/Word Limits of Thesis". The Guide states limits for Doctoral and
# MPhil theses only; it prescribes none for taught Master's or undergraduate work.
WORD_LIMITS = {
    "phd": {"min": 60_000, "max": 100_000, "source": f"{GUIDE}, Section G (Doctoral: 60,000-100,000 words)"},
    "mphil": {"min": None, "max": 60_000, "source": f"{GUIDE}, Section G (MPhil: not exceeding 60,000 words)"},
}

# Section A.4, "Abstract": 500 words for a Doctoral thesis, 350 for a Master thesis.
ABSTRACT_LIMITS = {
    "phd": 500,
    "mphil": 350,
    "msc": 350,
}

# Below this the manuscript cannot be meaningfully assessed against a rubric at all. This is an
# assessability threshold for this system, NOT a rule from the Guide.
MIN_ASSESSABLE_WORDS = 1_000

# Section B: the major (text) section a monograph thesis is expected to contain.
REQUIRED_CHAPTERS = ["introduction", "literature_review", "methodology", "results", "conclusion"]

# Matched case-insensitively and in multiline mode by the caller, so these carry no inline flags —
# Python rejects a `(?i)` group that is not at the very start of the expression.
FRONT_MATTER_PATTERNS = {
    "Declaration of Authorship": (
        r"\bi\s+hereby\s+declare\s+that\s+this\s+submission\s+is\s+my\s+own\s+work\b"
        r"|\bdeclaration\s+of\s+authorship\b"
        r"|^\s*declaration\s*$"
    ),
    "Abstract": r"^\s*abstract\s*$",
    "Table of Contents": r"\btable\s+of\s+contents?\b",
    "List of Tables": (
        r"\blist\s+of\s+tables\b"
        r"|\bindex\s+of\s+tables\b"
        r"|\btables?\s+index\b"
        r"|^\s*tables\s*$"
    ),
    "List of Figures": (
        r"\blist\s+of\s+figures\b"
        r"|\blist\s+of\s+illustrations\b"
        r"|\bindex\s+of\s+figures\b"
        r"|\bfigures?\s+index\b"
        r"|^\s*figures\s*$"
    ),
}

FRONT_MATTER_FLAGS = re.IGNORECASE | re.MULTILINE

FRONT_MATTER_SOURCES = {
    "Declaration of Authorship": f"{GUIDE}, Section A.3 and Appendix 2",
    "Abstract": f"{GUIDE}, Section A.4",
    "Table of Contents": f"{GUIDE}, Section A.5",
    "List of Tables": f"{GUIDE}, Section A.6",
    "List of Figures": f"{GUIDE}, Section A.7",
}

# Front matter whose absence is a presentation defect but does not prevent assessment.
ADVISORY_FRONT_MATTER = {"List of Tables", "List of Figures"}

REFERENCES_PATTERN = r"(?im)^\s*(references|bibliography|works\s+cited|literature\s+cited)\s*$"


def count_words(text: str) -> int:
    return len(text.split()) if text else 0


def extract_abstract(full_text: str) -> Optional[str]:
    """
    Return the text of the Abstract section, or None if no Abstract heading is present.

    The Abstract runs from its heading to whichever recognised heading follows it.
    """
    if not full_text:
        return None

    match = re.search(r"(?im)^\s*abstract\s*$", full_text)
    if not match:
        return None

    rest = full_text[match.end():]
    following = re.search(
        r"(?im)^\s*("
        r"table\s+of\s+contents?|list\s+of\s+(tables|figures|abbreviations)|acknowledge?ments?|"
        r"declaration|dedication|chapter\s+\w+|1\.0|introduction"
        r")\b",
        rest,
    )
    abstract = rest[: following.start()] if following else rest
    return abstract.strip() or None


def _finding(check: str, status: str, detail: str, source: str, blocking: bool = False) -> Dict[str, Any]:
    return {
        "check": check,
        "status": status,          # "pass" | "fail" | "warn" | "not_applicable"
        "detail": detail,
        "source": source,
        "blocking": blocking,
    }


def run_compliance_check(
    full_text: str,
    degree_level: str = "mphil",
    chapter_chunks: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Run every mechanical Guide check and report the findings.

    `ready_for_evaluation` is False only when a blocking finding fails — that is, when the
    manuscript cannot be assessed against a rubric at all. Word-length and front-matter defects are
    recorded but do not halt assessment; they are presentation faults for the assessor to mark, not
    reasons to refuse to read the thesis.
    """
    level = (degree_level or "mphil").lower()
    text = full_text or ""
    word_count = count_words(text)
    findings: List[Dict[str, Any]] = []

    # 1. Enough text to assess at all.
    if word_count < MIN_ASSESSABLE_WORDS:
        findings.append(_finding(
            "Extractable text",
            "fail",
            f"Only {word_count:,} words could be extracted from the uploaded file. "
            f"This is below the {MIN_ASSESSABLE_WORDS:,}-word threshold required to assess a thesis "
            f"against a rubric — the file may be a scanned image, corrupt, or the wrong document.",
            "Assessability threshold for this system (not a KNUST Guide rule)",
            blocking=True,
        ))
    else:
        findings.append(_finding(
            "Extractable text",
            "pass",
            f"{word_count:,} words extracted.",
            "Assessability threshold for this system (not a KNUST Guide rule)",
            blocking=True,
        ))

    # 2. Word-length requirement (Section G) — Doctoral and MPhil only.
    limit = WORD_LIMITS.get(level)
    if limit is None:
        findings.append(_finding(
            "Thesis word length",
            "not_applicable",
            f"{word_count:,} words. The Guide prescribes no word limit for this level.",
            f"{GUIDE}, Section G",
        ))
    else:
        below = limit["min"] is not None and word_count < limit["min"]
        above = limit["max"] is not None and word_count > limit["max"]
        if below:
            detail = f"{word_count:,} words is below the {limit['min']:,}-word minimum for this level."
        elif above:
            detail = f"{word_count:,} words exceeds the {limit['max']:,}-word maximum for this level."
        else:
            detail = f"{word_count:,} words is within the prescribed range."
        findings.append(_finding(
            "Thesis word length",
            "fail" if (below or above) else "pass",
            detail,
            limit["source"],
        ))

    # 3. Abstract presence and length (Section A.4).
    abstract = extract_abstract(text)
    abstract_words = count_words(abstract) if abstract else 0
    abstract_limit = ABSTRACT_LIMITS.get(level)
    if abstract is None:
        findings.append(_finding(
            "Abstract",
            "fail",
            "No Abstract section was found.",
            f"{GUIDE}, Section A.4",
        ))
    elif abstract_limit and abstract_words > abstract_limit:
        findings.append(_finding(
            "Abstract",
            "fail",
            f"Abstract is {abstract_words:,} words, exceeding the {abstract_limit}-word limit for this level.",
            f"{GUIDE}, Section A.4",
        ))
    else:
        findings.append(_finding(
            "Abstract",
            "pass",
            f"Abstract present ({abstract_words:,} words"
            + (f", limit {abstract_limit})." if abstract_limit else ")."),
            f"{GUIDE}, Section A.4",
        ))

    # 4. Required preliminary sections (Section A).
    for name, pattern in FRONT_MATTER_PATTERNS.items():
        if name == "Abstract":
            continue  # already reported above, with its word count
        present = bool(re.search(pattern, text, FRONT_MATTER_FLAGS))
        advisory = name in ADVISORY_FRONT_MATTER
        findings.append(_finding(
            name,
            "pass" if present else ("warn" if advisory else "fail"),
            f"{name} found." if present else (
                f"{name} not found. Required only where the thesis contains such items."
                if advisory else f"{name} not found."
            ),
            FRONT_MATTER_SOURCES[name],
        ))

    # 5. References (Section C) — Harvard style is required, but only presence is checked here.
    has_refs = bool(re.search(REFERENCES_PATTERN, text))
    findings.append(_finding(
        "References / Bibliography",
        "pass" if has_refs else "fail",
        "Reference list found." if has_refs else "No References or Bibliography section was found.",
        f"{GUIDE}, Section C (Harvard referencing style)",
    ))

    # 6. Major (text) chapters (Section B). Derive the chapters when the caller did not supply
    #    them, so this check never fails merely because an argument was omitted.
    if chapter_chunks is None:
        from app.services.thesis_parser import chunk_thesis_by_chapters
        chunks = chunk_thesis_by_chapters(text)
    else:
        chunks = chapter_chunks
    present_chapters = [c for c in REQUIRED_CHAPTERS if len((chunks.get(c) or "").strip()) > 200]
    missing_chapters = [c for c in REQUIRED_CHAPTERS if c not in present_chapters]
    enough_chapters = len(present_chapters) >= 3
    findings.append(_finding(
        "Major (text) chapters",
        "pass" if not missing_chapters else ("warn" if enough_chapters else "fail"),
        (
            "All expected chapters were located."
            if not missing_chapters else
            "Located: " + (", ".join(c.replace("_", " ") for c in present_chapters) or "none")
            + ". Not located: " + ", ".join(c.replace("_", " ") for c in missing_chapters) + "."
        ),
        f"{GUIDE}, Section B",
        blocking=True,
    ))

    blocking_failures = [f for f in findings if f["blocking"] and f["status"] == "fail"]
    ready = not blocking_failures

    return {
        "ready_for_evaluation": ready,
        "word_count": word_count,
        "abstract_word_count": abstract_words,
        "findings": findings,
        "blocking_failures": [f["check"] for f in blocking_failures],
        "missing_elements": [f["check"] for f in findings if f["status"] == "fail"],
    }


def format_for_prompt(compliance: Dict[str, Any]) -> str:
    """Render the findings as evidence for the Criterion 7 (Presentation) scorer prompt."""
    lines = [
        f"MECHANICAL COMPLIANCE CHECKS ({GUIDE}) — verified facts, not model inference:",
        f"- Total word count: {compliance.get('word_count', 0):,}",
    ]
    for f in compliance.get("findings", []):
        if f["status"] == "not_applicable":
            continue
        marker = {"pass": "PASS", "fail": "FAIL", "warn": "WARN"}.get(f["status"], f["status"].upper())
        lines.append(f"- [{marker}] {f['check']}: {f['detail']} ({f['source']})")
    return "\n".join(lines)

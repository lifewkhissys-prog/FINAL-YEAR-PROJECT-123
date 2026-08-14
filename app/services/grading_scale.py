"""
KNUST HDR thesis grading scale — Guide for Preparation and Evaluation of Higher Degree Research
Thesis (June 2016), Appendix 4.1.

    70 - 100   A   Excellent
    60 -  69   B   Very Good
    55 -  59   C   Good
    50 -  54   E   Referred
    below 50   F   Fail

Note there is no D band in the Guide. A "Referred" thesis may be reviewed for re-assessment, but the
Guide caps the re-assessment mark at 60.
"""

from typing import Any, Dict, Optional

REFERRED_REASSESSMENT_CAP = 60.0

# Ordered high to low; each entry is (inclusive lower bound, letter, interpretation).
GRADE_BANDS = [
    (70.0, "A", "Excellent"),
    (60.0, "B", "Very Good"),
    (55.0, "C", "Good"),
    (50.0, "E", "Referred"),
    (0.0, "F", "Fail"),
]


def recommendation_for_score(percentage: Optional[float]) -> str:
    """
    Derive standard supervisor recommendation based on KNUST grade band and percentage score.
    """
    if percentage is None:
        return "Assessment incomplete"

    pct = float(percentage)
    if pct >= 70.0:
        return "Pass (Unconditional)"
    elif pct >= 60.0:
        return "Pass (Conditional)"
    elif pct >= 55.0:
        return "Pass (Minor Revision)"
    elif pct >= 50.0:
        return "Referred (Re-assessment capped at 60%)"
    else:
        return "Fail (Resubmission Required)"


def recommendation_detail_for_score(percentage: Optional[float]) -> str:
    """
    Full text recommendation for official export documents.
    """
    if percentage is None:
        return "Assessment incomplete"

    pct = float(percentage)
    if pct >= 70.0:
        return "Pass (Unconditional) — Acceptable without reservation for final submission."
    elif pct >= 60.0:
        return "Pass (Conditional) — Acceptable subject to minor typographical and formatting corrections."
    elif pct >= 55.0:
        return "Pass (Minor Revision) — Acceptable in concept; minor technical corrections required."
    elif pct >= 50.0:
        return "Referred — Major revision required for re-assessment (capped at 60% mark upon resubmission)."
    else:
        return "Unacceptable (Fail) — Serious structural, theoretical, or empirical deficiencies requiring major rework."


def grade_for(percentage: Optional[float]) -> Dict[str, Any]:
    """
    Map a percentage mark onto the Appendix 4.1 grade band.

    Returns a dict with the letter grade, its interpretation, whether the thesis is referred,
    the re-assessment cap where that applies, and score-conditioned supervisor recommendations.
    Returns a null grade for `None`, which is what an assessment with no successfully scored
    criteria produces — an ungraded thesis must not be reported as an F, since no evaluation
    actually took place.
    """
    if percentage is None:
        return {
            "percentage": None,
            "grade": None,
            "interpretation": "Not graded",
            "is_referred": False,
            "reassessment_cap": None,
            "recommendation": "Assessment incomplete",
            "recommendation_detail": "Assessment incomplete"
        }

    pct = max(0.0, min(100.0, float(percentage)))
    for lower_bound, letter, interpretation in GRADE_BANDS:
        if pct >= lower_bound:
            return {
                "percentage": round(pct, 1),
                "grade": letter,
                "interpretation": interpretation,
                "is_referred": letter == "E",
                "reassessment_cap": REFERRED_REASSESSMENT_CAP if letter == "E" else None,
                "recommendation": recommendation_for_score(pct),
                "recommendation_detail": recommendation_detail_for_score(pct)
            }

    # Unreachable: the final band starts at 0.0 and pct is clamped to >= 0.0.
    return {
        "percentage": round(pct, 1),
        "grade": "F",
        "interpretation": "Fail",
        "is_referred": False,
        "reassessment_cap": None,
        "recommendation": recommendation_for_score(0.0),
        "recommendation_detail": recommendation_detail_for_score(0.0)
    }


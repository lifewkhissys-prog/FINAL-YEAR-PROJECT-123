"""
Seed the 7 rubric criteria for thesis assessment.

This is configuration bootstrapping, not demo data.
Run once after initial deployment: python -m app.seed
"""

import asyncio
from sqlalchemy import select, func
from app.database import SessionLocal, engine, init_pgvector
from app.models.thesis_critique import RubricCriterion
from app.services.embedding_service import embed_single
from app.database import Base

RUBRIC_CRITERIA = [
    {
        "name": "Metric & Technical Consistency",
        "weight": 0.25,
        "description": (
            "Evaluates whether all quantitative metrics (accuracy, precision, recall, F1, FAR, FRR, AUC, etc.) "
            "are defined correctly, computed consistently, and reported without contradiction across the abstract, "
            "methodology, results tables, and discussion. Checks that formulas match reported values and that "
            "comparison baselines use the same metric definitions."
        ),
        "level_1_desc": (
            "Multiple metric definitions are wrong or contradictory. Tables contain values that do not match "
            "the formulas given. Key metrics are mixed up (e.g., FAR and FRR swapped). Baseline comparisons "
            "use different metric definitions without acknowledgment."
        ),
        "level_3_desc": (
            "Metrics are mostly defined correctly but with minor inconsistencies between tables or between "
            "the methodology and results chapters. One or two values may not match the stated formula. "
            "The student shows understanding of the metrics but has made careless errors."
        ),
        "level_5_desc": (
            "All metrics are precisely defined, consistently applied across every table and figure, and "
            "match their formulas exactly. Baseline comparisons use identical metric definitions. Any "
            "limitations of the chosen metrics are acknowledged."
        ),
    },
    {
        "name": "Claims-Evidence Alignment",
        "weight": 0.20,
        "description": (
            "Assesses whether the claims made in the abstract, introduction, discussion, and conclusion are "
            "actually supported by the evidence presented in the results chapter. Checks for overclaiming "
            "(stating strong conclusions from weak results), unsupported generalisations, and whether the "
            "language appropriately hedges based on the strength of the evidence."
        ),
        "level_1_desc": (
            "Major claims are unsupported or directly contradicted by the results. The abstract and conclusion "
            "significantly overstate the findings. Strong language ('proves', 'ensures', 'solves') is used "
            "despite weak or negative results."
        ),
        "level_3_desc": (
            "Most claims are supported but the language occasionally overstates the evidence. Some conclusions "
            "go slightly beyond what the data shows. The student generally attempts to ground claims in results "
            "but has a few instances of overclaiming."
        ),
        "level_5_desc": (
            "Every claim is directly traceable to specific evidence. The language precisely matches the strength "
            "of the results (e.g., 'suggests' vs 'demonstrates' used appropriately). Limitations are honestly "
            "stated and conclusions are proportionate to the evidence."
        ),
    },
    {
        "name": "Scope-Methodology-Implementation Alignment",
        "weight": 0.15,
        "description": (
            "Checks whether the declared scope (objectives, research questions, features) in the introduction "
            "matches what was actually implemented in the methodology and results. Identifies scope drift, "
            "missing implementations, or features described but never evaluated."
        ),
        "level_1_desc": (
            "Major mismatch between declared scope and implementation. Multiple objectives or features listed "
            "in the introduction are absent from the methodology and results. The implemented system does "
            "something significantly different from what was described."
        ),
        "level_3_desc": (
            "Most declared features and objectives are implemented, but one or two are partially addressed "
            "or missing without explanation. The scope and implementation are broadly aligned but with "
            "noticeable gaps."
        ),
        "level_5_desc": (
            "Perfect alignment between declared scope, methodology, and implementation. Every objective "
            "has a corresponding method and result. Any scope changes are explicitly justified."
        ),
    },
    {
        "name": "Methodological Rigor",
        "weight": 0.15,
        "description": (
            "Evaluates the quality of the research design: dataset selection and justification, experimental "
            "controls, train/test splitting or cross-validation, parameter justification, threats to validity, "
            "and whether the methodology would allow an independent researcher to reproduce the results."
        ),
        "level_1_desc": (
            "No clear experimental design. Dataset choice is unjustified. No train/test split or the same "
            "data is used for both tuning and evaluation. Parameters are described as 'arbitrary'. No "
            "discussion of threats to validity or reproducibility."
        ),
        "level_3_desc": (
            "Basic experimental design is present with a dataset justification and some form of evaluation "
            "protocol. However, the train/test split may be unclear, parameter choices need stronger "
            "justification, and threats to validity are mentioned briefly but not analysed."
        ),
        "level_5_desc": (
            "Rigorous experimental design with clear dataset justification, proper train/validation/test "
            "splits, well-justified parameters (empirical or literature-based), comprehensive threats to "
            "validity analysis, and enough methodological detail for full reproducibility."
        ),
    },
    {
        "name": "Literature Review Quality",
        "weight": 0.10,
        "description": (
            "Assesses the quality of the literature review: breadth and recency of sources, critical "
            "synthesis vs. descriptive listing, identification of the research gap, and how the review "
            "builds toward the thesis contribution."
        ),
        "level_1_desc": (
            "The literature review is a descriptive list of papers with no synthesis or comparison. "
            "Sources are outdated or low-quality. The research gap is not clearly identified. "
            "No critical analysis of existing work's limitations."
        ),
        "level_3_desc": (
            "The review covers relevant literature with some synthesis and comparison between works. "
            "The research gap is identified but could be sharper. Mix of recent and older sources. "
            "Some critical analysis but tends toward description."
        ),
        "level_5_desc": (
            "Comprehensive, critically synthesised review with recent, high-quality sources. Works are "
            "compared and contrasted systematically. The research gap is clearly and convincingly argued. "
            "The review logically builds toward the thesis contribution."
        ),
    },
    {
        "name": "Referencing & Citation Integrity",
        "weight": 0.08,
        "description": (
            "Checks whether citations are accurate, consistently formatted, and properly used. Evaluates "
            "whether all claims requiring citation are supported, whether reference entries are complete "
            "and verifiable, and whether the citation style is consistent throughout."
        ),
        "level_1_desc": (
            "Multiple missing citations for factual claims. Reference list has incomplete or unverifiable "
            "entries. Citation style is inconsistent. Some cited works do not appear in the reference list "
            "or vice versa."
        ),
        "level_3_desc": (
            "Most claims are properly cited. Reference list is mostly complete but with a few formatting "
            "errors or missing fields (DOI, volume, pages). Citation style is generally consistent with "
            "minor lapses."
        ),
        "level_5_desc": (
            "Every factual claim is properly cited. Reference list is complete with all required fields. "
            "Citation style is perfectly consistent throughout. All references are verifiable and "
            "academically credible."
        ),
    },
    {
        "name": "Structure & Presentation",
        "weight": 0.07,
        "description": (
            "Evaluates the overall document structure, formatting, language quality, logical flow between "
            "chapters and sections, proper use of headings, figure/table captions, numbering, and overall "
            "presentation quality."
        ),
        "level_1_desc": (
            "Poor document structure with missing or misplaced sections. Significant grammar and spelling "
            "errors. Inconsistent formatting, broken numbering, missing captions. The document is difficult "
            "to follow due to structural issues."
        ),
        "level_3_desc": (
            "Standard chapter structure is followed. Language is generally clear with occasional errors. "
            "Formatting is mostly consistent but with some issues in table/figure captions or numbering. "
            "Logical flow between sections is adequate."
        ),
        "level_5_desc": (
            "Excellent document structure with clear logical flow. Professional formatting throughout. "
            "All figures and tables properly captioned, numbered, and cross-referenced. Language is "
            "formal, precise, and free of errors. Table of contents is accurate and complete."
        ),
    },
]


async def seed_rubric():
    """Seed the 7 rubric criteria. Idempotent — skips if criteria already exist."""
    print("── Initializing database ──")
    await init_pgvector()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        # Check if criteria already exist
        result = await session.execute(select(func.count(RubricCriterion.id)))
        count = result.scalar()
        if count and count > 0:
            print(f"✓ {count} rubric criteria already exist. Skipping seed.")
            return

        print("Seeding 7 rubric criteria...")
        for i, data in enumerate(RUBRIC_CRITERIA, 1):
            print(f"  [{i}/7] {data['name']} (weight={data['weight']})")
            embedding = embed_single(data["description"])
            criterion = RubricCriterion(
                name=data["name"],
                description=data["description"],
                weight=data["weight"],
                level_1_desc=data["level_1_desc"],
                level_3_desc=data["level_3_desc"],
                level_5_desc=data["level_5_desc"],
                embedding=embedding,
            )
            session.add(criterion)

        await session.commit()
        print("✓ Rubric criteria seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed_rubric())

import sys
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text

from app.database import SessionLocal, engine, Base
from app.models.thesis_critique import (
    RubricCriterion,
    RubricSubCriterion,
    ChapterSubCriteriaMap,
    GradedExample,
    ThesisSubmission,
    AssessmentResult,
    PlagiarismCheck
)
from app.services.embeddings import generate_embedding

# Mapping criterion titles to chapter keys
CRITERION_CHAPTER_MAPPING = {
    "1. Statement of Problem & Justification": ["introduction"],
    "2. Critical Review of Literature & Frameworks": ["literature_review"],
    "3. Research Design & Methodology": ["methodology"],
    "4. Analysis of Data & Presentation of Results": ["data_analysis", "results"],
    "5. Statement of Findings & Discussion": ["results", "discussion"],
    "6. Conclusions & Recommendations": ["conclusion"],
    "7. Presentation": ["introduction", "conclusion"],
    "1. Project Problem Statement & Objectives": ["introduction"],
    "2. Technical Background & Literature Review": ["literature_review"],
    "3. Design Methodology & Architecture": ["methodology"],
    "4. Implementation & Results Analysis": ["results", "data_analysis"],
    "5. Conclusions & Documentation": ["conclusion"],
    "1. Project Definition & Problem Statement": ["introduction"],
    "2. Literature & Technology Survey": ["literature_review"],
    "3. Design Methodology & Specifications": ["methodology"],
    "4. Implementation, Testing & Results": ["results"],
    "5. Conclusions & Report Presentation": ["conclusion"]
}

# KNUST MPhil Rubric criteria and lettered sub-criteria (Appendix 4.4)
MPHIL_RUBRIC = [
    {
        "criterion": "1. Statement of Problem & Justification",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Ability to articulate topic's import and implications",
                "max_marks": 3.0,
                "low": "Problem statement is vague or lacks context.",
                "mid": "Topic importance is stated but implications are partially explored.",
                "high": "Topic importance and scholarly/practical implications are clearly articulated."
            },
            {
                "name": "Justification (local/international relevance)",
                "max_marks": 3.0,
                "low": "Relevance to local or international context is missing.",
                "mid": "Local relevance is stated with minimal international comparison.",
                "high": "Comprehensive justification establishing local and international relevance."
            },
            {
                "name": "Statement of research questions/objectives/hypotheses",
                "max_marks": 4.0,
                "low": "Objectives or research questions are poorly formulated or missing.",
                "mid": "Research questions and objectives are stated but lack full alignment.",
                "high": "Research questions, objectives, and hypotheses are precise, aligned, and testable."
            }
        ]
    },
    {
        "criterion": "2. Critical Review of Literature & Frameworks",
        "criterion_max": 25.0,
        "sub_criteria": [
            {
                "name": "Scholarly analysis and criticism of relevant research",
                "max_marks": 5.0,
                "low": "Descriptive summary of literature without critical synthesis.",
                "mid": "Identifies key authors and themes with moderate critical analysis.",
                "high": "Rigorous critical analysis evaluating methodologies and findings."
            },
            {
                "name": "Meticulous citation of relevant scholarly work",
                "max_marks": 5.0,
                "low": "Sparse citations or outdated literature sources.",
                "mid": "Adequate citations covering main foundational literature.",
                "high": "Meticulous, up-to-date scholarly citations following academic standards."
            },
            {
                "name": "Competence in understanding/evaluating material",
                "max_marks": 5.0,
                "low": "Shallow understanding of core concepts in literature.",
                "mid": "Good grasp of key theoretical concepts and literature.",
                "high": "Mastery of material demonstrated through deep synthesis."
            },
            {
                "name": "Drawing differences/similarities, identifying gaps",
                "max_marks": 5.0,
                "low": "Fails to contrast perspectives or highlight research gaps.",
                "mid": "Draws key comparisons and identifies general research gaps.",
                "high": "Systematically contrasts literature streams and pinpoints specific gaps."
            },
            {
                "name": "Developing robust conceptual/theoretical frameworks",
                "max_marks": 5.0,
                "low": "Conceptual or theoretical framework is absent or disconnected.",
                "mid": "Framework is presented but loosely linked to variables.",
                "high": "Robust framework clearly mapping relationships between all study variables."
            }
        ]
    },
    {
        "criterion": "3. Research Design & Methodology",
        "criterion_max": 20.0,
        "sub_criteria": [
            {
                "name": "Statement of design/blueprint, with justification",
                "max_marks": 6.0,
                "low": "Methodological design is unstated or inappropriate.",
                "mid": "Research design is stated with basic rationale provided.",
                "high": "Comprehensive research blueprint with rigorous methodological justification."
            },
            {
                "name": "Sampling procedures (size, frame, technique, justification)",
                "max_marks": 7.0,
                "low": "Sampling technique or sample size is unjustified.",
                "mid": "Sample size and sampling procedure stated with general reasoning.",
                "high": "Sample size, sampling frame, and techniques rigorously justified."
            },
            {
                "name": "Data collection/analysis framework",
                "max_marks": 7.0,
                "low": "Data collection instruments or analytical tools are vague.",
                "mid": "Data collection procedures and statistical tools are outlined.",
                "high": "Detailed data collection protocols and robust analytical framework."
            }
        ]
    },
    {
        "criterion": "4. Analysis of Data & Presentation of Results",
        "criterion_max": 12.5,
        "sub_criteria": [
            {
                "name": "Use of appropriate analysis methods/techniques",
                "max_marks": 7.0,
                "low": "Analytical methods are incorrect for data type.",
                "mid": "Standard analytical techniques appropriately applied.",
                "high": "Advanced, highly appropriate analytical methods executed impeccably."
            },
            {
                "name": "Accurate and clear presentation of results",
                "max_marks": 5.5,
                "low": "Results tables/figures are confusing or inaccurately reported.",
                "mid": "Results presented clearly with standard tables and charts.",
                "high": "Exemplary visual and statistical presentation of all findings."
            }
        ]
    },
    {
        "criterion": "5. Statement of Findings & Discussion",
        "criterion_max": 12.5,
        "sub_criteria": [
            {
                "name": "Findings/discussion based on thesis data",
                "max_marks": 3.0,
                "low": "Discussion relies on assumptions not backed by thesis data.",
                "mid": "Discussion is supported by primary thesis data.",
                "high": "Discussion is directly grounded in empirical thesis evidence."
            },
            {
                "name": "Coherence in presentation of argument",
                "max_marks": 3.0,
                "low": "Arguments are disorganized or contradictory.",
                "mid": "Logical flow of arguments across sections.",
                "high": "Exceptionally coherent argument building compelling thesis narrative."
            },
            {
                "name": "Presentation of major findings",
                "max_marks": 3.0,
                "low": "Major findings are glossed over or buried.",
                "mid": "Key findings clearly stated and highlighted.",
                "high": "Major findings systematically summarized and highlighted."
            },
            {
                "name": "Discussion reflecting results in context of RQs/theory",
                "max_marks": 3.5,
                "low": "Fails to relate findings back to research questions or theory.",
                "mid": "Relates results to research questions and existing literature.",
                "high": "Synthesizes results back to research questions, framework, and wider literature."
            }
        ]
    },
    {
        "criterion": "6. Conclusions & Recommendations",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Conclusive statements incorporating major findings",
                "max_marks": 2.0,
                "low": "Conclusions are disconnected from thesis findings.",
                "mid": "Conclusions summarize main findings.",
                "high": "Insightful conclusions synthesizing major empirical findings."
            },
            {
                "name": "Critical discussion of key issues arising",
                "max_marks": 2.0,
                "low": "Omits discussion of key challenges or emerging issues.",
                "mid": "Discusses key practical issues arising from findings.",
                "high": "Critical discussion of core practical and theoretical issues arising."
            },
            {
                "name": "Statement of major contributions to knowledge",
                "max_marks": 2.0,
                "low": "Fails to articulate contribution to knowledge.",
                "mid": "States practical or academic contribution.",
                "high": "Clearly articulates novel theoretical and practical contributions to knowledge."
            },
            {
                "name": "Addressing limitations",
                "max_marks": 2.0,
                "low": "Ignores study limitations.",
                "mid": "Acknowledges basic methodological limitations.",
                "high": "Candidly analyzes limitations and their potential impact on scope."
            },
            {
                "name": "Recommendations and future research directions",
                "max_marks": 2.0,
                "low": "Generic advice not tied to findings.",
                "mid": "Actionable recommendations tied to findings.",
                "high": "Specific, actionable policy recommendations and future research agenda."
            }
        ]
    },
    {
        "criterion": "7. Presentation",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Formatting, language, citation, referencing, sectioning",
                "max_marks": 10.0,
                "low": "Frequent typos, poor formatting, inconsistent citations.",
                "mid": "Good typography and consistent referencing style.",
                "high": "Flawless academic prose, perfect formatting, precise citations."
            }
        ]
    }
]

# MSc (Taught Master's Project) Rubric
MSC_RUBRIC = [
    {
        "criterion": "1. Project Problem Statement & Objectives",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Clarity of project scope and objectives",
                "max_marks": 7.5,
                "low": "Project scope is undefined or unclear.",
                "mid": "Objectives are defined with reasonable clarity.",
                "high": "Objectives are precisely articulated with explicit scope boundaries."
            },
            {
                "name": "Industry or academic justification",
                "max_marks": 7.5,
                "low": "Lacks justification for practical relevance.",
                "mid": "Sufficient rationale provided for practical or industry application.",
                "high": "Compelling, rigorous justification of practical and domain impact."
            }
        ]
    },
    {
        "criterion": "2. Technical Background & Literature Review",
        "criterion_max": 20.0,
        "sub_criteria": [
            {
                "name": "Review of relevant technologies and frameworks",
                "max_marks": 10.0,
                "low": "Superficial review of existing techniques.",
                "mid": "Solid overview of core domain technologies and literature.",
                "high": "Comprehensive, critical evaluation of state-of-the-art technologies."
            },
            {
                "name": "Synthesis and gap identification",
                "max_marks": 10.0,
                "low": "Fails to identify technical limitations in current approaches.",
                "mid": "Identifies clear technical gaps addressed by project.",
                "high": "Rigorous synthesis clearly positioning project relative to existing tools."
            }
        ]
    },
    {
        "criterion": "3. Design Methodology & Architecture",
        "criterion_max": 25.0,
        "sub_criteria": [
            {
                "name": "System architecture and component design",
                "max_marks": 12.5,
                "low": "System architecture is missing or flawed.",
                "mid": "Architectural diagrams and component interactions clearly documented.",
                "high": "Exemplary system design with detailed modular architectural specification."
            },
            {
                "name": "Methodological implementation plan",
                "max_marks": 12.5,
                "low": "Implementation process lacks structured methodology.",
                "mid": "Structured workflow followed with appropriate tools.",
                "high": "Rigorous methodology with clear validation metrics."
            }
        ]
    },
    {
        "criterion": "4. Implementation & Results Analysis",
        "criterion_max": 25.0,
        "sub_criteria": [
            {
                "name": "Quality of implementation and execution",
                "max_marks": 12.5,
                "low": "Implementation is incomplete or buggy.",
                "mid": "Functional implementation meeting core requirements.",
                "high": "Robust, optimized implementation exceeding functional specifications."
            },
            {
                "name": "Performance evaluation and results discussion",
                "max_marks": 12.5,
                "low": "Results are unmeasured or poorly analyzed.",
                "mid": "Empirical results presented with basic analysis.",
                "high": "Thorough experimental evaluation with in-depth statistical/technical analysis."
            }
        ]
    },
    {
        "criterion": "5. Conclusions & Documentation",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Conclusions and future work recommendations",
                "max_marks": 7.5,
                "low": "Conclusions are disconnected from project outcomes.",
                "mid": "Clear summary of achievements and future improvements.",
                "high": "Insightful synthesis of achievements and realistic roadmap."
            },
            {
                "name": "Report formatting and technical writing",
                "max_marks": 7.5,
                "low": "Poor technical writing and inconsistent formatting.",
                "mid": "Well-written report following academic standards.",
                "high": "Impeccable technical writing, formatting, and referencing."
            }
        ]
    }
]

# Undergraduate (BSc Final Year Project) Rubric
UNDERGRADUATE_RUBRIC = [
    {
        "criterion": "1. Project Definition & Problem Statement",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Problem definition and goal specification",
                "max_marks": 7.5,
                "low": "Project goals are vague.",
                "mid": "Project goals are clear and achievable.",
                "high": "Problem definition is well-scoped with clear measurable goals."
            },
            {
                "name": "Motivation and engineering context",
                "max_marks": 7.5,
                "low": "Motivation is unstated.",
                "mid": "Basic engineering motivation provided.",
                "high": "Strong motivation demonstrating real-world engineering relevance."
            }
        ]
    },
    {
        "criterion": "2. Literature & Technology Survey",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Survey of existing solutions and tools",
                "max_marks": 7.5,
                "low": "Sparse literature or tool review.",
                "mid": "Adequate review of relevant tools and technologies.",
                "high": "Comprehensive survey comparing existing engineering solutions."
            },
            {
                "name": "Referencing and source citation",
                "max_marks": 7.5,
                "low": "Missing citations.",
                "mid": "Consistent citations.",
                "high": "Precise, accurate citations throughout report."
            }
        ]
    },
    {
        "criterion": "3. Design Methodology & Specifications",
        "criterion_max": 30.0,
        "sub_criteria": [
            {
                "name": "Design choices and block diagrams",
                "max_marks": 15.0,
                "low": "Lacks design specifications or block diagrams.",
                "mid": "Design choices explained with standard diagrams.",
                "high": "Extensive design documentation with detailed block diagrams."
            },
            {
                "name": "Engineering constraints and considerations",
                "max_marks": 15.0,
                "low": "Ignores safety, cost, or technical constraints.",
                "mid": "Considers basic engineering constraints.",
                "high": "Thorough analysis of technical, economic, and safety constraints."
            }
        ]
    },
    {
        "criterion": "4. Implementation, Testing & Results",
        "criterion_max": 25.0,
        "sub_criteria": [
            {
                "name": "Execution and system testing",
                "max_marks": 12.5,
                "low": "System does not work or lacks testing.",
                "mid": "System functions with basic test results.",
                "high": "Fully functional prototype with thorough test execution."
            },
            {
                "name": "Results presentation and discussion",
                "max_marks": 12.5,
                "low": "Results missing or unformatted.",
                "mid": "Results presented in tables/charts with discussion.",
                "high": "Exemplary presentation of test results with critical discussion."
            }
        ]
    },
    {
        "criterion": "5. Conclusions & Report Presentation",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Conclusion and project report quality",
                "max_marks": 15.0,
                "low": "Poorly written report with major grammatical issues.",
                "mid": "Clean, well-structured report.",
                "high": "Outstanding report presentation, structure, and technical prose."
            }
        ]
    }
]


async def seed_rubric_set(db: AsyncSession, degree_level: str, criteria_data: list, source: str):
    for c_data in criteria_data:
        crit = RubricCriterion(
            degree_level=degree_level,
            name=c_data["criterion"],
            description=f"Evaluation of {c_data['criterion']} for {degree_level.upper()} degree level.",
            max_marks=c_data["criterion_max"],
            source=source
        )
        db.add(crit)
        await db.flush()

        ch_names = CRITERION_CHAPTER_MAPPING.get(c_data["criterion"], ["introduction"])

        for sc_data in c_data["sub_criteria"]:
            sub = RubricSubCriterion(
                criterion_id=crit.id,
                name=sc_data["name"],
                description=f"{sc_data['name']} under {c_data['criterion']}",
                max_marks=sc_data["max_marks"],
                level_low_desc=sc_data["low"],
                level_mid_desc=sc_data["mid"],
                level_high_desc=sc_data["high"]
            )
            db.add(sub)
            await db.flush()

            # Seed ChapterSubCriteriaMap entries so each sub-criterion maps to its chapter
            for ch_n in ch_names:
                db.add(ChapterSubCriteriaMap(
                    chapter_name=ch_n,
                    sub_criterion_id=sub.id
                ))


async def seed_database(force: bool = False):
    """Seeds official rubric criteria and chapter mappings for MPhil, PhD, MSc, and Undergraduate degree levels."""

    async with engine.begin() as conn:
        if force:
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        if not force:
            map_check = (await db.execute(select(ChapterSubCriteriaMap))).scalars().first()
            if map_check:
                print("Rubric database and chapter mappings already populated.")
                return

        print("Populating Rubric criteria and Chapter mappings for MPhil, PhD, MSc, and Undergraduate...")

        # 1. MPhil
        await seed_rubric_set(db, "mphil", MPHIL_RUBRIC, "KNUST HDR Guide 2016, Appendix 4.4")

        # 2. PhD
        await seed_rubric_set(db, "phd", MPHIL_RUBRIC, "KNUST HDR Guide 2016, Appendix 4.2 (PhD Scale)")

        # 3. MSc
        await seed_rubric_set(db, "msc", MSC_RUBRIC, "KNUST Graduate School Guidelines")

        # 4. Undergraduate
        await seed_rubric_set(db, "undergraduate", UNDERGRADUATE_RUBRIC, "KNUST College of Engineering FYP Guidelines")

        await db.commit()
        print("Database successfully seeded with official rubrics and chapter mappings.")


if __name__ == "__main__":
    force_flag = "--force" in sys.argv or "-f" in sys.argv
    asyncio.run(seed_database(force=force_flag))

import sys
import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text, update

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

CRITERION_CHAPTER_MAPPING = {
    "1. Statement of Problem & Justification": ["introduction"],
    "2. Critical Review of Literature & Frameworks": ["literature_review"],
    "3. Research Design & Methodology": ["methodology"],
    "4. Analysis of Data & Presentation of Results": ["results"],
    "5. Statement of Findings & Discussion": ["discussion"],
    "6. Conclusions & Recommendations": ["conclusion"],
    "7. Presentation": ["introduction", "conclusion"],
    "1. Statement of the Problem & Justification": ["introduction"],
    "2. Critical Review of Literature & Theoretical/Conceptual Frameworks": ["literature_review"],
    "3. Approach and Methodology": ["methodology"],
    "5. Statement of Main Findings & Discussion": ["discussion"],
    "2. Literature Review": ["literature_review"],
    "3. Methodology": ["methodology"],
    "5. Findings & Discussion": ["discussion"],
    "6. Conclusions and Recommendations": ["conclusion"],
    "1. Problem Relevance & Objectives": ["introduction"],
    "2. Tools & Methodology Justification": ["literature_review"],
    "3. Requirements & System Design": ["methodology"],
    "4. Implementation Evidence": ["results"],
    "5. Testing & Results": ["results"]
}

# Target chapter key to database chapter mapping
TARGET_CHAPTER_MAP = {
    "introduction": ["introduction"],
    "literature_review": ["literature_review"],
    "methodology": ["methodology"],
    "results": ["results", "data_analysis"],
    "discussion": ["discussion", "results"],
    "results_and_discussion": ["results_and_discussion", "results", "discussion"],
    "conclusion": ["conclusion"],
    "document-wide": ["introduction", "conclusion"]
}

# KNUST MPhil Rubric criteria and lettered sub-criteria (Appendix 4.4 - 100 marks total)
MPHIL_RUBRIC = [
    {
        "criterion": "1. Statement of Problem & Justification",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Ability to articulate topic's import and implications",
                "max_marks": 3.0,
                "chapter_target": "introduction",
                "low": "Problem statement is vague or lacks context.",
                "mid": "Topic importance is stated but implications are partially explored.",
                "high": "Topic importance and scholarly/practical implications are clearly articulated."
            },
            {
                "name": "Justification (local/international relevance)",
                "max_marks": 3.0,
                "chapter_target": "introduction",
                "low": "Relevance to local or international context is missing.",
                "mid": "Local relevance is stated with minimal international comparison.",
                "high": "Comprehensive justification establishing local and international relevance."
            },
            {
                "name": "Statement of research questions/objectives/hypotheses",
                "max_marks": 4.0,
                "chapter_target": "introduction",
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
                "chapter_target": "literature_review",
                "low": "Descriptive summary of literature without critical synthesis.",
                "mid": "Identifies key authors and themes with moderate critical analysis.",
                "high": "Rigorous critical analysis evaluating methodologies and findings."
            },
            {
                "name": "Meticulous citation of relevant scholarly work",
                "max_marks": 5.0,
                "chapter_target": "literature_review",
                "low": "Sparse citations or outdated literature sources.",
                "mid": "Adequate citations covering main foundational literature.",
                "high": "Meticulous, up-to-date scholarly citations following academic standards."
            },
            {
                "name": "Competence in understanding/evaluating material",
                "max_marks": 5.0,
                "chapter_target": "literature_review",
                "low": "Shallow understanding of core concepts in literature.",
                "mid": "Good grasp of key theoretical concepts and literature.",
                "high": "Mastery of material demonstrated through deep synthesis."
            },
            {
                "name": "Drawing differences/similarities, identifying gaps",
                "max_marks": 5.0,
                "chapter_target": "literature_review",
                "low": "Fails to contrast perspectives or highlight research gaps.",
                "mid": "Draws key comparisons and identifies general research gaps.",
                "high": "Systematically contrasts literature streams and pinpoints specific gaps."
            },
            {
                "name": "Developing robust conceptual/theoretical frameworks",
                "max_marks": 5.0,
                "chapter_target": "literature_review",
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
                "chapter_target": "methodology",
                "low": "Methodological design is unstated or inappropriate.",
                "mid": "Research design is stated with basic rationale provided.",
                "high": "Comprehensive research blueprint with rigorous methodological justification."
            },
            {
                "name": "Sampling procedures (size, frame, technique, justification)",
                "max_marks": 7.0,
                "chapter_target": "methodology",
                "low": "Sampling technique or sample size is unjustified.",
                "mid": "Sample size and sampling procedure stated with general reasoning.",
                "high": "Sample size, sampling frame, and techniques rigorously justified."
            },
            {
                "name": "Data collection/analysis framework",
                "max_marks": 7.0,
                "chapter_target": "methodology",
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
                "chapter_target": "results",
                "low": "Analytical methods are incorrect for data type.",
                "mid": "Standard analytical techniques appropriately applied.",
                "high": "Advanced, highly appropriate analytical methods executed impeccably."
            },
            {
                "name": "Accurate and clear presentation of results",
                "max_marks": 5.5,
                "chapter_target": "results",
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
                "chapter_target": "discussion",
                "low": "Discussion relies on assumptions not backed by thesis data.",
                "mid": "Discussion is supported by primary thesis data.",
                "high": "Discussion is directly grounded in empirical thesis evidence."
            },
            {
                "name": "Coherence in presentation of argument",
                "max_marks": 3.0,
                "chapter_target": "discussion",
                "low": "Arguments are disorganized or contradictory.",
                "mid": "Logical flow of arguments across sections.",
                "high": "Exceptionally coherent argument building compelling thesis narrative."
            },
            {
                "name": "Presentation of major findings",
                "max_marks": 3.0,
                "chapter_target": "discussion",
                "low": "Major findings are glossed over or buried.",
                "mid": "Key findings clearly stated and highlighted.",
                "high": "Major findings systematically summarized and highlighted."
            },
            {
                "name": "Discussion reflecting results in context of RQs/theory",
                "max_marks": 3.5,
                "chapter_target": "discussion",
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
                "chapter_target": "conclusion",
                "low": "Conclusions are disconnected from thesis findings.",
                "mid": "Conclusions summarize main findings.",
                "high": "Insightful conclusions synthesizing major empirical findings."
            },
            {
                "name": "Critical discussion of key issues arising",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Omits discussion of key challenges or emerging issues.",
                "mid": "Discusses key practical issues arising from findings.",
                "high": "Critical discussion of core practical and theoretical issues arising."
            },
            {
                "name": "Statement of major contributions to knowledge",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Fails to articulate contribution to knowledge.",
                "mid": "States practical or academic contribution.",
                "high": "Clearly articulates novel theoretical and practical contributions to knowledge."
            },
            {
                "name": "Addressing limitations",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Ignores study limitations.",
                "mid": "Acknowledges basic methodological limitations.",
                "high": "Candidly analyzes limitations and their potential impact on scope."
            },
            {
                "name": "Recommendations and future research directions",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
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
                "chapter_target": "document-wide",
                "low": "Frequent typos, poor formatting, inconsistent citations.",
                "mid": "Good typography and consistent referencing style.",
                "high": "Flawless academic prose, perfect formatting, precise citations."
            }
        ]
    }
]

# KNUST Doctoral (PhD) Rubric criteria and lettered sub-criteria (Appendix 4.2 - 100 marks total)
PHD_RUBRIC = [
    {
        "criterion": "1. Statement of the Problem & Justification",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Ability to articulate topic's import and implications",
                "max_marks": 5.0,
                "chapter_target": "introduction",
                "low": "Problem statement is vague and its scholarly import is not established.",
                "mid": "Topic importance is stated but doctoral-level implications are only partially drawn out.",
                "high": "Import of the topic and its theoretical and practical implications are articulated with authority."
            },
            {
                "name": "Justification (local and/or international perspectives)",
                "max_marks": 5.0,
                "chapter_target": "introduction",
                "low": "No explanation of why the topic merits doctoral study in any context.",
                "mid": "Merit is argued in a local context with limited international positioning.",
                "high": "Compelling justification establishing why the topic merits doctoral study locally and internationally."
            },
            {
                "name": "Statement of research questions, objectives and hypotheses/propositions",
                "max_marks": 5.0,
                "chapter_target": "introduction",
                "low": "Research questions, objectives or hypotheses are missing or incoherent.",
                "mid": "Questions and objectives are stated but hypotheses/propositions are loosely specified.",
                "high": "Precise, mutually aligned research questions, objectives and testable hypotheses or propositions."
            }
        ]
    },
    {
        "criterion": "2. Critical Review of Literature & Theoretical/Conceptual Frameworks",
        "criterion_max": 20.0,
        "sub_criteria": [
            {
                "name": "Evidence of scholarly analysis and criticism of relevant research",
                "max_marks": 4.0,
                "chapter_target": "literature_review",
                "low": "Literature is summarised descriptively with no scholarly criticism.",
                "mid": "Some critical appraisal of key studies, but not sustained across the review.",
                "high": "Sustained scholarly criticism evaluating the methods and claims of the relevant research."
            },
            {
                "name": "Meticulous citation by quotation, paraphrasing and/or commentary",
                "max_marks": 4.0,
                "chapter_target": "literature_review",
                "low": "Sparse, dated or inconsistently attributed sources.",
                "mid": "Adequate citation of the foundational literature in a consistent style.",
                "high": "Meticulous, current citation integrating quotation, paraphrase and commentary."
            },
            {
                "name": "Competence in understanding and evaluating the material",
                "max_marks": 4.0,
                "chapter_target": "literature_review",
                "low": "Superficial grasp of the core concepts under review.",
                "mid": "Sound command of key theoretical concepts in the field.",
                "high": "Mastery of the literature demonstrated through confident evaluation and synthesis."
            },
            {
                "name": "Drawing differences/similarities with previous investigations and identifying gaps",
                "max_marks": 4.0,
                "chapter_target": "literature_review",
                "low": "No comparison with prior investigations and no gap identified.",
                "mid": "Broad comparisons drawn and a general gap asserted.",
                "high": "Systematic contrast with prior investigations pinpointing the specific gap the thesis fills."
            },
            {
                "name": "Developing robust conceptual/theoretical frameworks/modelling techniques",
                "max_marks": 4.0,
                "chapter_target": "literature_review",
                "low": "No framework, or one disconnected from the literature reviewed.",
                "mid": "A framework is presented but its derivation from the literature is thin.",
                "high": "Robust framework or modelling technique rigorously justified from the reviewed literature."
            }
        ]
    },
    {
        "criterion": "3. Approach and Methodology",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Statement of design/blueprint (qualitative, quantitative, mixed), with justification",
                "max_marks": 5.0,
                "chapter_target": "methodology",
                "low": "Research design is unstated, or inappropriate to the questions posed.",
                "mid": "Design and collection mode are stated with basic justification.",
                "high": "Design, collection mode and research philosophy justified and linked to the conceptual framework."
            },
            {
                "name": "Sampling procedures (sample size, sample frames, techniques with justification)",
                "max_marks": 5.0,
                "chapter_target": "methodology",
                "low": "Sample size, frame or technique is unstated or unjustified.",
                "mid": "Sample size and technique are stated with general reasoning.",
                "high": "Sample size determination, sampling frame and technique rigorously justified."
            },
            {
                "name": "Data collection techniques/tools, field processes and analysis framework",
                "max_marks": 5.0,
                "chapter_target": "methodology",
                "low": "Instruments and analytical framework are vague or unreproducible.",
                "mid": "Collection tools and analysis techniques are outlined adequately.",
                "high": "Exactly reproducible field protocols with a rigorously specified analysis framework."
            }
        ]
    },
    {
        "criterion": "4. Analysis of Data & Presentation of Results",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Use of appropriate methods and techniques to analyse the data",
                "max_marks": 7.5,
                "chapter_target": "results",
                "low": "Analytical methods are inappropriate to the data or incorrectly applied.",
                "mid": "Standard analytical techniques correctly applied to the data.",
                "high": "Advanced, highly appropriate analytical techniques executed and reported impeccably."
            },
            {
                "name": "Accurate (reliable and valid) and clear presentation of results",
                "max_marks": 7.5,
                "chapter_target": "results",
                "low": "Results are inaccurately reported or presented unintelligibly.",
                "mid": "Results presented clearly by tabulation, graph or text with reliability addressed.",
                "high": "Exemplary presentation with reliability and validity of the data explicitly established."
            }
        ]
    },
    {
        "criterion": "5. Statement of Main Findings & Discussion",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Findings and discussion based on data from the thesis",
                "max_marks": 4.0,
                "chapter_target": "discussion",
                "low": "Discussion rests on assertions not supported by the thesis data.",
                "mid": "Discussion is grounded in the primary data presented.",
                "high": "Every claim in the discussion is traceable to empirical evidence in the thesis."
            },
            {
                "name": "Coherence in the presentation of argument",
                "max_marks": 3.0,
                "chapter_target": "discussion",
                "low": "Argument is disorganised or internally contradictory.",
                "mid": "Argument follows a clear and logical progression.",
                "high": "Exceptionally coherent argument sustaining a compelling doctoral thesis narrative."
            },
            {
                "name": "Presentation of major findings of the project",
                "max_marks": 4.0,
                "chapter_target": "discussion",
                "low": "Major findings are buried or never distinguished from minor observations.",
                "mid": "Key findings are clearly stated and distinguished.",
                "high": "Major findings systematically foregrounded and their significance established."
            },
            {
                "name": "Discussion reflecting results in the context of research questions, theory and hypotheses",
                "max_marks": 4.0,
                "chapter_target": "discussion",
                "low": "Findings are not related back to the research questions, theory or hypotheses.",
                "mid": "Results are related to the research questions and existing literature.",
                "high": "Results synthesised against the research questions, theoretical framework and wider literature."
            }
        ]
    },
    {
        "criterion": "6. Conclusions & Recommendations",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Conclusive statements incorporating the major findings",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Conclusions are disconnected from the thesis findings.",
                "mid": "Conclusions summarise the major findings.",
                "high": "Concise conclusions synthesising the strongest outcomes of the study."
            },
            {
                "name": "Critical discussion of key issues (discovered, achieved, established, argued)",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Key issues arising from the research are not discussed.",
                "mid": "Discusses what was discovered and achieved.",
                "high": "Critically discusses what was discovered, achieved, established and argued."
            },
            {
                "name": "Statement of major contributions to knowledge",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "No contribution to knowledge is articulated.",
                "mid": "A contribution is claimed in general terms.",
                "high": "Original contribution stated in terms of theory or model building, methodology and policy or industrial application."
            },
            {
                "name": "Addressing and accounting for limitations",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Limitations, including researcher or interviewer bias, are ignored.",
                "mid": "Principal methodological limitations are acknowledged.",
                "high": "Limitations including researcher/interviewer bias candidly analysed and accounted for."
            },
            {
                "name": "Recommendations related to objectives and future research directions",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Recommendations are generic and untied to the objectives.",
                "mid": "Recommendations follow from the objectives and findings.",
                "high": "Specific recommendations tied to the objectives with a well-argued future research agenda."
            }
        ]
    },
    {
        "criterion": "7. Presentation",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Formatting, language, citation and referencing, sectioning, word-length conformity",
                "max_marks": 10.0,
                "chapter_target": "document-wide",
                "low": "Frequent errors, inconsistent Harvard referencing, or breach of the word-length requirement.",
                "mid": "Consistent formatting, sectioning and Harvard referencing throughout.",
                "high": "Flawless academic prose, sectioning, tables/figures/plates and precise Harvard referencing."
            }
        ]
    }
]

# MSc (Taught Master's Project) Rubric (Fix Spec Section 4 - 100 marks total)
MSC_RUBRIC = [
    {
        "criterion": "1. Statement of Problem & Justification",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Problem articulation",
                "max_marks": 4.0,
                "chapter_target": "introduction",
                "low": "Problem statement is undefined or unclear.",
                "mid": "Problem statement is outlined with basic context.",
                "high": "Problem statement is precisely articulated with clear scope boundaries."
            },
            {
                "name": "Justification",
                "max_marks": 3.0,
                "chapter_target": "introduction",
                "low": "Lacks justification for practical relevance.",
                "mid": "Sufficient rationale provided for practical or industry application.",
                "high": "Compelling, rigorous justification of practical and domain impact."
            },
            {
                "name": "Research questions/objectives",
                "max_marks": 3.0,
                "chapter_target": "introduction",
                "low": "Objectives or research questions are poorly formulated.",
                "mid": "Research questions and objectives are stated with reasonable clarity.",
                "high": "Research questions and objectives are precisely aligned and testable."
            }
        ]
    },
    {
        "criterion": "2. Literature Review",
        "criterion_max": 20.0,
        "sub_criteria": [
            {
                "name": "Relevant, current coverage of domain literature",
                "max_marks": 6.0,
                "chapter_target": "literature_review",
                "low": "Superficial review of existing techniques.",
                "mid": "Solid overview of core domain technologies and literature.",
                "high": "Comprehensive, critical evaluation of state-of-the-art technologies."
            },
            {
                "name": "Citation practice",
                "max_marks": 5.0,
                "chapter_target": "literature_review",
                "low": "Sparse or missing citations.",
                "mid": "Adequate citation of foundational literature.",
                "high": "Meticulous, up-to-date scholarly citations."
            },
            {
                "name": "Comparison and gap identification",
                "max_marks": 5.0,
                "chapter_target": "literature_review",
                "low": "Fails to contrast perspectives or highlight technical gaps.",
                "mid": "Identifies clear technical gaps addressed by project.",
                "high": "Systematically contrasts literature streams and pinpoints specific gaps."
            },
            {
                "name": "Link to conceptual framework",
                "max_marks": 4.0,
                "chapter_target": "literature_review",
                "low": "Conceptual framework is absent or disconnected.",
                "mid": "Framework is presented but loosely linked to variables.",
                "high": "Robust framework clearly mapping relationships between study variables."
            }
        ]
    },
    {
        "criterion": "3. Methodology",
        "criterion_max": 20.0,
        "sub_criteria": [
            {
                "name": "Design/approach with justification",
                "max_marks": 7.0,
                "chapter_target": "methodology",
                "low": "Methodological design is unstated or inappropriate.",
                "mid": "Research design is stated with basic rationale provided.",
                "high": "Comprehensive research blueprint with rigorous methodological justification."
            },
            {
                "name": "Data collection method",
                "max_marks": 7.0,
                "chapter_target": "methodology",
                "low": "Data collection instruments or field procedures are vague.",
                "mid": "Data collection procedures and instruments are outlined.",
                "high": "Detailed, reproducible data collection protocols and sampling techniques."
            },
            {
                "name": "Analysis framework",
                "max_marks": 6.0,
                "chapter_target": "methodology",
                "low": "Analytical tools or techniques are unspecified.",
                "mid": "Analytical framework and statistical tools are outlined.",
                "high": "Rigorously specified analytical framework with clear validation metrics."
            }
        ]
    },
    {
        "criterion": "4. Analysis of Data & Presentation of Results",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Appropriate analytical methods",
                "max_marks": 7.5,
                "chapter_target": "results",
                "low": "Analytical methods are inappropriate to the data or incorrectly applied.",
                "mid": "Standard analytical techniques correctly applied to the data.",
                "high": "Advanced, highly appropriate analytical methods executed impeccably."
            },
            {
                "name": "Clear and accurate presentation of results",
                "max_marks": 7.5,
                "chapter_target": "results",
                "low": "Results are inaccurately reported or presented unintelligibly.",
                "mid": "Results presented clearly with standard tables and charts.",
                "high": "Exemplary visual and statistical presentation of all findings."
            }
        ]
    },
    {
        "criterion": "5. Findings & Discussion",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Findings tied to thesis data",
                "max_marks": 4.0,
                "chapter_target": "discussion",
                "low": "Discussion relies on assumptions not backed by thesis data.",
                "mid": "Discussion is supported by primary thesis data.",
                "high": "Discussion is directly grounded in empirical thesis evidence."
            },
            {
                "name": "Coherence in presentation of argument",
                "max_marks": 3.0,
                "chapter_target": "discussion",
                "low": "Arguments are disorganized or internally contradictory.",
                "mid": "Logical flow of arguments across sections.",
                "high": "Exceptionally coherent argument building compelling thesis narrative."
            },
            {
                "name": "Presentation of major findings",
                "max_marks": 4.0,
                "chapter_target": "discussion",
                "low": "Major findings are glossed over or buried.",
                "mid": "Key findings clearly stated and highlighted.",
                "high": "Major findings systematically summarized and highlighted."
            },
            {
                "name": "Discussion reflecting results in context of RQs",
                "max_marks": 4.0,
                "chapter_target": "discussion",
                "low": "Fails to relate findings back to research questions.",
                "mid": "Relates results to research questions and existing literature.",
                "high": "Synthesizes results back to research questions and practical context."
            }
        ]
    },
    {
        "criterion": "6. Conclusions and Recommendations",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Conclusive statements",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Conclusions are disconnected from thesis findings.",
                "mid": "Conclusions summarize main findings.",
                "high": "Insightful conclusions synthesizing major empirical findings."
            },
            {
                "name": "Key issues discussed",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Omits discussion of key challenges or emerging issues.",
                "mid": "Discusses key practical issues arising from findings.",
                "high": "Critical discussion of core practical and technical issues arising."
            },
            {
                "name": "Contribution to knowledge stated",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Fails to articulate practical or domain contribution.",
                "mid": "States practical or industrial application.",
                "high": "Clearly articulates practical, industrial, and domain contributions."
            },
            {
                "name": "Limitations addressed",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Ignores study limitations.",
                "mid": "Acknowledges basic methodological limitations.",
                "high": "Candidly analyzes limitations and their potential impact on scope."
            },
            {
                "name": "Future work recommendations",
                "max_marks": 2.0,
                "chapter_target": "conclusion",
                "low": "Generic advice not tied to findings.",
                "mid": "Actionable recommendations tied to findings.",
                "high": "Specific, actionable policy or future research agenda."
            }
        ]
    },
    {
        "criterion": "7. Presentation",
        "criterion_max": 10.0,
        "sub_criteria": [
            {
                "name": "Formatting, language, citation/referencing, clarity",
                "max_marks": 10.0,
                "chapter_target": "document-wide",
                "low": "Frequent errors, inconsistent referencing, or poor sectioning.",
                "mid": "Consistent formatting, sectioning, and referencing throughout.",
                "high": "Flawless technical prose, sectioning, tables/figures, and precise referencing."
            }
        ]
    }
]

# Undergraduate (BSc Final Year Project) Rubric (Fix Spec Section 4 - 100 marks total)
UNDERGRADUATE_RUBRIC = [
    {
        "criterion": "1. Problem Relevance & Objectives",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Problem statement clarity",
                "max_marks": 5.0,
                "chapter_target": "introduction",
                "low": "Project goals and problem definition are vague.",
                "mid": "Project goals are clear and achievable.",
                "high": "Problem definition is well-scoped with clear, measurable goals."
            },
            {
                "name": "Objectives and scope alignment",
                "max_marks": 5.0,
                "chapter_target": "introduction",
                "low": "Objectives are misaligned with project scope.",
                "mid": "Objectives align with declared engineering scope.",
                "high": "Objectives are precisely articulated with explicit scope boundaries."
            },
            {
                "name": "Justification of chosen approach",
                "max_marks": 5.0,
                "chapter_target": "introduction",
                "low": "Lacks justification for practical relevance.",
                "mid": "Basic engineering motivation provided.",
                "high": "Strong motivation demonstrating real-world engineering relevance."
            }
        ]
    },
    {
        "criterion": "2. Tools & Methodology Justification",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Appropriateness of tools and tech stack",
                "max_marks": 8.0,
                "chapter_target": "literature_review",
                "low": "Sparse literature or tool review, unjustified tech choices.",
                "mid": "Adequate review of relevant tools and tech stack.",
                "high": "Comprehensive survey comparing and justifying chosen tools/stack."
            },
            {
                "name": "Justification depth and reasoning",
                "max_marks": 7.0,
                "chapter_target": "literature_review",
                "low": "Tech stack is listed without trade-off analysis.",
                "mid": "Explains tool choices with basic engineering rationale.",
                "high": "Rigorous technical reasoning evaluating tool trade-offs."
            }
        ]
    },
    {
        "criterion": "3. Requirements & System Design",
        "criterion_max": 20.0,
        "sub_criteria": [
            {
                "name": "Functional and non-functional requirements completeness",
                "max_marks": 10.0,
                "chapter_target": "methodology",
                "low": "Requirements are missing or incomplete.",
                "mid": "Core functional requirements are clearly specified.",
                "high": "Exhaustive functional and non-functional requirements specification."
            },
            {
                "name": "Architecture and database design correctness",
                "max_marks": 10.0,
                "chapter_target": "methodology",
                "low": "Architecture or database design is missing or flawed.",
                "mid": "Architectural diagrams and data models clearly documented.",
                "high": "Exemplary system design with detailed modular architecture and ERD."
            }
        ]
    },
    {
        "criterion": "4. Implementation Evidence",
        "criterion_max": 25.0,
        "sub_criteria": [
            {
                "name": "Working features shown via evidence",
                "max_marks": 15.0,
                "chapter_target": "results",
                "low": "Implementation is incomplete, buggy, or unevidenced.",
                "mid": "Functional implementation demonstrated with screenshots or code excerpts.",
                "high": "Robust, fully functional software implementation with clear evidence."
            },
            {
                "name": "Requirements traceability",
                "max_marks": 10.0,
                "chapter_target": "results",
                "low": "Implemented features fail to match stated requirements.",
                "mid": "Implementation matches primary declared requirements.",
                "high": "Complete traceability from requirements to implemented modules."
            }
        ]
    },
    {
        "criterion": "5. Testing & Results",
        "criterion_max": 15.0,
        "sub_criteria": [
            {
                "name": "Presence of test cases or evaluation evidence",
                "max_marks": 10.0,
                "chapter_target": "results",
                "low": "System lacks testing or evaluation evidence.",
                "mid": "Basic test cases or evaluation metrics reported.",
                "high": "Thorough test suites or empirical metrics (e.g. model accuracy) rigorously evaluated."
            },
            {
                "name": "Clarity of reported outcomes",
                "max_marks": 5.0,
                "chapter_target": "results",
                "low": "Test outcomes are unmeasured or confusing.",
                "mid": "Test results presented clearly in tables or charts.",
                "high": "Exemplary visual and tabular reporting of evaluation results."
            }
        ]
    },
    {
        "criterion": "6. Conclusions and Recommendations",
        "criterion_max": 5.0,
        "sub_criteria": [
            {
                "name": "Grounded conclusions and recommendations",
                "max_marks": 5.0,
                "chapter_target": "conclusion",
                "low": "Conclusions are disconnected from project outcomes.",
                "mid": "Clear summary of project achievements and future improvements.",
                "high": "Insightful conclusion grounded in actual project evidence with realistic roadmap."
            }
        ]
    },
    {
        "criterion": "7. Presentation",
        "criterion_max": 5.0,
        "sub_criteria": [
            {
                "name": "Formatting, structure, and referencing",
                "max_marks": 5.0,
                "chapter_target": "document-wide",
                "low": "Poor writing, missing citations, or messy layout.",
                "mid": "Clean, well-structured report following basic academic standards.",
                "high": "Outstanding technical report presentation, structure, and referencing."
            }
        ]
    }
]

RUBRIC_SOURCES = {
    "mphil": "KNUST HDR Guide 2016, Appendix 4.4",
    "phd": "KNUST HDR Guide 2016, Appendix 4.2",
    "msc": (
        "Departmental adaptation of KNUST HDR Guide 2016 Section E criteria "
        "(derived — the Guide specifies no separate taught-Master's numeric mark scheme)"
    ),
    "undergraduate": (
        "Departmental BSc Final Year Project rubric "
        "(derived — not part of the KNUST HDR Guide 2016, which covers PhD, MPhil and taught Master's only)"
    ),
}

RUBRIC_SETS = {
    "mphil": MPHIL_RUBRIC,
    "phd": PHD_RUBRIC,
    "msc": MSC_RUBRIC,
    "undergraduate": UNDERGRADUATE_RUBRIC,
}


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

        for sc_data in c_data["sub_criteria"]:
            target_chap = sc_data.get("chapter_target", "introduction")
            ch_names = TARGET_CHAPTER_MAP.get(target_chap, ["introduction"])

            sub = RubricSubCriterion(
                criterion_id=crit.id,
                name=sc_data["name"],
                description=f"{sc_data['name']} under {c_data['criterion']}",
                max_marks=sc_data["max_marks"],
                level_low_desc=sc_data["low"],
                level_mid_desc=sc_data["mid"],
                level_high_desc=sc_data["high"],
                chapter_target=target_chap
            )
            db.add(sub)
            await db.flush()

            # Seed ChapterSubCriteriaMap entries so each sub-criterion maps to its chapter
            for ch_n in ch_names:
                db.add(ChapterSubCriteriaMap(
                    chapter_name=ch_n,
                    sub_criterion_id=sub.id
                ))


async def deprecate_old_rubrics_if_needed(db: AsyncSession, degree_level: str):
    """
    Soft-deprecate old rubric rows for a degree level if their criterion names/counts differ
    from the expected scheme in code, preserving FK integrity for past AssessmentResults.
    Also backfills missing chapter_target on pre-existing rows.
    """
    # Backfill missing chapter_target on active sub-criteria
    null_target_subs = (await db.execute(
        select(RubricSubCriterion)
        .join(RubricCriterion)
        .where(
            RubricSubCriterion.chapter_target.is_(None),
            RubricSubCriterion.deprecated_at.is_(None),
            RubricCriterion.degree_level == degree_level
        )
    )).scalars().all()

    if null_target_subs:
        for sub in null_target_subs:
            maps = (await db.execute(
                select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.sub_criterion_id == sub.id)
            )).scalars().all()
            ch_names = [m.chapter_name for m in maps]
            if "literature_review" in ch_names:
                sub.chapter_target = "literature_review"
            elif "methodology" in ch_names:
                sub.chapter_target = "methodology"
            elif "results" in ch_names or "data_analysis" in ch_names:
                sub.chapter_target = "results"
            elif "discussion" in ch_names:
                sub.chapter_target = "discussion"
            elif "conclusion" in ch_names:
                sub.chapter_target = "conclusion"
            else:
                sub.chapter_target = "introduction"
        await db.flush()

    expected = RUBRIC_SETS[degree_level]
    expected_names = {c["criterion"] for c in expected}

    existing_active = (await db.execute(
        select(RubricCriterion).where(
            RubricCriterion.degree_level == degree_level,
            RubricCriterion.deprecated_at.is_(None)
        )
    )).scalars().all()

    if not existing_active:
        return

    actual_names = {c.name for c in existing_active}
    if actual_names != expected_names:
        now = datetime.now(timezone.utc)
        print(f"[rubric-migration] Soft-deprecating {len(existing_active)} old criteria for '{degree_level}'...")
        for crit in existing_active:
            crit.deprecated_at = now
            sub_crits = (await db.execute(
                select(RubricSubCriterion).where(RubricSubCriterion.criterion_id == crit.id)
            )).scalars().all()
            for sub in sub_crits:
                sub.deprecated_at = now
        await db.flush()


async def verify_chapter_target_consistency(db: AsyncSession):
    """
    Startup assertion: check that every non-deprecated RubricSubCriterion's chapter_target
    agrees with its ChapterSubCriteriaMap entries.
    """
    stmt = (
        select(RubricSubCriterion)
        .join(RubricCriterion)
        .where(
            RubricSubCriterion.deprecated_at.is_(None),
            RubricCriterion.deprecated_at.is_(None)
        )
    )
    sub_crits = (await db.execute(stmt)).scalars().all()
    inconsistencies = 0

    for sub in sub_crits:
        maps = (await db.execute(
            select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.sub_criterion_id == sub.id)
        )).scalars().all()
        mapped_chaps = {m.chapter_name for m in maps}
        expected_chaps = set(TARGET_CHAPTER_MAP.get(sub.chapter_target or "introduction", []))

        if not mapped_chaps.intersection(expected_chaps):
            print(
                f"WARNING [Rubric Consistency]: Sub-criterion ID {sub.id} ('{sub.name}') has chapter_target='{sub.chapter_target}' "
                f"but mapped chapters={mapped_chaps} (expected {expected_chaps})."
            )
            inconsistencies += 1

    if inconsistencies == 0:
        print("Rubric chapter_target consistency check passed.")


async def seed_users(db: AsyncSession):
    from app.models.user import User, UserRole
    from app.utils.hashing import hash_password

    res_lec = await db.execute(select(User).where(User.email == "lecturer@knust.edu.gh"))
    if not res_lec.scalar_one_or_none():
        db.add(User(
            name="Dr. Kwame Mensah",
            email="lecturer@knust.edu.gh",
            password_hash=hash_password("password123"),
            role=UserRole.lecturer
        ))

    res_stu = await db.execute(select(User).where(User.email == "student@knust.edu.gh"))
    if not res_stu.scalar_one_or_none():
        db.add(User(
            name="Ama Serwaa",
            email="student@knust.edu.gh",
            password_hash=hash_password("password123"),
            role=UserRole.student
        ))
    await db.flush()


async def seed_database(force: bool = False):
    """Seeds official rubric criteria, chapter mappings, and demo users."""

    async with engine.begin() as conn:
        if force:
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        await seed_users(db)

        for level in RUBRIC_SETS:
            await deprecate_old_rubrics_if_needed(db, level)

            # Check if active criteria exist for this degree level
            active_count = len((await db.execute(
                select(RubricCriterion.id).where(
                    RubricCriterion.degree_level == level,
                    RubricCriterion.deprecated_at.is_(None)
                )
            )).scalars().all())

            if active_count == 0:
                print(f"Seeding '{level}' rubric ({RUBRIC_SOURCES[level]})...")
                await seed_rubric_set(db, level, RUBRIC_SETS[level], RUBRIC_SOURCES[level])

        await db.commit()
        await verify_chapter_target_consistency(db)
        print("Database successfully seeded with official rubrics and demo users.")
        return "seeded"


if __name__ == "__main__":
    force_flag = "--force" in sys.argv or "-f" in sys.argv

    async def _main():
        await seed_database(force=force_flag)

    asyncio.run(_main())

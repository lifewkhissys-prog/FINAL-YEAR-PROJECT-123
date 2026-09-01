
# TITLE PAGE

**EVIDENCE-BASED THESIS ASSESSOR: A RUBRIC-GROUNDED MULTI-STAGE AI PIPELINE FOR AUTOMATED ACADEMIC ASSESSMENT**

By
**Mahfuz Agbor Seidu (Index: 3364722)**
**Kelvin Ankomah (Index: 3371222)**

Department of Computer Science
Kwame Nkrumah University of Science and Technology

Supervisor: Dr. Benjamin Tei Partey
August 2026



# DECLARATION

We hereby declare that this project, "Evidence-Based Thesis Assessor: A Rubric-Grounded Multi-Stage AI Pipeline for Automated Academic Assessment," is our original work and has not been presented for a degree in any other university, and that all sources of material used for the project have been fully acknowledged.



# ABSTRACT

Single-prompt large language model (LLM) grading of academic theses is unreliable: it is prone to hallucinated justification, inconsistent application of a specific marking rubric, and a tendency to default to generic academic standards rather than an institution's actual criteria. This study addresses this problem by designing, implementing, and evaluating an evidence-grounded, multi-stage AI pipeline for automated thesis assessment, formalising Kwame Nkrumah University of Science and Technology's (KNUST) own published thesis evaluation rubric directly into the system's scoring logic across four degree levels (Undergraduate, MSc, MPhil, PhD).

The resulting ten-stage pipeline decomposes assessment into discrete stages — structural compliance checking, cross-chapter flow analysis, per-chapter evidence gathering, calibrated scoring, independent verification, and narrative synthesis — rather than performing assessment in a single generative step. The system was implemented as a working web application allowing a supervisor to upload a thesis, review AI-generated scores and supporting evidence, override individual scores, and export a final report.

Three specific defects identified during development — an internally inconsistent score-recommendation pairing, a non-functional verification stage, and severe undisclosed truncation of chapter content — were documented with direct before/after evidence and resolved through specific architectural interventions. The system's synthesised narrative output was evaluated qualitatively against a real supervisor's written critique, demonstrating substantial improvement in tone, structure, and internal consistency, while two specific gaps were honestly identified as remaining. A fully quantitative evaluation (inter-rater agreement against human scores) was not possible due to limited access to independently graded exemplar theses, and this limitation, together with concrete recommendations for addressing it, is discussed directly.

Keywords: automated thesis assessment, large language models, rubric-based grading, AI in education, evidence-grounded evaluation



# TABLE OF CONTENTS

*(Note: Update page numbers in your word processor after pasting)*

**1. CHAPTER ONE - INTRODUCTION**
1.1 Background of the Study
1.2 Statement of the Problem
1.3 Aim and Objectives
1.4 Research Questions
1.5 Significance of the Study
1.6 Scope and Limitations of the Study
1.7 Definition of Terms
1.8 Organisation of the Report

**2. CHAPTER TWO - LITERATURE REVIEW**
2.1 Introduction
2.2 The Reliability Problem in LLM-Based Grading
2.3 RubiSCoT and Structured, Multi-Stage Thesis Assessment
2.4 Empirical Evidence on Rubric Weighting and Human-AI Alignment
2.5 Institutional Rubric Grounding
2.6 Summary and Identified Gap

**3. CHAPTER THREE - SYSTEM ANALYSIS AND METHODOLOGY**
3.1 Research Design
3.2 System Architecture Overview
3.3 Rubric Formalisation
3.4 Pipeline Architecture
3.5 Design Decision: Full-Context Prompting Instead of RAG
3.6 Iterative Development Process
3.7 Limitations of the Methodological Approach

**4. CHAPTER FOUR - SYSTEM DESIGN, IMPLEMENTATION AND EVALUATION**
4.1 Development Environment and Tools
4.2 Database Implementation
4.3 Pipeline Call Volume
4.4 Illustrative Defects Identified and Resolved During Development
4.5 Evaluation Approach and Scope
4.6 Evaluation Method: Comparison Against a Human-Supervisor Target
4.7 Remaining Gaps Identified Through This Comparison
4.8 Why a Quantitative Comparison Was Not Conducted
4.9 Answering the Research Questions
4.10 Known Implementation Limitations

**5. CHAPTER FIVE - SUMMARY, CONCLUSION AND RECOMMENDATIONS**
5.1 Summary of the Study
5.2 Achievements and Contributions
5.3 Concluding Remarks
5.4 Recommendations for Future Work

**REFERENCES**



# CHAPTER ONE: INTRODUCTION

## 1.1 Background of the Study

The assessment of postgraduate and undergraduate theses is one of the most consequential yet time-intensive responsibilities placed on academic supervisors. A thorough thesis critique requires a supervisor to hold, at once, a formal marking rubric, the specific conventions of their discipline, and a close reading of an often lengthy document — checking not only whether individual chapters are present, but whether the claims made in one chapter are consistent with the evidence presented in another. This is slow, cognitively demanding work, and the number of theses a supervisor must assess in a given examination period frequently outpaces the time available to give each one the depth of scrutiny it merits.

The recent proliferation of Large Language Models (LLMs) has prompted interest in automating parts of this process. LLMs are capable of producing fluent, structured, and seemingly authoritative critique text at negligible cost and time compared to a human reader. This has led to a growing body of research exploring LLMs as academic graders — for essays, short-answer responses, and increasingly, longer research documents.

However, a naive application of this idea — simply prompting an LLM to "grade this thesis" — surfaces a well-documented and serious limitation. Off-the-shelf LLMs asked to grade academic work in a single, holistic pass frequently hallucinate plausible-sounding but unjustified critique, default to generic academic standards learned from their training data rather than the specific rubric a given institution actually uses, and fail to consistently apply the numerical weightings a real marking scheme specifies (Section 2.2 examines this literature in detail). In short, an LLM's fluency can create the *appearance* of a rigorous assessment while the underlying judgment is ungrounded in either the actual rubric or the actual document.

This gap — between what an LLM can superficially produce and what a genuinely rubric-grounded, evidence-based assessment requires — motivates the present study.

## 1.2 Statement of the Problem

Kwame Nkrumah University of Science and Technology (KNUST), like most research-intensive universities, publishes a formal thesis evaluation guide specifying, in detail, the criteria against which a thesis is to be marked, the marks allocated to each criterion, and the grade bands into which a final percentage score maps (KNUST School of Graduate Studies, 2016). A supervisor applying this guide must simultaneously: verify that a thesis meets baseline structural and compliance requirements; assess the content of each chapter against multiple weighted marking criteria; check for internal consistency between chapters (for instance, that a stated research scope is actually reflected in the methodology and results); and synthesise all of this into a coherent, actionable, written critique.

An LLM-based system intended to assist with this task cannot simply be asked to perform this synthesis in one step. Doing so — as demonstrated by early testing during this project (see Chapter 4) — produces critique that is generic, internally inconsistent (for example, an overall score of 9% accompanied by a recommendation stating the thesis was "acceptable in concept"), and not meaningfully grounded in the specific rubric a supervisor at KNUST would actually apply.

The problem this study addresses is therefore twofold:

1. **How can an LLM-based assessment system be structured so that its scoring is demonstrably grounded in a specific, real institutional rubric** — in this case, KNUST's Guide for Preparation and Evaluation of Higher Degree Research Thesis — **rather than the model's generic, pre-trained notion of academic quality?**

2. **How can such a system be architected to avoid the specific failure modes of single-prompt LLM grading** (hallucinated evidence, inconsistent scoring, recommendation text that contradicts the numeric score it accompanies) **while remaining practical to build and operate within the constraints of a final year project?**


## 1.3 Aim and Objectives

**Aim:** The aim of this study is to design, implement, and evaluate an evidence-grounded, multi-stage AI pipeline for automated thesis assessment that produces rubric-aligned, internally consistent, and substantively specific critique — closer in depth and accuracy to a human supervisor's critique than a single-prompt LLM baseline.

**Objectives:**

1. To review existing literature and frameworks for AI-supported academic assessment, and identify the specific architectural patterns (rubric grounding, evidence citation, structured decomposition) associated with more reliable LLM-based grading.


2. To formalise KNUST's official thesis evaluation rubric (covering MPhil and PhD degree levels) into a structured, machine-readable format, and to derive comparable rubrics for degree levels — Undergraduate and MSc — not explicitly covered by the existing institutional guide.


3. To design and implement a multi-stage assessment pipeline comprising: a compliance/readiness gate, cross-chapter structural analysis, chapter-scoped evidence gathering, rubric-grounded scoring, independent verification of scoring decisions, and synthesis of a full narrative report.


4. To implement the system as a working web application usable by a supervisor, allowing thesis upload, review of AI-generated scores and evidence, manual override of individual scores, and export of a final report.


5. To evaluate the system's output against a naive single-prompt baseline and, where possible, against real human-supervisor critique, identifying both improvements achieved and limitations remaining.



## 1.4 Research Questions

1. Does decomposing thesis assessment into discrete, evidence-grounded stages (rather than a single holistic prompt) produce measurably more consistent and rubric-aligned scoring?


2. Can a synthesized narrative report generated by such a pipeline approach the structure, specificity, and tone of a real supervisor's written critique?


3. What are the practical limitations of an LLM-based assessment pipeline built within the time, data, and infrastructure constraints of an undergraduate final year project, and how should these be addressed or scoped for future work?



## 1.5 Significance of the Study

For supervisors, a working system of this kind offers a way to produce an initial, evidence-grounded first-pass critique in minutes rather than hours, which the supervisor can then review, override where necessary, and finalise — reducing time spent on the more mechanical aspects of assessment (such as formatting and referencing checks) without removing human judgment from the final decision.

For the broader field, this study contributes a concrete, tested case study in applying rubric-grounded, multi-stage LLM architectures to a real institutional grading context, including an honest account of what such a system can and cannot yet do reliably — a contribution the literature review (Chapter 2) identifies as still relatively sparse for thesis-length documents specifically, as opposed to short-answer or essay grading.

## 1.6 Scope and Limitations of the Study

**Scope:** This study covers the design and implementation of an AI-assisted thesis assessment system for Bachelor's, Master's (taught and research), and Doctoral theses, evaluated against KNUST's institutional rubric structure. The system covers structural compliance checking, cross-chapter consistency analysis, rubric-based scoring with supporting evidence, and narrative report synthesis.

**Limitations:**

* The official KNUST rubric (KNUST School of Graduate Studies, 2016) provides detailed marking criteria for MPhil and PhD theses only. Rubrics for Undergraduate and MSc levels used in this system are derived by the researcher from available departmental structure guidance and require formal confirmation from departmental supervisors; they are not official KNUST-published criteria.


* The system's plagiarism-checking component is a lightweight, in-house similarity check (combining n-gram overlap, embedding similarity, and academic-database lookups via the OpenAlex API) rather than a commercial plagiarism detection service such as Turnitin or Copyleaks; it should be understood as a supplementary heuristic, not a substitute for institutional plagiarism screening.


* Evaluation of the system's scoring against real human-supervisor judgment is limited by the availability of graded exemplar theses; this study's evaluation (Chapter 5) is scoped accordingly and identifies expanded evaluation data as a priority for future work.


* The system assumes a single trusted supervisor-user context; multi-user access control and institutional-scale deployment concerns are outside the scope of this project.



## 1.7 Definition of Terms

* **Rubric criterion / sub-criterion:** A criterion is a top-level marking category (e.g. "Critical Review of Literature," worth 25 marks under the KNUST MPhil scheme); a sub-criterion is an individually scored component within it (e.g. "citation quality," worth 5 of those 25 marks).


* **Evidence grounding:** The practice of requiring an AI system to cite specific, verbatim text from the document under assessment to support any score or claim it makes, rather than producing unsupported judgment.


* **Full-context prompting:** Providing an LLM with the complete relevant text for a task within a single prompt, rather than retrieving only a subset of it via similarity search (contrasted with Retrieval-Augmented Generation, or RAG, in Chapter 3).


* **Grade band:** The percentage ranges (per the KNUST guide, e.g. 70–100% = Grade A, "Excellent") into which a computed overall score is mapped to produce a letter grade and pass/fail recommendation.



## 1.8 Organisation of the Report

Chapter Two reviews the literature on AI-supported academic assessment, including prior frameworks for rubric-grounded and multi-stage LLM grading. Chapter Three describes the system's design and methodology, including the rubric formalisation process and the multi-stage pipeline architecture. Chapter Four details the system's implementation, defect resolutions, and evaluates the system's output against a human-supervisor target standard. Chapter Five summarises the study and outlines recommendations for future work.



# CHAPTER TWO: LITERATURE REVIEW

## 2.1 Introduction

This chapter reviews the existing literature on AI-supported academic assessment, with particular attention to three themes directly relevant to this study: the documented reliability problems of single-prompt LLM grading; frameworks that attempt to address these problems through structural decomposition and rubric grounding, most notably RubiSCoT; and empirical work examining how closely AI-assigned scores and criterion weightings align with those of real human supervisors. The chapter closes by identifying the specific gap this study addresses: a rubric-grounded, multi-stage assessment pipeline evaluated in a specific institutional context — KNUST's own thesis evaluation rubric — rather than a generic or default rubric structure.

## 2.2 The Reliability Problem in LLM-Based Grading

A growing body of research has applied large language models to academic grading tasks, ranging from short clinical answers to full programming assignments. Reviews of this literature consistently note that, despite strong surface fluency, LLM graders remain vulnerable to hallucinated feedback and inconsistent rubric adherence, prompting most recent systems to build in some form of human oversight rather than relying on fully autonomous grading (Scientific Reports, 2026). This concern is not limited to any single discipline: comparable calibration challenges have been reported in dental education, where LLM-assigned scores on clinical short-answer questions were compared against expert human graders to establish a reliability baseline, and in clinical medical examination contexts, where prompt refinement across iterative testing rounds was specifically aimed at reducing hallucinated or ambiguous grading statements.

A further reliability concern specific to rubric-based grading is a model's sensitivity to how a rubric and its supporting exemplars are presented to it: in-context learning approaches to automated grading have been shown to be sensitive to the particular exemplars selected and their ordering, meaning that scoring can shift meaningfully based on prompt construction choices that have nothing to do with the quality of the work being graded. Score-distribution-aware sampling methods have also been proposed specifically because ungoverned LLM grading was found to produce unreasonable results attributable to randomness or hallucination, requiring a post-grading human review pass as a safeguard.

Taken together, this literature establishes the central premise motivating the present study: LLM grading is not reliable by default, and reliability must be actively engineered into a system's architecture rather than assumed from the underlying model's general capability.

## 2.3 RubiSCoT and Structured, Multi-Stage Thesis Assessment

The most directly relevant prior work to this study is RubiSCoT, a framework for AI-supported academic assessment developed by Fröhlich and Schlippe and presented at the 6th International Conference on Artificial Intelligence in Education Technology (AIET 2025). RubiSCoT was developed specifically in response to identified gaps in existing AI-assisted grading approaches — namely inconsistency, lack of transparency, and limited scalability — and was designed through an iterative, empirically grounded process rather than a purely theoretical one, drawing on feedback from human graders and institutional stakeholders across piloted trials on real thesis documents.

RubiSCoT's architecture combines large language models, retrieval-augmented generation, and structured chain-of-thought prompting into a pipeline comprising preliminary assessment, multidimensional (rubric-based) assessment, content extraction, rubric-based scoring, and detailed reporting. Two design decisions from RubiSCoT directly informed the architecture of the present study: first, that a preliminary readiness check should precede detailed evaluation, so that a document failing basic structural expectations is flagged before the more expensive scoring stages run; and second, that content extraction — mapping a document's stated objectives, methods, and results into a structured form — is treated as a distinct pipeline stage in its own right, rather than left implicit within a single scoring prompt.

RubiSCoT's authors position their framework specifically against prior AI grading approaches that focus mainly on essay and short-answer grading rather than full thesis-length evaluation, identifying full-thesis assessment as a comparatively underexplored application relative to shorter graded artefacts — a gap this study's focus on full thesis documents directly addresses within a specific institutional context.

## 2.4 Empirical Evidence on Rubric Weighting and Human-AI Alignment

A significant limitation identified in the RubiSCoT literature itself, and addressed directly in subsequent work, concerns how criterion weights within a rubric-based AI system are actually determined. Gursahaney et al. (2026) conducted an empirical study surveying 84 thesis supervisors across four academic disciplines, collecting weighting data across 35 thesis assessment criteria, and comparing these supervisor-derived weights against RubiSCoT's default criterion weights. The study found substantial divergence between the two, and evaluated the practical impact of recalibrating an AI system to use supervisor-derived weights instead of default ones, testing this on a corpus of 80 German-language theses.

This finding is directly relevant to the present study's own rubric design process. Where an AI-supported assessment system's rubric structure is inferred or adapted rather than sourced from an authoritative, institution-specific document, there is a demonstrated empirical risk that the resulting weights will not reflect what supervisors actually prioritise in practice. This risk is explicitly present in the current study for the Undergraduate and MSc rubric levels, which — unlike the MPhil and PhD levels, both taken directly from KNUST's own published guide — were derived by the researcher in the absence of an equivalent official document (see Section 3.3 and the limitations discussed in Section 1.6).

Separately, work on calibrating LLM output against human subject-matter experts has demonstrated that alignment between AI and human scoring is not fixed, but can be substantially improved through deliberate calibration. A large-scale study evaluating generative AI models against human evaluators across several thousand scoring instances found that AI models tended toward more conservative scoring than human evaluators (who exhibited a measurable leniency bias), and that a teacher-level calibration framework improved human-AI scoring agreement from 53% to over 82% (Murff, 2025). This result supports a central premise of the present study's design: that agreement between an AI system's scores and a real supervisor's judgment should not be assumed, and should instead be treated as an outcome to be measured and, where possible, improved through structural means such as evidence grounding, independent verification of scoring decisions, and — as identified as future work in this study — calibration against real graded examples.

## 2.5 Institutional Rubric Grounding

The literature reviewed above largely evaluates AI grading systems against either generic academic rubrics or rubrics adapted from a single study's own dataset. This study instead grounds its rubric structure directly in a specific institution's own published evaluation framework: KNUST's Guide for Preparation and Evaluation of Higher Degree Research Thesis (KNUST School of Graduate Studies, 2016), which specifies, for both MPhil and PhD degrees, a detailed set of weighted marking criteria and sub-criteria (see Section 3.3), together with formal grade-band mappings for converting a percentage score into a final grade and recommendation.

Using an institution's own published rubric, rather than a generic or externally-sourced one, directly addresses the reliability concern highlighted in Section 2.2 — namely, that an LLM left to its own "generalized internal knowledge" of academic standards will tend to apply criteria that may conflict with, or omit, the specific requirements a local curriculum actually specifies. It also creates a documentation and traceability requirement not present in more generic grading studies: every criterion and sub-criterion used by the system in this study can be traced to a specific appendix of a named institutional document, or explicitly flagged where no such official document exists (as is the case for the Undergraduate and MSc levels, discussed further in Chapter 3).

## 2.6 Summary and Identified Gap

The literature reviewed in this chapter establishes three points that directly shape the design of this study. First, single-prompt LLM grading is unreliable by default and requires deliberate architectural intervention — structural decomposition, evidence grounding, and human oversight — to be usable in a real assessment context. Second, RubiSCoT demonstrates that a structured, multi-stage pipeline (preliminary assessment, content extraction, rubric-based scoring, reporting) is a viable and empirically-motivated architecture for this problem, though its own evaluation and follow-up work (Gursahaney et al., 2026) highlights the importance of accurately sourced criterion weights specifically. Third, human-AI grading agreement is not fixed and can be measurably improved through calibration — a goal this study treats as an evaluation target rather than an assumption.

The specific gap this study addresses is the application of these principles to a single, real institutional rubric — KNUST's own thesis evaluation guide — across all degree levels the institution serves, including levels (Undergraduate, MSc) for which no equivalent official rubric currently exists in published form. Chapter Three describes how this rubric was formalised and how the resulting multi-stage pipeline was designed to address the specific reliability failure modes identified in this chapter.



# CHAPTER THREE: SYSTEM ANALYSIS AND METHODOLOGY

## 3.1 Research Design

This study follows a Design Science Research (DSR) approach, consistent with the methodological grounding described for RubiSCoT (Fröhlich & Schlippe, 2025) — a framework this study draws on directly. DSR emphasises the creation of an artefact (in this case, the assessment pipeline itself) through iterative cycles of problem identification, design, demonstration, and evaluation, rather than validating a hypothesis through a single fixed experiment. This approach suited the present study for a practical reason: early testing repeatedly surfaced concrete, specific defects in the system's output (Section 3.6), and the system's design was revised in direct response to each of these findings before proceeding to evaluation. This chapter documents both the resulting architecture and the design decisions made in response to that iterative process.

## 3.2 System Architecture Overview

The system is a web application comprising a FastAPI (Python) backend, a React frontend, and a PostgreSQL database. Its core function is an automated, multi-stage assessment pipeline that a supervisor triggers after uploading a thesis document, receiving in return a set of rubric-grounded scores, supporting evidence, and a synthesised narrative report. The complete technology stack is documented in Appendix B.

The central methodological commitment underlying the pipeline's design is that thesis assessment should never be performed in a single, holistic prompt to a language model. As established in Chapter 2, single-prompt LLM grading is prone to hallucinated justification, inconsistent application of a specific rubric, and a tendency to default to generic academic standards rather than an institution's actual marking scheme. The pipeline is therefore decomposed into ten discrete stages, each with a narrow, well-defined task, described in Section 3.4.

## 3.3 Rubric Formalisation

### 3.3.1 Source Rubrics

The rubric structure used by the system was formalised directly from KNUST's Guide for Preparation and Evaluation of Higher Degree Research Thesis (KNUST School of Graduate Studies, 2016). This guide provides detailed, weighted marking criteria for two degree levels:

* **MPhil** (Appendix 4.4 of the guide): 7 top-level criteria and 20 sub-criteria, summing to 100 marks.


* **PhD** (Appendix 4.2 of the guide): the same 7-criterion structure, with different mark allocations reflecting the higher expectations of originality and theoretical contribution associated with doctoral research (e.g. Statement of Problem & Justification is weighted 15 marks at PhD level versus 10 at MPhil level).



Each top-level criterion (e.g. "Critical Review of Literature & Frameworks," 25 marks under the MPhil scheme) is further decomposed into its constituent sub-criteria (e.g. "Scholarly analysis and criticism of relevant research," 5 marks) exactly as specified in the guide's own lettered sub-parts. This two-level hierarchy — criterion and sub-criterion — is preserved directly in the system's database schema (`rubric_criteria` and `rubric_sub_criteria` tables), so that every score the system produces is traceable to a specific, named marking component in the original institutional document.

### 3.3.2 Rubrics for Levels Not Covered by the Official Guide

The KNUST guide's introduction identifies three categories of higher degree research: Doctoral, MPhil, and Taught Master's, but provides a detailed, scored evaluation appendix only for the first two. No equivalent official appendix exists for taught Master's (MSc) programmes, and undergraduate (BSc) final year projects are not addressed in the guide at all.

For these two levels, rubric sub-criteria were derived by the researcher, informed by: the general structural expectations described in the guide's narrative sections; a departmental Computer Science Final Year Project outline document obtained separately, which specifies the expected chapter structure, technical deliverables (e.g. unit/integration/system testing, database design, tech-stack justification), and content depth appropriate to undergraduate work; and the seven-criterion structure of the official MPhil/PhD rubrics, applied at reduced technical depth appropriate to each level.

This is treated explicitly throughout the system, its documentation, and this thesis as a **methodological limitation, not an equivalent substitute** for an official rubric. Recent empirical work by Gursahaney et al. (2026) found substantial divergence between supervisor-derived criterion weights and the default weights used by an AI thesis-assessment system, indicating a real risk that a derived rubric's weightings may not reflect what supervisors in a given department actually prioritise. Confirming or correcting the MSc and undergraduate rubric weights with departmental supervisors is identified as a priority next step (Chapter 6).

### 3.3.3 Chapter-to-Criterion Mapping

Each sub-criterion is mapped to the thesis chapter(s) in which its supporting evidence is expected to appear (e.g. sub-criteria under "Critical Review of Literature & Frameworks" are mapped to the Literature Review chapter). This mapping serves two purposes: it allows the system's evidence-gathering stage (Section 3.4.6) to process the thesis chapter by chapter rather than criterion by criterion — a design choice discussed further in Section 3.5 — and it allows the frontend to present the supervisor with a chapter-based navigation structure, which better matches how a supervisor and student naturally think about a thesis document than an abstract list of rubric categories would.

## 3.4 Pipeline Architecture

The assessment pipeline comprises ten sequential stages, summarised in Table 3.1 and described individually below.

**Table 3.1: Pipeline stages, LLM call count, and function**

| Stage | Name | LLM Calls | Purpose |
| --- | --- | --- | --- |
| 1 | Structural Extraction | 0 | Deterministic chapter/table/figure/reference extraction |
| 2 | Rubric Loading | 0 | Load the active rubric for the submission's degree level |
| 3 | Preliminary Check | 1 | Deterministic compliance gate + LLM summary |
| 4 | Flow Analysis | 1 | Objective→method→result alignment mapping |
| 5 | Plagiarism Scan | 0 | n-gram/embedding similarity check |
| 6 | Evidence Gathering | ~5–8 | Per-chapter evidence extraction against mapped sub-criteria |
| 7 | Scoring | 1 | Calibrated mark assignment across all sub-criteria |
| 8 | Verification | ~5–8 | Independent audit of scores against evidence |
| 9 | Narrative Synthesis | 1 | Full report generation |
| 10 | Self-Check | 1 (+0–1 retry) | Automated quality audit of the synthesised report |

### 3.4.1 Stage 1: Structural Extraction

The uploaded document (.docx or .pdf) is parsed to extract its full text, which is then segmented into chapters using heading-detection patterns matched against the two structural options the KNUST guide permits — Monograph (Option 1) and Manuscript-based (Option 2). This stage also extracts tables, figures, and reference list entries, and performs a deterministic cross-check of each in-text citation against the reference list. No LLM call is made at this stage; all extraction is rule-based, which keeps this foundational step fast and fully reproducible.

### 3.4.2 Stage 2: Rubric Loading

The system queries its database for the set of active (non-deprecated) sub-criteria matching the submission's declared degree level. This ensures a Bachelor's submission is never scored against, for example, PhD-level mark allocations.

### 3.4.3 Stage 3: Preliminary Compliance Check

Before any content-based evaluation occurs, the system runs a set of deterministic checks against explicit, verifiable requirements drawn from the KNUST guide: minimum extractable text length, thesis word-count bounds by degree level, abstract length, presence of required front-matter sections, and presence of a minimum number of core chapters. A single LLM call then produces a short, supervisor-facing explanatory note summarising these findings — the model is explicitly instructed not to overturn the deterministic verdict, only to explain it in natural language. If a blocking requirement fails, the pipeline halts here rather than proceeding to score a document that is not structurally ready for evaluation — a design decision adapted directly from RubiSCoT's own preliminary assessment stage (Fröhlich & Schlippe, 2025).

### 3.4.4 Stage 4: Flow Analysis

A single LLM call analyses the thesis's Introduction, Methodology, and Results chapters together, extracting a structured table mapping each stated objective to its corresponding research question, method, and key result, and explicitly flagging any objective, research question, or declared scope item that lacks a corresponding entry elsewhere in the document. This directly operationalises a specific failure mode identified during early informal testing of this project (documented further in Chapter 4): a supervisor's real critique of a sample thesis identified a mismatch between the document's declared research scope and what was actually implemented and evaluated — a cross-chapter inconsistency that a per-criterion or per-chapter evaluation, taken alone, would not systematically catch.

### 3.4.5 Stage 5: Plagiarism Scan

The system performs a lightweight, non-commercial similarity check across four chapters (Introduction, Literature Review, Methodology, Discussion), combining n-gram (Jaccard) similarity against a small reference corpus and results retrieved from the OpenAlex scholarly API, sentence-embedding cosine similarity, and a cross-chapter self-repetition check. No LLM call is required for this stage. This is explicitly not a substitute for a commercial plagiarism-detection service such as Turnitin; it is scoped as a supplementary heuristic (see Section 3.7, Limitations of the Approach).

### 3.4.6 Stage 6: Evidence Gathering

For each chapter, one LLM call is made covering every sub-criterion mapped to that chapter. The model is instructed to locate direct, verbatim supporting quotations for each sub-criterion where evidence exists, and to produce a specific, named gap description (rather than generic filler language) where it does not. This stage is described in more detail, including its token-budgeting approach, in Section 3.5.

### 3.4.7 Stage 7: Scoring

A single LLM call receives all sub-criteria and all gathered evidence together, and is instructed to assign every sub-criterion a mark, calibrated relative to the others in the same pass, together with a justification naming specific technical terms or document content, and a confidence value (0–100) reflecting how directly the evidence supports the assigned mark. Performing all scoring in a single calibrated pass — rather than scoring each sub-criterion independently in isolation — was a deliberate design choice intended to reduce inconsistency between related scores (for instance, ensuring a sub-criterion scored generously is not contradicted by an unusually harsh score on a closely related sub-criterion elsewhere in the same document).

Critically, the **final aggregate percentage score is computed deterministically in code** — as the sum of assigned marks divided by the sum of maximum possible marks — rather than being generated as text by the language model. Likewise, the recommendation shown to the supervisor (e.g. "Pass (Conditional)") is derived from a fixed grade-band lookup table (Section 3.4.9), not generated by the LLM. This was a direct response to an early defect identified in testing, in which a document scoring 9% overall received an LLM-generated recommendation stating it was "acceptable in concept" — an internally inconsistent result caused by allowing the model to generate both the score and the recommendation as free text, independently of each other, in the same pass.

### 3.4.8 Stage 8: Verification

A second, independent LLM call — batched per chapter to control cost — is made for each sub-criterion scored in Stage 7. This model is explicitly instructed to audit, not re-score: given the assigned mark, its justification, and the evidence it was based on, the model determines whether the justification and evidence actually support the mark given, returning a boolean verdict and an explanatory note. Any sub-criterion flagged as unverified is surfaced distinctly to the supervisor, drawing attention to scoring decisions that may warrant closer manual review. This stage was added specifically to close a defect identified during development, in which an earlier version of the pipeline always reported verification as successful without performing any actual check — discussed further as part of the system's development history in Chapter 4.

### 3.4.9 Stage 9: Narrative Synthesis

A final LLM call synthesises all prior pipeline output — evidence, justifications, scores, compliance findings, and the flow-analysis table — into a single narrative report. The prompt for this stage specifies a required eight-section structure (Overall Assessment, Major Strengths, Major Corrections, Chapter-by-Chapter Critique, Technical and Methodological Comments, Formatting/Referencing Corrections, Priority Action Plan, and Final Recommendation), a requirement to address the candidate directly in the second person, and an explicit list of banned generic phrases. This structure and tone were derived directly from a real supervisor's written critique of a sample thesis obtained during this project (discussed further in Chapter 4), used as a target standard for depth and specificity that a generic AI-generated report should be held to.

The overall percentage score and grade band (computed deterministically in Stage 7, per the KNUST guide's grade bands: 70–100% Grade A, 60–69% Grade B, 55–59% Grade C, 50–54% Grade E [Referred], below 50% Grade F) are passed into this prompt as fixed facts, not left for the model to restate or recompute.

### 3.4.10 Stage 10: Self-Check

A final, lightweight LLM call audits the synthesised report itself for four specific defect patterns: near-duplicate chapter critiques, an overall score stated without a supporting mark breakdown, unverified claims of formatting compliance, and generic filler language. If any defect is detected, Stage 9 is re-run once. This is a deliberately narrow, checklist-style check rather than a general quality judgment, intended to catch the specific failure patterns observed during this project's own testing (Chapter 4) rather than to serve as a general-purpose quality gate.

## 3.5 Design Decision: Full-Context Prompting Instead of Retrieval-Augmented Generation

An early design assumption for this system, informed by RubiSCoT's own use of retrieval-augmented generation (RAG) (Fröhlich & Schlippe, 2025), was that evidence-gathering should retrieve the most relevant excerpt of a thesis chapter via embedding similarity search, rather than processing the chapter's full text directly. The system's database schema retains support for this approach: `rubric_criteria` and `rubric_sub_criteria` each include a vector embedding column, and a `graded_examples` table supports storing human-graded excerpts with their own embeddings for few-shot retrieval.

In practice, this study's implementation instead uses full-context prompting: each chapter's complete text is passed directly to the evidence-gathering LLM call, without a retrieval step selecting a subset of it. This decision was made for a concrete technical reason rather than as an oversight: the LLM used for this stage has a context window of 131,072 tokens, and a token-budget calculation — accounting for prompt instructions, the rubric sub-criteria being evaluated, and reserved output tokens — leaves approximately 123,000 tokens available for chapter text in a single call. Given that individual thesis chapters, even in a substantial PhD-length document, typically fall well within this budget (Section 4.3 quantifies this directly), retrieval offers no practical benefit at this document scale: it introduces a risk of the retrieval step failing to surface the most relevant passage, without solving a context limitation that does not, in practice, arise. A fallback chunking mechanism is implemented for the rare case where a single chapter's text does exceed this budget (for example, an unusually long manuscript-style chapter), splitting the chapter into sequential segments and merging the resulting evidence rather than truncating and silently discarding content.

This is documented explicitly as a deliberate scope decision: the system's embedding infrastructure remains in place and unused, representing a concrete direction for future work should the system need to scale to substantially larger documents, a much larger bank of graded examples for few-shot retrieval, or degree levels/institutions with longer chapter conventions than KNUST's own word-count bounds specify (Chapter 6).

## 3.6 Iterative Development Process

Consistent with the Design Science Research approach adopted for this study, the pipeline was not implemented once and evaluated; it was refined across multiple cycles in direct response to specific defects identified through testing against real and sample thesis documents. Three defects identified during this process materially changed the system's architecture and are documented here as part of the methodology, since each resulted in a specific design decision described above:

1. An initial single-pass design produced a scored recommendation inconsistent with its own numeric score (Section 3.4.7), leading to the decision to compute scores and recommendations deterministically rather than generate them as LLM output.


2. An initial verification stage was found, on inspection, to always report success without performing any actual check, leading to the implementation of a genuine, evidence-based verification pass (Section 3.4.8).


3. An initial evidence-gathering implementation truncated each chapter's text to a fixed character limit, silently discarding the majority of content in longer chapters, leading to the token-budgeted, full-context approach described in Section 3.5.



This iterative process, and the specific test outputs that revealed each defect, are documented in full in Chapter 4.

## 3.7 Limitations of the Methodological Approach

Three limitations specific to the methodology described in this chapter are acknowledged directly, in addition to the rubric-derivation limitation discussed in Section 3.3.2:

* The plagiarism-detection component (Stage 5) is a supplementary similarity heuristic, not a commercial-grade plagiarism detection service, and should not be represented to end users as equivalent to one.


* The system's authentication and authorisation model assumes a single trusted supervisor-user context; multi-tenant access control was outside the scope of this project.


* Evaluation of scoring agreement against real human-supervisor judgment (Chapter 5) is constrained by the limited number of independently graded exemplar theses available during this project; this is addressed directly as a scoped limitation rather than an unacknowledged gap.





# CHAPTER FOUR: SYSTEM DESIGN, IMPLEMENTATION AND EVALUATION

## 4.1 Development Environment and Tools

The system was implemented using an agentic development environment (Google Antigravity) in which the researcher directed an AI coding agent through explicit, scoped implementation and fix instructions, reviewing and verifying the agent's output at each stage rather than accepting generated code without inspection. This development approach is documented here as part of the implementation methodology, since several of the defects discussed in Section 4.4 were identified specifically through this review process, and their resolution is itself part of the evidence presented in this chapter.

The backend uses FastAPI (Python ≥ 3.11) with an asynchronous SQLAlchemy 2 ORM, backed by PostgreSQL 15 with the pgvector extension (SQLite is used as a local development fallback). The frontend is a React 19 single-page application built with Vite, using Zustand for state management and TailwindCSS for styling. Language model calls are made primarily to Groq's hosted `openai/gpt-oss-120b` and `openai/gpt-oss-20b` models, chosen for a combination of low per-call latency and cost, which matters directly given the pipeline's call volume (Section 4.3). Narrative synthesis (Section 3.4.9) preferentially routes to a stronger proprietary model via a routing proxy, falling back to the Groq model if unavailable. The full dependency list is provided in Appendix B.

## 4.2 Database Implementation

The two-level rubric hierarchy described in Section 3.3 (`rubric_criteria`, `rubric_sub_criteria`) and its chapter mapping (`chapter_sub_criteria_map`) were implemented as designed. Table 4.1 summarises the rubric data actually seeded for each degree level at implementation time, and Table 4.2 presents the complete set of database tables implemented for the system.

**Table 4.1: Seeded rubric data by degree level**

| Degree Level | Source | Criteria | Sub-Criteria | Total Marks |
| --- | --- | --- | --- | --- |
| MPhil | KNUST HDR Guide 2016, Appendix 4.4 | 7 | 20 | 100.0 |
| PhD | KNUST HDR Guide 2016, Appendix 4.2 | 7 | 20 | 100.0 |
| MSc | Derived (Section 3.3.2) | 7 | 17 | 100.0 |
| Undergraduate | Derived (Section 3.3.2) | 7 | 16 | 100.0 |

**Table 4.2: Database tables**

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `users` | Registered supervisor/student accounts (name, email, hashed password, role) | Referenced informally by `thesis_submissions.lecturer_id` |
| `rubric_criteria` | Top-level marking criteria per degree level (e.g. "Critical Review of Literature," 25 marks) | Parent of `rubric_sub_criteria` |
| `rubric_sub_criteria` | Individually scored components (e.g. "Citation quality," 5 marks), with low/mid/high performance descriptors and a target chapter | Child of `rubric_criteria`; parent of `assessment_results`, `graded_examples`, `chapter_sub_criteria_map` |
| `chapter_sub_criteria_map` | Maps each sub-criterion to the thesis chapter(s) its evidence is expected to appear in | Links `rubric_sub_criteria` to chapter names |
| `graded_examples` | Human-graded exemplar excerpts per sub-criterion, for future few-shot retrieval (Section 3.5) | Child of `rubric_sub_criteria` |
| `thesis_submissions` | One row per uploaded thesis: metadata, extracted text, pipeline status/progress, computed score, narrative report | Parent of `assessment_results`, `plagiarism_checks` |
| `assessment_results` | One row per sub-criterion scored for a submission: AI score, justification, cited evidence, confidence, verification result, supervisor override | Child of `thesis_submissions` and `rubric_sub_criteria` |
| `plagiarism_checks` | Per-chapter similarity scan results | Child of `thesis_submissions` |

Figure 4.1 (see Appendix A) illustrates the entity-relationship structure linking these tables. The rubric tables (`rubric_criteria`, `rubric_sub_criteria`) are deliberately independent of any specific submission, allowing the same rubric definitions to be reused across every thesis assessed at a given degree level, while `assessment_results` links a specific submission to the specific sub-criteria it was scored against.

## 4.3 Pipeline Call Volume

A full assessment run makes between approximately 15 and 25 language model calls (typically 17–20), summarised in Table 4.3. This reflects the addition of a genuine verification pass (Section 4.4.2) during development, which increased call volume relative to an earlier version of the pipeline in exchange for eliminating a stubbed, non-functional verification step.

**Table 4.3: LLM call volume per full assessment run**

| Stage | Calls | Notes |
| --- | --- | --- |
| Preliminary check | 1 | Fixed cost |
| Flow analysis | 1 | Fixed cost |
| Evidence gathering | ~5–8 | One per chapter target group |
| Scoring | 1 | Fixed cost |
| Verification | ~5–8 | One per chapter target group |
| Narrative synthesis | 1 (+0–1 retry) | Retried once if self-check fails |
| Self-check | 1 | Fixed cost |

Regarding chapter length and the full-context design decision discussed in Section 3.5: across the sample theses used during testing, no chapter's text exceeded the ~123,000-token budget available for evidence gathering, and the fallback chunking mechanism was accordingly not exercised during this project's testing. This is noted directly as a limitation of the present evaluation: the fallback path's correctness is verified by inspection of its implementation, but has not been exercised against a genuinely oversized chapter in practice.

## 4.4 Illustrative Defects Identified and Resolved During Development

Consistent with the iterative development process described in Section 3.6, this section presents specific, illustrative before/after evidence for three defects identified through direct inspection of the system's own output during development. These are presented as implementation findings in their own right, since each directly demonstrates a specific failure mode of naive LLM-based grading discussed in Chapter 2, and each led directly to an architectural decision described in Chapter 3.

### 4.4.1 Score–Recommendation Inconsistency

An early version of the pipeline generated both the numeric score and the supervisor-facing recommendation as independent LLM text output within the same synthesis call. Testing surfaced a submission scored 9.0 out of 100 (Grade F) for which the generated recommendation read: *"Acceptable in concept, but corrections are required before final submission."* This is directly self-contradictory: a 9% score corresponds to KNUST's Grade F ("Fail," Section 3.4.9), yet the accompanying text implied a materially higher standard had been met.

Following the architectural change described in Section 3.4.7 — computing the aggregate score deterministically and deriving the recommendation from a fixed grade-band lookup rather than generating either as free text — a retest of the same class of submission produced a recommendation correctly reading *"Unacceptable (Fail) — Serious structural, theoretical, or empirical deficiencies requiring major rework"* for a comparably low-scoring submission (19.5/100). This defect cannot recur under the revised architecture, since the recommendation is no longer independently generated text; it is directly computed from the same score value shown to the supervisor.

A related defect observed during the same testing phase was an inconsistent score denominator between two otherwise comparable submissions at the same degree level (13.5 out of a stated 100.0 total marks in one run, versus 39.0 out of a stated 89.5 in another) — indicating that not all sub-criteria were being successfully scored and included in the aggregate in every run. This is addressed by the same architectural change: since the denominator is now computed as the sum of `max_marks` across only the sub-criteria that were actually and successfully scored, any sub-criterion that fails to score is now excluded from both the numerator and denominator consistently, rather than silently producing a mismatched total.

### 4.4.2 Non-Functional Verification Stage

Inspection of an early implementation's verification stage (Section 3.4.8) revealed that it returned a fixed result — `verified: true`, with the static note *"Verified via whole-document evidence pass"* — for every sub-criterion, regardless of input, without making any language model call. This meant the system's Verification & Consistency Check interface presented an appearance of independent auditing that was not actually occurring.

This was resolved by implementing a genuine, evidence-based verification call (Section 3.4.8), batched per chapter to limit the resulting increase in call volume (Section 4.3). Following this change, verification results began to reflect real variation — for example, correctly flagging a sub-criterion where an assigned score of 9.0 out of 10 was found to be inconsistent with a justification describing only partial, sample-size-limited evidence. This defect and its resolution are presented here as a concrete illustration of a broader point discussed in Chapter 6: an AI-assisted system that presents an unearned appearance of rigour is a more serious defect than one that is honestly incomplete, since the former risks being trusted inappropriately by a supervisor who has not inspected its internals.

### 4.4.3 Evidence Truncation in Long Chapters

An early implementation of the evidence-gathering stage (Section 3.4.6) truncated each chapter's text to its first 8,000 characters (approximately 1,600–2,000 tokens) before evaluation, and the related flow-analysis stage truncated its chapter excerpts to 1,800 characters each. Given the model's 131,072-token context window, this truncation discarded the substantial majority of content in any chapter longer than a few short paragraphs — meaning sub-criteria were, in effect, being scored against only the opening lines of a chapter, not its full content.

This was resolved by the token-budgeted, full-context approach described in Section 3.5, raising the effective per-call text budget to approximately 123,000 tokens (evidence gathering) and 126,000 tokens (flow analysis), with a fallback chunking mechanism for the rare case where a single chapter's text still exceeds this budget. This change is presented as implementation evidence for the broader methodological point made in Section 3.5: retrieval-based context reduction (RAG) was not necessary to solve this problem, since the actual constraint was an unnecessarily conservative fixed truncation limit rather than a genuine context-window shortage.

## 4.5 Evaluation Approach and Scope

This section evaluates the system against the three research questions set out in Chapter 1. It is important to state directly, at the outset, what kind of evaluation this chapter does and does not contain, since the original evaluation plan (Chapter 1, Objective 5) anticipated a quantitative comparison — using an inter-rater agreement statistic such as Quadratic Weighted Kappa (QWK) — between the system's scores and real human-supervisor scores across a sample of theses, alongside a comparison against a naive, single-prompt LLM baseline.

**Neither of these quantitative comparisons was carried out**, for reasons addressed directly in Section 4.8, and this section does not present fabricated or approximated statistics in their place. Instead, this section presents the evaluation evidence that was genuinely available within the scope and timeframe of this project: a structured qualitative comparison between the system's synthesised narrative output and a real supervisor's written critique of a sample thesis, tracked across successive rounds of system revision, together with the defect-driven evidence already presented earlier in this chapter. Where a research question cannot be answered with the evidence available, this is stated plainly rather than implied to be resolved.

## 4.6 Evaluation Method: Comparison Against a Human-Supervisor Target

A single real, human-written critique — a supervisor's assessment of a sample MSc thesis, obtained during this project — was used throughout development as a **target standard** for the depth, structure, and tone the system's synthesised narrative report should aim to match. This document was not used as a scored ground-truth for statistical comparison (a single example cannot support that), but as a qualitative benchmark: a real instance of the kind of output the system aims to approximate.

The system's own output was compared against this target document across three successive stages of development, corresponding to defect fixes described in Section 4.4. Table 4.4 summarises this comparison across the dimensions on which meaningful differences were observed.

**Table 4.4: Qualitative comparison against the human-supervisor target document**

| Dimension | Target document | Early system output | Output after revision |
| --- | --- | --- | --- |
| Address / tone | Direct second-person ("Dear Elvis, I have reviewed...") | Third-person, clinical ("The candidate, Mahfuz, has submitted...") | Direct second-person, matching target ("Dear Mahfuz, I have examined...") |
| Report structure | 8 sections including a closing personal note to the candidate | Missing the closing section entirely | 8 sections present, including closing note, matching target structure |
| Strengths presentation | Judgment stated first, evidence used to support it | Evidence quoted, with the judgment largely restated from the quote | Improved: judgment-first framing present, though still somewhat more evidence-dependent than the target |
| Formatting/language critique | Specific, document-level observations (e.g. identifying and naming the thesis's own spelling convention) | Generic presence/absence checks only | Improved specificity (names actual technical terms used) but does not yet identify document-wide conventions the way the target does |
| Internal consistency (score vs. recommendation) | N/A (human-written, inherently consistent) | Inconsistent in early testing (Section 4.4.1) | Resolved — recommendation is now derived deterministically from the score |

This comparison provides direct evidence relevant to Research Question 2 (Chapter 1): the system's output can be brought substantially closer to the structure, tone, and internal consistency of a real supervisor's critique through targeted, defect-driven revision. It does not, however, demonstrate equivalence — the formatting/language critique dimension in particular remains a demonstrated gap (Section 4.7), and the strengths dimension shows partial rather than complete improvement.

## 4.7 Remaining Gaps Identified Through This Comparison

Two gaps identified through the comparison in Table 4.4 were not fully resolved within the scope of this project and are carried forward as limitations rather than treated as closed:

* **Document-wide convention detection:** The target document identifies and enforces a specific spelling convention (British English, evidenced by the target document author's use of words such as "behaviour" and "organisations") already present in the thesis under review, rather than simply checking whether individual technical terms are spelled correctly in isolation. The system's formatting/language check, even after revision, performs the latter but not the former. This is a specific, identified direction for the Formatting stage's prompt design.


* **Evidence-to-judgment ratio in the Strengths section:** While the system's strengths statements now generally lead with a labelled judgment rather than a bare quotation, they remain more tightly coupled to individual cited excerpts than the target document's fuller, synthesis-style strengths statements, which draw more freely across the whole document.



## 4.8 Why a Quantitative Comparison Was Not Conducted

Research Question 1 (whether decomposed, evidence-grounded scoring produces measurably more consistent and rubric-aligned scoring than a single-prompt baseline) requires either: (a) a controlled comparison between the system's decomposed pipeline and a naive single-prompt baseline scoring the same set of theses, or (b) a comparison of the system's scores against real, independently-assigned human scores across a sufficient sample to compute a meaningful agreement statistic such as QWK.

Neither was feasible within this project for a specific, identifiable reason: **only one independently human-graded thesis critique was available throughout this project** (the target document used for the qualitative comparison in Section 4.6). A sample size of one cannot support a statistical agreement measure, nor a statistically meaningful baseline comparison — both approaches require, at minimum, a modest set of independently graded theses (a rough working minimum of 10–15 is suggested in Chapter 5) to produce results that would be more informative than misleading.

This is stated here as a direct, acknowledged limitation of the evaluation conducted, rather than as a gap glossed over. The qualitative comparison in Section 4.6, together with the defect-driven implementation evidence earlier in this chapter, is offered as the evidence genuinely available, not as a substitute for the quantitative evaluation that Research Question 1 properly requires. Obtaining sufficient graded exemplar data to conduct this comparison is identified as the single highest-priority item for future work (Chapter 5).

## 4.9 Answering the Research Questions

**RQ1 (Does decomposition improve scoring consistency?)** Cannot be answered quantitatively with the evidence available (Section 4.8). Indirect supporting evidence exists: the specific inconsistency observed under a more monolithic early scoring/recommendation design (Section 4.4.1) was structurally eliminated by decomposing score computation and recommendation derivation into separate, deterministic steps rather than a single generative step. This demonstrates that decomposition can eliminate a specific, observed class of inconsistency, but does not establish a general quantitative improvement across scoring as a whole.

**RQ2 (Can synthesized narrative output approach a real supervisor's critique?)** Substantially, though not completely — Section 4.6 demonstrates measurable improvement across tone, structure, and internal consistency, with two specific, named gaps (Section 4.7) remaining.

**RQ3 (What are the practical limitations of building this within an undergraduate FYP's constraints?)** Addressed throughout this thesis directly: derived (non-official) rubrics for two of four supported degree levels (Section 3.3.2); a non-commercial plagiarism-detection approach (Section 3.4.5); a single-supervisor authentication model (Section 3.7); and, most centrally to this chapter, an evaluation constrained to qualitative comparison due to limited access to independently graded exemplar theses (Section 4.8). Chapter 5 discusses how each of these constraints could be addressed given more time, data, or institutional access.

## 4.10 Known Implementation Limitations

Consistent with the principle of honest limitation-reporting established in Chapter 1, the following implementation-level limitations are documented directly rather than omitted:

* **Dual-run score consistency checking** (a second, independent scoring pass per sub-criterion, intended to flag unstable scores by comparing two runs) is represented in the database schema (`ai_score_run_1`, `ai_score_run_2`, `score_consistency_flag`) but is not implemented in the current pipeline; the single-pass calibrated scoring approach described in Section 3.4.7, combined with the independent verification stage (Section 3.4.8), was adopted instead as a less costly alternative approach to the same underlying reliability concern.


* The plagiarism-check provider field was found, on inspection, to default to a value ("copyleaks") inconsistent with the similarity engine actually implemented ("openalex_vector_ngram"); this was corrected to accurately reflect the actual implementation.


* Authentication was found, during development, to silently substitute a demo user when no valid credential was presented, rather than rejecting the request; this was identified as a genuine security concern for a system handling academic assessment data and was corrected to enforce proper rejection of unauthenticated and improperly-authorised requests.


* Several database columns and an embedding-based retrieval code path (Section 3.5) remain present in the schema but unused by the active pipeline; these are documented in Appendix A rather than removed, since they represent legitimate scaffolding for the future-work directions discussed in Chapter 5, not accidental dead code introduced without awareness.





# CHAPTER FIVE: SUMMARY, CONCLUSION AND RECOMMENDATIONS

## 5.1 Summary of the Study

This study set out to address a specific, documented problem: single-prompt large language model grading of academic theses is unreliable, prone to hallucinated justification, and prone to defaulting to generic standards rather than an institution's actual marking rubric. In response, this study designed, implemented, and evaluated a ten-stage, evidence-grounded assessment pipeline, formalising KNUST's own published thesis evaluation rubric (for MPhil and PhD levels) directly into the system's scoring logic, and deriving comparable rubrics for the Undergraduate and MSc levels not covered by an official institutional document.

The resulting system decomposes assessment into discrete stages — structural compliance checking, cross-chapter flow analysis, per-chapter evidence gathering, calibrated scoring, independent verification, and narrative synthesis — rather than performing assessment in a single generative step. Three specific defects identified during development (an internally inconsistent score-recommendation pairing, a non-functional verification stage, and severe, undisclosed truncation of chapter content) were documented and resolved, each directly demonstrating a concrete failure mode of naive LLM grading and the specific architectural response that addressed it.

## 5.2 Achievements and Contributions

This study makes the following specific contributions:

1. A working, evidence-grounded thesis assessment system, formalising a real institutional rubric (KNUST's HDR Guide, 2016) into machine-readable form across four degree levels.


2. Documented, evidence-based demonstration of three specific LLM-grading failure modes — score-recommendation inconsistency, unearned appearance of verification, and severe undisclosed context truncation — and the architectural interventions that resolved each, contributing concrete evidence to a literature that has more often discussed such risks theoretically than demonstrated them directly against a real implementation.


3. A qualitative demonstration that a synthesised narrative report can be brought substantially closer, through targeted revision, to the structure, tone, and internal consistency of a real human supervisor's critique — while honestly identifying the specific dimensions on which a measurable gap remains.


4. A worked example of applying a full-context (rather than retrieval-augmented) prompting strategy to thesis-length documents, with an explicit token-budget justification for why retrieval was not necessary at this document scale.



## 5.3 Concluding Remarks

This study has demonstrated that the specific, well-documented reliability problems of LLM-based academic grading are not merely theoretical concerns: they were directly observed in this system's own early output, and each was addressed through a specific, identifiable architectural response rather than through general prompt refinement alone. The resulting system represents a genuine improvement over a naive single-prompt approach on the specific failure modes examined, while honestly falling short of, and identifying precisely where it falls short of, both a fully rigorous statistical evaluation and complete parity with expert human judgment.

This honesty about scope and limitation is presented as a deliberate methodological position, not a deficiency to be apologised for: an academic assessment tool that overstates its own reliability poses a greater risk than one that clearly documents what it can and cannot yet be trusted to do. The recommendations in Section 5.4 provide a concrete path by which the specific limitations identified in this study could be addressed with additional time, data, and institutional collaboration beyond the scope of a single final year project.

## 5.4 Recommendations for Future Work

The following are identified as the most direct extensions of this work, in priority order:

1. **Quantitative evaluation against a larger set of independently graded theses:** As discussed in Chapter 4, this study's evaluation was constrained by access to only one independently human-graded exemplar. Obtaining a working minimum of approximately 10–15 independently graded theses would allow a meaningful inter-rater agreement analysis (for example, Quadratic Weighted Kappa) between the system's scores and human scores, and would allow a genuine controlled comparison against a naive single-prompt baseline — directly answering Research Question 1 in a way this study's available data could not.


2. **Confirmation or correction of the derived MSc and Undergraduate rubrics:** The rubric weights used for these two degree levels were derived by the researcher in the absence of an official KNUST document (Section 3.3.2); departmental supervisors should review and confirm, or correct, these weightings before the system is used in any real assessment context beyond this study.


3. **Closing the two identified narrative-quality gaps:** Document-wide spelling/style convention detection and a more fully synthesis-driven (rather than quote-dependent) approach to strengths reporting were both identified in Chapter 4 as measurable, specific gaps against the target standard, and represent concrete, scoped next steps for prompt design rather than open-ended research questions.


4. **Activating the system's existing but unused retrieval infrastructure** for a specific future use case: as the bank of graded exemplar excerpts grows (Recommendation 1, above), embedding-based retrieval of the most relevant few-shot examples for a given sub-criterion becomes increasingly valuable in a way it was not at this study's current scale (Section 3.5).


5. **Integrating a commercial-grade plagiarism detection service** in place of, or alongside, the current lightweight similarity heuristic, should the system be adopted for use beyond a research prototype context.


6. **Extending authentication and authorisation** beyond the current single-trusted-supervisor model, should the system need to support multiple supervisors or departments concurrently.





# REFERENCES

Fröhlich, T. and Schlippe, T. (2025) 'RubiSCoT: A Framework for AI-Supported Academic Assessment', in Proceedings of the 6th International Conference on Artificial Intelligence in Education Technology (AIET 2025), Munich, Germany, 29-31 July 2025. Available at: [https://arxiv.org/abs/2510.17309](https://arxiv.org/abs/2510.17309) (Accessed: 31 August 2026).

Gursahaney, G.V., Idrisov, B., Fröhlich, T. and Schlippe, T. (2026) 'AI-Based Thesis Assessment: An Empirical Study of Human Evaluation Priorities and Their Impact on Automated Assessment', in Proceedings of the 7th International Conference on Artificial Intelligence in Education Technology (AIET 2026), Zagreb, Croatia. Available at: [https://arxiv.org/abs/2608.00717](https://arxiv.org/abs/2608.00717) (Accessed: 31 August 2026).

Kwame Nkrumah University of Science and Technology, School of Graduate Studies (2016) Guide for Preparation and Evaluation of Higher Degree Research Thesis. Kumasi: KNUST.

Murff, M.J. (2025) AI-Enabled Innovations in Automated Essay Scoring and Feedback Systems. PhD dissertation. Brigham Young University. Available at: [https://scholarsarchive.byu.edu/etd/10933](https://scholarsarchive.byu.edu/etd/10933) (Accessed: 31 August 2026).

Saez, Y., Garcia, L.M., Mochon, A. and Isasi, P. (2026) 'Evaluating large language models for AI-assisted grading: a framework and case study in higher education', Scientific Reports, 16, Article 18035. Available at: [https://doi.org/10.1038/s41598-026-48656-3](https://doi.org/10.1038/s41598-026-48656-3) (Accessed: 31 August 2026).
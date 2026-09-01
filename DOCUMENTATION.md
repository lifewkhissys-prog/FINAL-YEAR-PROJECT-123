# Evidence-Based Thesis Assessor — Technical Documentation

> **Purpose of this document.** This file is the authoritative technical reference for the
> Evidence-Based Thesis Assessor system. It is written for an academic audience (e.g. a
> thesis writer documenting the system) and covers every layer of the codebase as it
> actually exists — not a design spec or summary, but the real implementation detail.
>
> **Source of truth:** Every statement below was derived from the source files in this
> repository as of August 2026.

---

## 1. Project Overview

### 1.1 What the System Does

The Evidence-Based Thesis Assessor is a web application that allows academic supervisors
(lecturers) to upload a postgraduate or undergraduate thesis document (.docx or .pdf),
run an automated multi-stage AI assessment pipeline against a structured rubric, receive
per-sub-criterion scores with cited textual evidence, and obtain a synthesized narrative
assessment report that the supervisor can edit, approve, and export as a Word (.docx) file.

The system is purpose-built for **Kwame Nkrumah University of Science and Technology
(KNUST)** and implements the grading scale, rubric structure, and compliance checks
defined in the *KNUST Guide for Preparation and Evaluation of Higher Degree Research
Thesis (June 2016)*.

### 1.2 Overall Architecture

| Layer | Technology | Details |
|---|---|---|
| **Backend framework** | FastAPI (Python ≥ 3.11) | Async, ASGI server via Uvicorn |
| **Frontend framework** | React 19 + Vite 8 | Single-page application, TailwindCSS styling |
| **Database** | PostgreSQL 15 (with pgvector extension) or SQLite (dev fallback) | Async via SQLAlchemy 2 + asyncpg / aiosqlite |
| **ORM** | SQLAlchemy 2 (async, mapped columns) | Declarative models with `Mapped` type annotations |
| **State management** | Zustand 5 | Frontend global auth state |
| **LLM API (scoring/evidence/flow)** | Groq API (OpenAI-compatible) | Models: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.6-27b` (fallback chain) |
| **LLM API (narrative synthesis)** | AgentRouter proxy → Groq fallback | Models: `claude-opus-5`, `claude-opus-4-8`, `gpt-5`, `anthropic/claude-sonnet-5` via AgentRouter; `openai/gpt-oss-120b` via Groq fallback |
| **Vision API** | Groq Vision (for PDF figure analysis) | Models: `openai/gpt-oss-120b`, `openai/gpt-oss-20b` |
| **Plagiarism check** | OpenAlex REST API + local n-gram/vector engine | No third-party plagiarism API (e.g. Turnitin, Copyleaks) is used |
| **Embedding model** | BAAI/bge-small-en-v1.5 (384-dim) | Via `sentence-transformers` or `fastembed` (ONNX); hash-vector fallback |
| **File storage** | Local filesystem + optional Cloudinary | Uploads saved to `uploads/` dir; optionally mirrored to Cloudinary |
| **Authentication** | JWT (HS256) via `python-jose` | Tokens stored in `localStorage` on frontend |
| **Containerization** | Docker Compose | PostgreSQL 15 (pgvector), Redis 7, FastAPI backend |
| **Redis** | Listed in docker-compose, `redis` in dependencies | **Not actively used** in any service code (see §7) |

---

## 2. Database Schema

All models are defined in `app/models/thesis_critique.py` and `app/models/user.py`.
Schema creation happens via `Base.metadata.create_all` at startup, with column additions
handled by `app/migrations.py`.

### 2.1 Table: `users`

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `name` | `String(255)` NOT NULL | User's display name |
| `email` | `String(255)` UNIQUE NOT NULL, INDEXED | Login email |
| `password_hash` | `String(255)` NOT NULL | bcrypt-hashed password |
| `role` | `Enum('student', 'lecturer')` NOT NULL | User role; only `lecturer` can access the assessor |
| `created_at` | `DateTime(tz)` server default `now()` | Registration timestamp |

### 2.2 Table: `rubric_criteria`

Top-level assessment criteria (e.g. "1. Statement of Problem & Justification").

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `degree_level` | `String(50)` default `"mphil"` | One of: `undergraduate`, `msc`, `mphil`, `phd` |
| `assessment_type` | `String(20)` default `"thesis"` | Currently always `"thesis"`; `"oral"` is defined but unused |
| `name` | `String(255)` NOT NULL | Criterion name (e.g. "3. Research Design & Methodology") |
| `description` | `Text` NOT NULL | Auto-generated: "Evaluation of {name} for {LEVEL} degree level." |
| `max_marks` | `Float` NOT NULL | Sum of child sub-criteria marks (e.g. 25.0) |
| `source` | `String(255)` nullable | Rubric provenance (e.g. "KNUST HDR Guide 2016, Appendix 4.4") |
| `deprecated_at` | `DateTime(tz)` nullable | Soft-delete timestamp; non-null rows are excluded from active rubrics |
| `embedding` | `Vector(384)` / `JSON` nullable | pgvector column for semantic search (not actively queried) |
| `created_at` | `DateTime(tz)` server default `now()` | Row creation timestamp |

**Relationships:** `sub_criteria` → `RubricSubCriterion` (one-to-many, cascade delete)

### 2.3 Table: `rubric_sub_criteria`

Individual assessable items under each criterion.

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `criterion_id` | `Integer` FK → `rubric_criteria.id` ON DELETE CASCADE | Parent criterion |
| `name` | `String(255)` NOT NULL | Sub-criterion name (e.g. "Sampling procedures (size, frame, technique, justification)") |
| `description` | `Text` NOT NULL | Auto-generated: "{name} under {criterion_name}" |
| `max_marks` | `Float` NOT NULL | Maximum possible marks for this sub-criterion |
| `level_low_desc` | `Text` NOT NULL | Rubric descriptor for low performance (0–30%) |
| `level_mid_desc` | `Text` NOT NULL | Rubric descriptor for mid performance (40–60%) |
| `level_high_desc` | `Text` NOT NULL | Rubric descriptor for high performance (70–100%) |
| `chapter_target` | `String(100)` nullable | Which chapter this sub-criterion evaluates (e.g. `"literature_review"`, `"document-wide"`) |
| `deprecated_at` | `DateTime(tz)` nullable | Soft-delete for rubric versioning |
| `embedding` | `Vector(384)` / `JSON` nullable | pgvector column (not actively queried in pipeline) |
| `created_at` | `DateTime(tz)` server default `now()` | Row creation timestamp |

**Relationships:**
- `criterion` → `RubricCriterion` (many-to-one)
- `graded_examples` → `GradedExample` (one-to-many, cascade delete)
- `assessment_results` → `AssessmentResult` (one-to-many)
- `chapter_mappings` → `ChapterSubCriteriaMap` (one-to-many, cascade delete)

### 2.4 Table: `chapter_sub_criteria_map`

Maps which thesis chapters each sub-criterion should be evaluated against.

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `chapter_name` | `String(100)` NOT NULL | One of: `introduction`, `literature_review`, `methodology`, `data_analysis`, `results`, `discussion`, `conclusion`, `references` |
| `sub_criterion_id` | `Integer` FK → `rubric_sub_criteria.id` ON DELETE CASCADE | Which sub-criterion this mapping is for |
| `is_primary` | `Boolean` default `True` | Whether this is the primary chapter for this sub-criterion |

### 2.5 Table: `graded_examples`

Human-graded exemplar excerpts for few-shot learning (scorer retrieval).

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `sub_criterion_id` | `Integer` FK → `rubric_sub_criteria.id` ON DELETE CASCADE | Which sub-criterion this example grades |
| `excerpt` | `Text` NOT NULL | The example thesis text excerpt |
| `assigned_score` | `Float` NOT NULL | The human-assigned score |
| `justification` | `Text` nullable | Why this score was assigned |
| `embedding` | `Vector(384)` / `JSON` nullable | Embedding of the excerpt for retrieval |
| `created_at` | `DateTime(tz)` server default `now()` | Row creation timestamp |

### 2.6 Table: `thesis_submissions`

Each uploaded thesis and its assessment state.

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `lecturer_id` | `Integer` nullable | The ID of the lecturer who uploaded it (not a formal FK) |
| `student_name` | `String(255)` nullable | Auto-extracted or user-supplied candidate name |
| `index_number` | `String(100)` nullable | Auto-extracted or user-supplied student ID |
| `title` | `String(500)` nullable | Thesis title |
| `programme` | `String(255)` nullable | Academic programme (e.g. "Computer Science") |
| `institution` | `String(255)` nullable | Defaults to "KNUST" |
| `degree_level` | `String(50)` default `"mphil"` | One of: `undergraduate`, `msc`, `mphil`, `phd` |
| `file_path` | `String(500)` nullable | Local filesystem path to uploaded file |
| `cloudinary_url` | `String(500)` nullable | Cloudinary CDN URL (if configured) |
| `full_text` | `Text` NOT NULL | Complete extracted plaintext of the thesis |
| `preliminary_check_passed` | `Boolean` nullable | Whether the compliance gate passed |
| `preliminary_check_notes` | `Text` nullable | LLM-generated summary of compliance findings |
| `compliance_findings` | `JSON` nullable | Structured list of mechanical compliance check results |
| `structure_option` | `String(20)` nullable | `"monograph"` (Guide Option 1) or `"manuscript"` (Option 2) |
| `chapter_structure` | `String(30)` nullable | `"five_chapter"` (Results & Discussion merged) or `"six_chapter"` (separate Results and Discussion) |
| `error_detail` | `Text` nullable | Error message if pipeline failed |
| `flow_analysis_table` | `Text` nullable | Markdown table of objectives → methods → results alignment |
| `plagiarism_score` | `Float` nullable | Overall plagiarism similarity percentage |
| `plagiarism_report_url` | `String(500)` nullable | **Not populated** — column exists but is never written to |
| `plagiarism_checked_at` | `DateTime(tz)` nullable | When plagiarism scan ran |
| `narrative_report` | `Text` nullable | AI-generated full narrative assessment report (Markdown) |
| `narrative_report_edited` | `Text` nullable | Supervisor's edited version of the narrative report |
| `supervisor_recommendation` | `Text` nullable | Score-derived recommendation (e.g. "Pass (Conditional)") |
| `submitted_at` | `DateTime(tz)` server default `now()` | Upload timestamp |
| `status` | `String(50)` default `"pending"` | One of: `pending`, `preliminary_check_failed`, `assessing`, `failed`, `completed`, `reviewed` |
| `pipeline_step` | `String(255)` nullable | Current pipeline stage name for progress tracking |
| `pipeline_progress` | `Integer` nullable | 0–100 progress percentage |

**Relationships:**
- `assessment_results` → `AssessmentResult` (one-to-many, cascade delete)
- `plagiarism_checks` → `PlagiarismCheck` (one-to-many, cascade delete)

### 2.7 Table: `assessment_results`

One row per sub-criterion per submission.

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `submission_id` | `Integer` FK → `thesis_submissions.id` ON DELETE CASCADE | Parent submission |
| `sub_criterion_id` | `Integer` FK → `rubric_sub_criteria.id` ON DELETE CASCADE | Which sub-criterion was scored |
| `ai_score` | `Float` nullable | The AI-assigned mark (0 to `max_marks`). Null if scoring failed. |
| `scoring_failed` | `Boolean` default `False` | Whether this sub-criterion could not be scored |
| `error_detail` | `Text` nullable | Error message if scoring failed |
| `ai_score_run_1` | `Float` nullable | **Dead column** — exists in schema, never written to by pipeline |
| `ai_score_run_2` | `Float` nullable | **Dead column** — exists in schema, never written to by pipeline |
| `score_consistency_flag` | `Boolean` default `False` | **Dead column** — exists in schema, never written to by pipeline |
| `ai_justification` | `Text` nullable | LLM-generated justification for the score |
| `cited_text` | `Text` nullable | Verbatim quotes or gap description used as evidence |
| `confidence_score` | `Float` nullable | **Real LLM confidence score** (0–100 integer, clamped to `[0.0, 100.0]`). Falls back to `None` if missing. |
| `verifier_passed` | `Boolean` nullable | **Real verification verdict** from Stage 8 verifier pass (batched per chapter target). `True` if justification matches score; `False` if flagged. |
| `verifier_notes` | `Text` nullable | **Audit notes from verifier agent** explaining verification confirmation or specific scoring mismatch rationale. |
| `supervisor_override_score` | `Float` nullable | Supervisor's manual override mark |
| `supervisor_notes` | `Text` nullable | Supervisor's notes on the override |
| `created_at` | `DateTime(tz)` server default `now()` | Row creation timestamp |

### 2.8 Table: `plagiarism_checks`

Per-chapter plagiarism scan results.

| Column | Type | Purpose |
|---|---|---|
| `id` | `Integer` PK | Auto-increment primary key |
| `submission_id` | `Integer` FK → `thesis_submissions.id` ON DELETE CASCADE | Parent submission |
| `section_name` | `String(100)` nullable | Chapter name checked (e.g. `"literature_review"`) |
| `similarity_percentage` | `Float` NOT NULL | Similarity score for this section |
| `matched_sources` | `JSON` nullable | Array of `{source_url, matched_text, similarity}` objects |
| `provider` | `String(50)` default `"openalex_vector_ngram"` | Provider identifier matching the OpenAlex n-gram/vector comparison engine |
| `checked_at` | `DateTime(tz)` server default `now()` | Timestamp |

### 2.9 Dead Schema (Columns That Exist But Are Never Written)

| Table | Column | Notes |
|---|---|---|
| `assessment_results` | `ai_score_run_1` | Designed for dual-run consistency checking. Never populated by current pipeline. |
| `assessment_results` | `ai_score_run_2` | Same — dual-run second pass never implemented. |
| `assessment_results` | `score_consistency_flag` | Would flag divergent dual-run scores. Never set. |
| `thesis_submissions` | `plagiarism_report_url` | Intended for an external plagiarism provider URL. Never written. |
| `rubric_criteria` | `embedding` | Vector column exists but is never queried in the pipeline. Seeded as `None`. |
| `rubric_sub_criteria` | `embedding` | Same — exists, seeded as `None`, never queried. |
| `rubric_criteria` | `assessment_type` | Always `"thesis"`. The `"oral"` variant is defined in the enum but no oral rubric is seeded or used. |

### 2.10 Foreign Key Relationships Diagram

```
users
  └─ (no FK relationship — lecturer_id in thesis_submissions is a plain Integer, not a formal FK)

rubric_criteria
  └─ rubric_sub_criteria.criterion_id → rubric_criteria.id (CASCADE)
       ├─ chapter_sub_criteria_map.sub_criterion_id → rubric_sub_criteria.id (CASCADE)
       ├─ graded_examples.sub_criterion_id → rubric_sub_criteria.id (CASCADE)
       └─ assessment_results.sub_criterion_id → rubric_sub_criteria.id (CASCADE)

thesis_submissions
  ├─ assessment_results.submission_id → thesis_submissions.id (CASCADE)
  └─ plagiarism_checks.submission_id → thesis_submissions.id (CASCADE)
```

> **Note:** `thesis_submissions.lecturer_id` is a plain `Integer` column, **not** a
> `ForeignKey` to `users.id`. There is no database-enforced relationship between
> submissions and users.

---

## 3. The Full Pipeline / Agent Flow

The complete assessment pipeline is orchestrated by `execute_thesis_assessment_pipeline()`
in `app/services/agent_pipeline.py` (line 815). It runs as a **FastAPI BackgroundTask**
triggered by `POST /api/submissions/{id}/assess`.

### Pipeline Stages Overview

| Order | Stage Name (`pipeline_step`) | Progress | LLM Calls | Function |
|---|---|---|---|---|
| 1 | `structural_extraction` | 10% | 0 | `extract_document_structure()` + `chunk_thesis_by_chapters()` + `run_deterministic_findings()` |
| 2 | `rubric_loading` | 15% | 0 | DB query for active rubric criteria/sub-criteria |
| 3 | `preliminary_check` | 20% | 1 | `run_preliminary_check()` → `run_compliance_check()` (deterministic) + 1 LLM commentary |
| 4 | `flow_analysis` | 30% | 1 | `run_flow_analysis()` (full intro/methodology/results within 126k token budget) |
| 5 | `plagiarism_scan` | 40% | 0 | `run_plagiarism_check()` (n-gram + embedding + OpenAlex API) |
| 6 | `evidence_gathering` | 50–70% | N (1 per chapter target group) | `run_evidence_gathering_for_chapter()` × chapter targets (full text; chunking fallback if >123k tokens) |
| 7 | `scoring` | 75% | 1 | `run_scoring()` (calibrated marks + real confidence scores 0–100) |
| 8 | `verification` | 75–80% | N (1 per chapter target group) | `run_verifier_for_chapter()` × chapter targets (real audit of scores against evidence) |
| 9 | `narrative_synthesis` | 85% | 1 | `run_narrative_synthesis()` via `call_synthesis_llm_async()` |
| 10 | `self_check` | 95% | 1 (+ optionally 1 retry of synthesis) | `run_self_check()` |
| — | `completed` | 100% | — | Final status update |

### 3.1 Stage 1: Structural Extraction (Deterministic, No LLM)

**Function:** `extract_document_structure()` in `app/services/thesis_parser.py`

**What it does:**
1. Splits the full text into chapter chunks using `chunk_thesis_by_chapters()`, which detects chapter headings via regex patterns adapting to both 5-chapter combined structures and 6-chapter separate structures.
2. Detects the structure option (`monograph` or `manuscript`) via `detect_structure_option()`.
3. Detects the chapter structure (`five_chapter` or `six_chapter`) via `detect_chapter_structure()`. Documents with a combined "Results and Discussion" / "Analysis and Discussion" heading or 5 chapters ending in Conclusion are detected as `five_chapter` without forcing a false split. Documents with separate Results and Discussion chapters (and Chapter 6 Conclusion) are detected as `six_chapter`. Ambiguous headings fall back to `five_chapter`.
4. Extracts tables (regex: `Table N.N: ...`), figures (regex: `Figure N.N: ...`), TOC section numbers, and references.
5. For PDF files, extracts up to 5 embedded images and sends each to the Groq Vision API via `analyze_figure_image_sync()` for technical content extraction.
6. Cross-checks each bibliography entry against the thesis body text for in-text citation verification.
7. Runs `run_deterministic_findings()` which checks: duplicate section numbers, uncited references, word count conformity, and missing chapters.

**Result stored:** `submission.structure_option` and `submission.chapter_structure` set in DB. `doc_structure` dict (containing the exact detected chapters) kept in memory for later stages.

### 3.2 Stage 2: Rubric Loading (Database Query, No LLM)

**What it does:** Queries the database for all `RubricSubCriterion` rows joined to `RubricCriterion` where `degree_level` matches the submission's level and neither criterion nor sub-criterion is deprecated. If no criteria match the specific degree level, falls back to all non-deprecated sub-criteria.

**Result:** `sub_criteria` list and `criteria_map` dict kept in memory.

### 3.3 Stage 3: Preliminary Compliance Check (Deterministic + 1 LLM Call)

**Function:** `run_preliminary_check()` in `app/services/agent_pipeline.py` (line 170)

**Deterministic checks** (via `run_compliance_check()` in `app/services/compliance_check.py`):
- **Extractable text:** Fails if < 1,000 words (blocking).
- **Thesis word length:** PhD 60,000–100,000; MPhil ≤ 60,000 (per Guide Section G). No limit for MSc/undergraduate.
- **Abstract:** Must exist; PhD ≤ 500 words, MPhil/MSc ≤ 350 words.
- **Front matter:** Checks for Declaration of Authorship, Table of Contents, List of Tables, List of Figures.
- **References:** Checks for References/Bibliography section heading.
- **Major chapters:** Requires at least 3 of: introduction, literature_review, methodology, results, conclusion (blocking).

**LLM call (1):** Model `GROQ_FAST_MODEL` (`openai/gpt-oss-20b`), temperature 0.2, max 400 tokens, JSON mode.

**Prompt (paraphrased):**
```
A thesis submitted for evaluation at the {degree_level} level has been checked
mechanically against the KNUST Guide. The checks below are verified facts. Your task is
ONLY to write a short explanatory note for the supervisor — do not overturn the verdict.

MECHANICAL VERDICT: {ASSESSABLE or NOT ASSESSABLE}
TOTAL WORD COUNT: {N}
{formatted compliance findings}

Write 2-3 sentences summarising what these findings mean for the supervisor.
Respond ONLY in JSON: {"notes": "..."}
```

**Gate behavior:** If `ready_for_evaluation` is False (a blocking finding failed), the pipeline halts with status `preliminary_check_failed`.

**Result stored:** `submission.preliminary_check_passed`, `submission.compliance_findings` (JSON), `submission.preliminary_check_notes`.

### 3.4 Stage 4: Flow Analysis (1 LLM Call)

**Function:** `run_flow_analysis()` in `app/services/agent_pipeline.py` (line 232)

**Model:** `GROQ_SCORER_MODEL` (`openai/gpt-oss-120b`), max 1,500 tokens, JSON mode off.

**Token Budget Logic:** The model context window is 131,072 tokens. Reserving ~1,500 tokens for instructions, 1,500 tokens for output, and 2,000 tokens safety buffer leaves a combined available budget of ~126,000 tokens (~415,000 characters). The introduction, methodology, and results chapters are passed **in full** without truncation whenever they fit in this budget (proportional budgeting is applied only as an overflow fallback for exceptionally large theses).

**Prompt (verbatim):**
```
Analyze the attached thesis chapters and extract the logical flow matrix:

- Objectives: main objectives stated in introduction.
- Research Questions: research questions and corresponding objectives.
- Methodology: methods used per research question.
- Results: key findings per research question.
- Discussion & Conclusion alignment.

THESIS INTRO & METHODOLOGY EXCERPTS:
{full introduction chapter text}

{full methodology chapter text}

{full results chapter text}

Format as a Markdown table with columns:
| Objective | Research Question | Method Used | Key Result | Discussed? | Concluded? |

Explicitly flag any declared scope items or objectives that lack corresponding results
or methodology.
```

**Result stored:** `submission.flow_analysis_table` (Markdown string).

### 3.5 Stage 5: Plagiarism Scan (0 LLM Calls)

**Function:** `run_plagiarism_check()` in `app/services/plagiarism_service.py`

**What it does:**
1. Checks chapters: `literature_review`, `methodology`, `introduction`, `discussion`.
2. For each chapter:
   - Queries OpenAlex REST API (`api.openalex.org/works`) with the first 6 long words from the chapter text (timeout 1.5s, 2 results per chapter).
   - Computes 3-gram Jaccard similarity against a hardcoded 3-paper `ACADEMIC_CORPUS` plus any OpenAlex results.
   - Computes cosine similarity of BAAI/bge-small-en-v1.5 embeddings (if model loaded; otherwise n-gram only).
   - Weighted combination: 40% n-gram + 60% vector (or 100% n-gram if embeddings degraded).
   - Cross-chapter self-repetition check via 4-gram Jaccard (flagged if > 25%).
3. Overall score = average of per-chapter maximums.

**Result stored:** `submission.plagiarism_score`, `submission.plagiarism_checked_at`, and `PlagiarismCheck` rows per chapter (with `provider = "openalex_vector_ngram"`).

### 3.6 Stage 6: Evidence Gathering (N LLM Calls — 1 Per Chapter Target Group)

**Function:** `run_evidence_gathering_for_chapter()` in `app/services/agent_pipeline.py` (line 462)

**Parallelism:** Sub-criteria are grouped by `chapter_target`. Each group runs in parallel with a concurrency semaphore of 3.

**Model:** `GROQ_SCORER_MODEL` (`openai/gpt-oss-120b`), temperature 0.2, max 2,500 tokens, JSON mode.

**Context Window & Token Budget Logic:**
The model has a 131,072-token context window. Accounting for prompt instructions (~500 tokens), sub-criteria rubric descriptions (~1,000 tokens), mechanical compliance findings (~1,500 tokens), 2,500 reserved output tokens, and a 2,000-token safety buffer, ~123,000 tokens (~400,000 characters) are available for chapter text in a single call.
- **Normal Operation:** Full chapter text is transmitted directly to the LLM without character truncation.
- **Fallback Chunking (Oversized Chapters):** If a single chapter exceeds 123,000 tokens (e.g. an unpartitioned 25,000+ word chapter), `_split_into_segments()` splits the chapter sequentially on paragraph boundaries (`\n\n`, `\n`) into segments of ≤123,000 tokens. Evidence gathering executes on each segment with the same sub-criteria list, and findings are merged (union of quotes deduplicated, best gaps preserved) so no text is lost.

**Prompt (verbatim):**
```
You are an expert academic examiner extracting grounded evidence from a thesis chapter.
DEGREE LEVEL: {LEVEL}
CHAPTER TARGET: {chapter_target}

{deterministic findings if any}
SUB-CRITERIA TO AUDIT FOR THIS CHAPTER:
{for each sub-criterion: ID, name, max_marks, description, low/mid/high descriptors}

TEXT OF THE CHAPTER TO AUDIT:
{full text of the chapter}

INSTRUCTIONS:
For EACH sub-criterion listed above:
1. Hunt for direct, verbatim quote excerpts from the chapter text that serve as positive evidence.
2. If evidence is lacking or inadequate for the {degree_level} level, state a candid, specific gap_description explaining exactly what missing topic, dataset, equation, or section element is absent.
3. ANTI-BOILERPLATE RULE: DO NOT use generic template phrases such as "Lack of test cases or evaluation evidence" or "Lack of clear and consistent referencing style". The gap_description MUST name the exact missing section, dataset, figure, table, or topic from this chapter.
4. Be rigorous: DO NOT invent evidence or make superficial praise. Quote verbatim.

Respond ONLY in this JSON format:
{
  "findings": [
    {
      "sub_criterion_id": <int>,
      "evidence_found": true or false,
      "quotes": ["verbatim quote 1", "verbatim quote 2"],
      "gap_description": "specific explanation referencing missing chapter elements, or empty if excellent"
    }
  ]
}
```

**Chapter Target Mapping & Grouping:**
- **5-Chapter Submissions (`chapter_structure == "five_chapter"`):** Sub-criteria whose rubric targets are `results`, `discussion`, `data_analysis`, or `results_and_discussion` are automatically consolidated under the unified `results_and_discussion` target. This executes against the single combined Results & Discussion chapter text, preventing evidence starvation or artificial splitting.
- **6-Chapter Submissions (`chapter_structure == "six_chapter"`):** Sub-criteria preserve separate targets (`results` and `discussion`), querying each respective chapter independently.

**Typical call count:** With the standard rubric, this stage makes approximately **5–6 LLM calls** for 5-chapter submissions (introduction, literature_review, methodology, results_and_discussion, conclusion, document-wide) and **6–7 LLM calls** for 6-chapter submissions.

**Result:** `all_evidence` list kept in memory.

### 3.7 Stage 7: Scoring (1 LLM Call)

**Function:** `run_scoring()` in `app/services/agent_pipeline.py` (line 700)

**Model:** `GROQ_SCORER_MODEL` (`openai/gpt-oss-120b`), temperature 0.1, max 3,000 tokens, JSON mode.

**Prompt (verbatim):**
```
You are a senior academic thesis examiner assigning marks for a {LEVEL} thesis.
All evidence has been pre-gathered from the thesis text by chapter extraction tools.

YOUR TASK: Evaluate the gathered evidence against the rubric criteria and assign a
numeric score for EVERY sub-criterion. All marks MUST be calibrated relative to each
other in this single pass.

DEGREE LEVEL CALIBRATION ({LEVEL}):
- For PhD: Expect original contribution, theoretical mastery, and publication-ready rigour.
- For MPhil: Expect rigorous methodology, critical synthesis, and evidence-backed arguments.
- For MSc (Taught): Expect applied methodology, correct engineering/domain practice.
- For Undergraduate (BSc): Expect practical problem solving, working implementation evidence.

RUBRIC SUB-CRITERIA TO SCORE:
{JSON array of sub_criterion_id, name, max_marks, target, high descriptor}

GATHERED EVIDENCE FROM THESIS CHAPTERS:
{JSON array of sub_criterion_id, target, quotes, gap}

INSTRUCTIONS:
1. For each sub_criterion_id, assign a score between 0.0 and max_marks.
2. Ground your score strictly on the evidence quotes and gap descriptions above.
3. Provide a 1-2 sentence justification naming specific technical terms, dataset names, section titles.
4. BANNED GENERIC JUSTIFICATIONS: You are strictly forbidden from outputting generic filler.
5. confidence: an integer 0-100 reflecting how directly the gathered evidence supports this score. Use LOW confidence (below 50) when evidence was sparse, ambiguous, or you had to infer significantly. Use HIGH confidence (80+) only when the evidence directly and unambiguously supports the score given.

Respond ONLY in JSON: {"scores": [{"sub_criterion_id": <int>, "score": <float>, "justification": "<string>", "confidence": <int>}]}
```

**Post-processing:**
- Scores are clamped to `[0.0, max_marks]`.
- `confidence_score` is parsed from the model output, clamped to `[0.0, 100.0]`. If missing or invalid, it defaults to `None` (sentinel fallback) rather than a fake score.
- Returns list of scoring dictionaries ready for audit by the verifier pass.

### 3.8 Stage 8: Verification Pass (N LLM Calls — 1 Per Chapter Target Group)

**Function:** `run_verifier_for_chapter()` in `app/services/agent_pipeline.py` (line 330)

**Model:** `GROQ_SCORER_MODEL` (`openai/gpt-oss-120b`), temperature 0.1, max 2,000 tokens, JSON mode.

**Role & Logic:** Batched per chapter target group (matching evidence gathering concurrency with semaphore of 3). Rather than re-scoring, the verifier acts as an independent auditor testing whether the assigned score actually corresponds to the cited evidence and justification.

**Prompt (verbatim):**
```
You are an expert academic verifier auditing scoring decisions for a {LEVEL} thesis.
CHAPTER TARGET: {chapter_target}

YOUR ROLE:
You are verifying scoring decisions, NOT re-scoring. For each sub-criterion below, does the justification given actually match the score assigned, given the evidence?

SUB-CRITERIA DECISIONS TO AUDIT:
[
  {
    "sub_criterion_id": <int>,
    "sub_criterion_name": "<name>",
    "max_marks": <float>,
    "assigned_score": <float>,
    "justification": "<string>",
    "evidence_quotes": ["quote 1", "quote 2"],
    "gap_description": "<gap text>"
  }
]

INSTRUCTIONS:
1. For each sub-criterion below, does the justification given actually match the score assigned, given the evidence?
2. Respond per sub-criterion: sub_criterion_id, verified (true/false), and notes.
3. If verified is false, explain the mismatch in notes — e.g. 'score of 4.5/5 given but justification describes only partial evidence' or 'justification contradicts the assigned score' or 'no evidence cited to support full marks'.
4. If verified is true, provide a concise confirming note (e.g. 'Score matches evidence and justification.').

Respond ONLY in this JSON format:
{
  "verifications": [
    {
      "sub_criterion_id": <int>,
      "verified": true or false,
      "notes": "<string explanation>"
    }
  ]
}
```

**Post-processing & UI Integration:**
- Each sub-criterion's boolean `verified` and string `notes` are written directly to `AssessmentResult.verifier_passed` and `AssessmentResult.verifier_notes`.
- Any item where `verifier_passed == False` is immediately highlighted in amber (`bg-amber-50 border-amber-200`, "Flagged") on the **Verification & Consistency Check** page (`/thesis/submission/:id/verification`), alerting supervisors to audit the decision.

**Call count:** Approximately **5–8 LLM calls** (1 per chapter target group).

### 3.9 Stage 9: Narrative Synthesis (1 LLM Call via AgentRouter or Groq)

**Function:** `run_narrative_synthesis()` in `app/services/agent_pipeline.py` (line 820),
called via `call_synthesis_llm_async()` (line 757).

**Model selection:** Tries AgentRouter proxy first (`claude-opus-5` → `claude-opus-4-8` → `claude-opus-4-6` → `gpt-5` → `anthropic/claude-sonnet-5`), falls back to Groq `GROQ_SYNTHESIS_MODEL` (`openai/gpt-oss-120b`).

**Temperature:** 0.5, max 4,000 tokens.

**Prompt:** Very long (~2,000 tokens of template). It includes:
- Manuscript metadata (candidate name, title, degree level, structure option, chapter structure label, detected chapter count, detected chapters list, computed score with grade band, rubric source).
- All gathered evidence with chapter labels, verbatim quotes, and gaps.
- All scores with justifications.
- Mechanical compliance findings.
- Flow analysis matrix.
- Strict persona constraints: direct second-person address, synthesis-first strengths, detailed corrections table.
- Banned generic phrases.
- Required 8-section report structure: (1) Overall Supervisor's Assessment, (2) Major Strengths, (3) Major Corrections Required (table), (4) Chapter-by-Chapter Critical Assessment (strictly dynamic: generates exactly one subsection per detected chapter actually present in the manuscript, without assuming a fixed 6-chapter list or hallucinating separate chapters), (5) Technical and Methodological Comments, (6) Formatting/Language/Referencing Corrections, (7) Priority Action Plan, (8) Final Recommendation with signature block.

**Result stored:** `submission.narrative_report`.

### 3.10 Stage 10: Self-Check (1 LLM Call + Possible Synthesis Retry)

**Function:** `run_self_check()` in `app/services/agent_pipeline.py` (line 982)

**Model:** `GROQ_FAST_MODEL` (`openai/gpt-oss-20b`), temperature 0.0, max 400 tokens, JSON mode.

**Prompt (verbatim):**
```
You are a quality-assurance auditor reviewing an AI-generated academic thesis report.

REPORT TO AUDIT:
{first 6000 chars of narrative report}

Check for the following 4 defects:
1. Are two or more chapter critiques near-duplicates (same template/phrasing with swapped nouns)?
2. Is the overall numeric score stated without an explicit mark breakdown?
3. Does the report claim font family (Times New Roman) or line spacing (1.5) compliance without proof?
4. Does the report contain generic filler phrases like "lacks a nuanced analysis"?

Respond ONLY in JSON: {"passed": true/false, "flags": ["list of defect descriptions"]}
```

**Behavior:** If the self-check fails, narrative synthesis is re-run once.

**Result stored:** `submission.supervisor_recommendation` (computed from grade band), `submission.narrative_report`, `submission.status = "completed"`.

### 3.11 Total API Calls Per Full Assessment Run

| Call Type | Count | Model |
|---|---|---|
| Preliminary check commentary | 1 | `openai/gpt-oss-20b` (Groq) |
| Flow analysis | 1 | `openai/gpt-oss-120b` (Groq) |
| Evidence gathering | ~5–8 (1 per chapter target group) | `openai/gpt-oss-120b` (Groq) |
| Scoring | 1 | `openai/gpt-oss-120b` (Groq) |
| Verification audit pass | ~5–8 (1 per chapter target group) | `openai/gpt-oss-120b` (Groq) |
| Narrative synthesis | 1 | AgentRouter (Claude/GPT) or Groq |
| Self-check | 1 | `openai/gpt-oss-20b` (Groq) |
| Narrative retry (if self-check fails) | 0 or 1 | AgentRouter or Groq |
| Vision (figure analysis, PDF only) | 0–5 | `openai/gpt-oss-120b` (Groq) |
| Fallback chunking (oversized chapters >123k tokens) | 0 (or +1–2 per massive chapter) | `openai/gpt-oss-120b` (Groq) |
| **OpenAlex HTTP (plagiarism)** | ~4 | OpenAlex REST API (not LLM) |
| **Total LLM calls** | **~15–25** (typically ~17–20) | — |

---

## 4. API Endpoints

All routes are prefixed with `/api` via the thesis router (`app/routers/thesis.py`, prefix `"/api"`) and auth router (`app/routers/auth.py`, prefix `"/api/auth"`).

> **Authentication & Authorization Policy:** Endpoints marked "Lecturer" or "Student" strictly require a valid JWT passed via `Authorization: Bearer <token>` or `?token=<token>`. Requests without a valid, unexpired token return **HTTP 401 Unauthorized** (`WWW-Authenticate: Bearer`). If an authenticated user attempts to access an endpoint designated for another role, the server returns **HTTP 403 Forbidden**. Silent demo-user fallbacks are completely eliminated.

### 4.1 Authentication Endpoints

| Method | Path | Auth | Description | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user | `{name, email, password, role}` | `{message}` (201) |
| `POST` | `/api/auth/login` | No | Login, get JWT | `{email, password}` | `{access_token, token_type}` |

### 4.2 Health Check

| Method | Path | Auth | Description | Response |
|---|---|---|---|---|
| `GET/HEAD` | `/health` | No | Liveness probe | `{status: "ok"}` |
| `GET/HEAD` | `/api/health` | No | Same | `{status: "ok"}` |

### 4.3 Rubric Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/rubric/criteria?degree_level=mphil` | Lecturer | List criteria with nested sub-criteria for a degree level |
| `PATCH` | `/api/rubric/sub-criteria/{id}` | Lecturer | Update sub-criterion name, description, max_marks, or level descriptors |
| `GET` | `/api/rubric/chapters` | Lecturer | List chapter → sub-criteria ID mappings |

### 4.4 Submission Endpoints

| Method | Path | Auth | Description | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/api/submissions` | Lecturer | List all submissions (filtered by `lecturer_id`) | — | Array of submission summaries with computed scores/grades |
| `GET` | `/api/submissions/{id}` | Lecturer | Get single submission metadata | — | Submission object |
| `POST` | `/api/submissions` | Lecturer | Upload thesis (multipart form) | `student_name`, `index_number`, `title`, `degree_level`, `programme`, `institution`, `file` (UploadFile) | `{id, message, status}` |
| `DELETE` | `/api/submissions/{id}` | Lecturer | Delete submission + cascade results + local file | — | 204 No Content |
| `POST` | `/api/submissions/{id}/assess` | Lecturer | Trigger background assessment pipeline | — | `{message, submission_id}` |
| `POST` | `/api/submissions/{id}/reset` | Lecturer | Cancel/reset stuck pipeline to `failed` status | — | `{message, submission_id}` |
| `POST` | `/api/submissions/extract-metadata` | Lecturer | Extract cover page metadata from uploaded file | `file` (UploadFile) | `{student_name, index_number, title, degree_level, programme}` |

### 4.5 Assessment Data Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/submissions/{id}/preliminary-check` | Lecturer | Get compliance check results |
| `GET` | `/api/submissions/{id}/flow-analysis` | Lecturer | Get flow analysis Markdown table |
| `GET` | `/api/submissions/{id}/plagiarism` | Lecturer | Get plagiarism report with per-section checks |
| `GET` | `/api/submissions/{id}/results` | Lecturer | Get all scored sub-criteria with aggregate totals |
| `GET` | `/api/submissions/{id}/results/by-chapter/{chapter_name}` | Lecturer | Get results filtered to a specific chapter |
| `PATCH` | `/api/submissions/{id}/results/{sub_criterion_id}` | Lecturer | Supervisor overrides AI score for a sub-criterion |
| `GET` | `/api/submissions/{id}/report` | Lecturer | Get narrative report text |
| `PATCH` | `/api/submissions/{id}/report` | Lecturer | Save supervisor-edited report and recommendation |
| `GET` | `/api/submissions/{id}/export` | Lecturer | Download Word (.docx) assessment report |
| `GET` | `/api/submissions/{id}/chapter-text/{chapter_key}` | Lecturer | Get extracted text for a chapter (or `"all"` for full text) |
| `GET` | `/api/submissions/{id}/figures` | Lecturer | Get extracted figure metadata with Vision AI analysis |
| `GET` | `/api/submissions/{id}/figures/{img_index}/image` | Lecturer | Serve raw image bytes for a PDF figure |
| `GET` | `/api/submissions/{id}/document` | Lecturer | Serve original uploaded file (local or proxied from Cloudinary) |

### 4.6 Graded Examples

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/graded-examples` | Lecturer | Create a human-graded exemplar excerpt (with embedding) |

### 4.7 Legacy/Alias Routes

Both `/api/submissions/{id}` and `/api/thesis-submissions/{id}` map to the same handlers (dual `@router.get` decorators). The frontend `thesis.api.js` uses `/thesis-submissions/` paths, which also resolve correctly due to the router prefix.

---

## 5. Frontend Structure

The frontend is a **React 19 SPA** built with Vite 8, using `react-router-dom` v7 for routing, `zustand` for auth state, and `axios` for API calls. Styling uses TailwindCSS 3.

### 5.1 Routing (`src/router/AppRouter.jsx`)

All thesis routes are protected by `ProtectedRoute`, which checks `isAuthenticated` and `user.role === 'lecturer'`.

| Path | Page Component | Description |
|---|---|---|
| `/login` | `LoginPage` | Email/password login form |
| `/register` | `RegisterPage` | Registration with name, email, password, role |
| `/` | Redirects to `/thesis/dashboard` | — |
| `/thesis/dashboard` | `SupervisorDashboardPage` | Main dashboard listing all submissions |
| `/thesis/upload` | `UploadThesisPage` | Thesis upload form with metadata extraction |
| `/thesis/submission/:id/structure` | `StructureMappingPage` | Compliance check results, flow analysis, plagiarism report, document viewer |
| `/thesis/submission/:id/scoring` | `CriterionScoringPage` | Per-sub-criterion AI scores with override capability |
| `/thesis/submission/:id/verification` | `VerificationCheckPage` | Verification/evidence review panel |
| `/thesis/submission/:id/report` | `FinalNarrativeReportPage` | Narrative report viewer/editor with Markdown rendering and DOCX export |
| `/thesis/rubric` | `RubricEditorPage` | View and edit rubric criteria and sub-criteria |
| `*` | `NotFoundPage` | 404 page |

### 5.2 Page Details

#### `SupervisorDashboardPage`
- **Fetches:** `GET /api/submissions` (polling every few seconds when any submission is `assessing`)
- **Displays:** Card grid of all submissions with status badges, scores, grades, pipeline progress bars
- **Actions:** Navigate to upload, navigate to submission details, delete submissions, trigger assessment

#### `UploadThesisPage`
- **Fetches:** `POST /api/submissions/extract-metadata` (on file select, to auto-fill metadata fields)
- **Actions:** Upload thesis file with student name, index number, title, degree level (dropdown: undergraduate/msc/mphil/phd), programme, institution
- **Redirects to:** `/thesis/submission/:id/structure` after successful upload and automatic assessment trigger

#### `StructureMappingPage`
- **Fetches:** `GET /api/submissions/{id}`, `GET /api/submissions/{id}/preliminary-check`, `GET /api/submissions/{id}/flow-analysis`, `GET /api/submissions/{id}/plagiarism`
- **Displays:** Compliance findings with pass/fail/warn badges, structure option, flow matrix table, plagiarism per-section breakdown, embedded document viewer (PDF/DOCX)
- **Polls:** Pipeline progress when status is `assessing`

#### `CriterionScoringPage`
- **Fetches:** `GET /api/submissions/{id}/results`, `GET /api/rubric/criteria?degree_level=...`
- **Displays:** Grouped sub-criterion cards by parent criterion, showing AI score, max marks, justification, cited text, confidence score
- **Actions:** Supervisor can override any AI score via inline edit (`PATCH /api/submissions/{id}/results/{sub_criterion_id}`)

#### `VerificationCheckPage`
- **Fetches:** `GET /api/submissions/{id}/results`
- **Displays:** Evidence/verification panel showing verifier status, cited text, and gap descriptions per sub-criterion

#### `FinalNarrativeReportPage`
- **Fetches:** `GET /api/submissions/{id}/report`
- **Displays:** Full Markdown narrative report rendered with `react-markdown`
- **Actions:** Toggle editor mode (Monaco editor), save edits (`PATCH /api/submissions/{id}/report`), download DOCX (`GET /api/submissions/{id}/export`)

#### `RubricEditorPage`
- **Fetches:** `GET /api/rubric/criteria?degree_level=...`
- **Displays:** Expandable criteria with editable sub-criterion fields
- **Actions:** Edit sub-criterion descriptors and marks (`PATCH /api/rubric/sub-criteria/{id}`), switch degree level

### 5.3 Shared Components

- **`DocumentViewer`** (`src/components/DocumentViewer.jsx`): Renders uploaded PDF/DOCX inline. Uses `pdfjs-dist` for PDF rendering, `docx-preview` for DOCX preview, with token-authenticated document fetching.
- **`NavigationHeader`** (`src/components/NavigationHeader.jsx`): Top navigation bar with breadcrumbs, user info, logout button.

### 5.4 State Management

- **`authStore.js`** (Zustand): Stores `user`, `token`, `isAuthenticated`. Token persisted to `localStorage` under key `devlab_token`. User object stored under `devlab_user`.
- **API layer** (`axiosInstance.js`): Base URL from `VITE_API_BASE_URL` env var (or empty, using Vite's dev proxy). Attaches `Authorization: Bearer {token}` header to all requests.

---

## 6. Rubric / Scoring Logic

### 6.1 Rubric Structure

The rubric is a **two-level hierarchy**:
- **Criterion** (top-level, e.g. "2. Critical Review of Literature & Frameworks", max 25 marks)
  - **Sub-Criterion** (assessable item, e.g. "Scholarly analysis and criticism of relevant research", max 5 marks)

Each sub-criterion has three level descriptors:
- `level_low_desc` — what poor performance (0–30% of max) looks like
- `level_mid_desc` — what acceptable performance (40–60%) looks like
- `level_high_desc` — what excellent performance (70–100%) looks like

### 6.2 Degree-Level Rubric Sets

Four complete rubric sets are seeded at startup from `app/seed.py`:

| Degree Level | Source | Total Marks | Number of Criteria | Number of Sub-Criteria |
|---|---|---|---|---|
| `mphil` | KNUST HDR Guide 2016, Appendix 4.4 | 100.0 | 7 | 20 |
| `phd` | KNUST HDR Guide 2016, Appendix 4.2 | 100.0 | 7 | 20 |
| `msc` | Departmental adaptation (derived) | 100.0 | 7 | 17 |
| `undergraduate` | Departmental BSc rubric (derived) | 100.0 | 7 | 16 |

**MPhil criteria breakdown (100 marks total):**

| # | Criterion | Max Marks | Sub-Criteria Count |
|---|---|---|---|
| 1 | Statement of Problem & Justification | 10.0 | 3 |
| 2 | Critical Review of Literature & Frameworks | 25.0 | 5 |
| 3 | Research Design & Methodology | 20.0 | 3 |
| 4 | Analysis of Data & Presentation of Results | 12.5 | 2 |
| 5 | Statement of Findings & Discussion | 12.5 | 4 |
| 6 | Conclusions & Recommendations | 10.0 | 5 |
| 7 | Presentation | 10.0 | 1 |

The PhD rubric follows the same 7-criterion structure but with different mark weightings (e.g. Criterion 1 is 15 marks instead of 10) and more demanding level descriptors.

### 6.3 Scoring Scale

The system uses **raw marks** out of 100:
- Each sub-criterion is scored between `0.0` and `max_marks` (a float).
- The final aggregate is `sum(ai_score or supervisor_override_score) / sum(max_marks) × 100`.
- Scores are **not normalized** — they directly represent marks on the rubric's 100-point scale.

### 6.4 Grade Band Mapping (KNUST HDR Guide Appendix 4.1)

Implemented in `app/services/grading_scale.py`:

| Percentage Range | Grade | Interpretation | Recommendation |
|---|---|---|---|
| 70–100 | A | Excellent | Pass (Unconditional) |
| 60–69 | B | Very Good | Pass (Conditional) |
| 55–59 | C | Good | Pass (Minor Revision) |
| 50–54 | E | Referred | Referred — Major revision required (capped at 60% on resubmission) |
| 0–49 | F | Fail | Unacceptable (Fail) — Serious deficiencies requiring major rework |

> **Note:** There is no D band in the KNUST Guide. The reassessment cap for Referred
> (Grade E) theses is 60%.

### 6.5 Final Aggregate Score Calculation

In the `GET /api/submissions/{id}/results` endpoint and in the narrative synthesis prompt:

```python
scored = [r for r in results if r.ai_score is not None]
total_obtained = sum(
    r.supervisor_override_score if r.supervisor_override_score is not None else r.ai_score
    for r in scored
)
total_max = sum(r.sub_criterion.max_marks for r in scored)
percentage = round(total_obtained / total_max * 100, 1) if total_max > 0 else None
band = grade_for(percentage)
```

The supervisor override score takes precedence over the AI score when present.

---

## 7. Known Limitations, Recent Fixes, and Incomplete Features

### 7.1 Verifier Agent: Resolved (Previously a Stub)

*Status: Resolved.* Previously, `run_verifier_agent()` returned a static `{"verified": True, "notes": "Verified via whole-document evidence pass."}` with no LLM call. This is now fully implemented as a real Stage 8 verification audit pass (`run_verifier_for_chapter()`, batched per chapter target group). The verifier receives the assigned score, justification, and gathered quotes/gaps, evaluating whether the justification and evidence support the assigned mark. Real boolean results (`verifier_passed`) and audit explanations (`verifier_notes`) are stored in `AssessmentResult` and surfaced directly in the Verification & Consistency Check UI (`Verified` vs `Flagged`). *(Note: The dual-run consistency columns `ai_score_run_1`, `ai_score_run_2`, and `score_consistency_flag` remain unpopulated dead schema columns).*

### 7.2 Confidence Score: Resolved (Previously Hardcoded to 90.0)

*Status: Resolved.* Previously, `confidence_score` was hardcoded to `90.0` for all sub-criteria. This is now resolved: the Stage 7 scoring prompt requests an honest integer confidence score (0–100) reflecting how directly the gathered evidence supports the score (low <50 for sparse/ambiguous evidence, high 80+ only for direct/unambiguous evidence). The post-processing parses the model's confidence value clamped to `[0.0, 100.0]`, and falls back to sentinel `None` if the field is absent or invalid.

### 7.3 Authentication Enforcement: Resolved (Previously Silently Bypassed)

*Status: Resolved.* Previously, `get_current_user()` in `app/dependencies.py` silently returned a hardcoded demo lecturer (`Dr. Kwame Mensah`) whenever no token was provided, and role dependencies did not inspect user roles. This is now strictly enforced:
1. `get_current_user()` raises **HTTP 401 Unauthorized** (`WWW-Authenticate: Bearer`) when no token is present, or when the token is invalid or expired.
2. `require_lecturer()` checks `current_user.role == "lecturer"` and raises **HTTP 403 Forbidden** if not satisfied.
3. `require_student()` checks `current_user.role == "student"` and raises **HTTP 403 Forbidden** if not satisfied.

### 7.4 Chapter Text Truncation: Resolved (Full Context & Token Budgeting)

*Status: Resolved.* Previously, `run_evidence_gathering_for_chapter()` truncated each chapter to its first 8,000 characters (~1,600–2,000 tokens), silently dropping up to 80–90% of content in long chapters. Similarly, `run_flow_analysis()` truncated introduction, methodology, and results excerpts to 1,800 characters each.
This has been resolved using dynamic token budgeting based on the 131,072-token context window of `openai/gpt-oss-120b`:
- **Evidence Gathering:** Reserves ~7,500 tokens for instructions, rubric descriptors, mechanical findings, output tokens (2,500), and safety margins, leaving ~123,000 tokens (~400,000 characters) for chapter text in a single call. Chapters are sent in full. In the rare case where an individual chapter exceeds 123,000 tokens, `_split_into_segments()` partitions the text on paragraph boundaries into sequential ordered segments, executes evidence gathering per segment, and merges findings (union of quotes deduplicated, best gaps preserved) without dropping text.
- **Flow Analysis:** Excerpts for introduction, methodology, and results are passed in full within a 126,000-token shared budget.
- **Scope of Changes:** All five fixes were strictly isolated to `app/services/agent_pipeline.py`, `app/models/thesis_critique.py`, and `app/dependencies.py`. No other files were modified.

### 7.5 Plagiarism Check Algorithm and Provider Default

The plagiarism service (`app/services/plagiarism_service.py`) does **not** use Turnitin, Copyleaks, or any commercial plagiarism API. It computes n-gram Jaccard similarity against:
- A hardcoded 3-paper `ACADEMIC_CORPUS` (static strings).
- Up to 2 results per chapter from OpenAlex title search (1.5s timeout, frequently times out).
- Cross-chapter self-repetition.

The schema default for `PlagiarismCheck.provider` has been corrected from `"copyleaks"` to `"openalex_vector_ngram"` to accurately reflect what the code actually generates and writes.

### 7.6 Redis Is Declared But Never Used

Redis is listed in `pyproject.toml`, `docker-compose.yml`, and `config.py` (with `REDIS_URL` and Upstash settings), but no service code reads from or writes to Redis. There is no caching, queueing, or pub/sub implementation.

### 7.7 Pydantic Schemas Are Partially Out of Sync

The Pydantic schemas in `app/schemas/thesis_critique.py` define a `weight`-based (0–1 float) and 1–5 integer scoring system (`level_1_desc`, `level_3_desc`, `level_5_desc`), but the actual database models and pipeline use `max_marks` (float marks) and three-level descriptors (`level_low_desc`, `level_mid_desc`, `level_high_desc`). These schemas appear to be remnants of an earlier design and are **not used** by any active endpoint — the thesis router defines its own inline Pydantic models.

### 7.8 `embedding` Columns Are Seeded But Never Queried

The `embedding` columns on `rubric_criteria` and `rubric_sub_criteria` are always `None`. The `GradedExample.embedding` column is populated when examples are created, but there is no retrieval query that uses it in the pipeline. The RAG-based few-shot retrieval path is defined in `select_relevant_excerpts()` but `GradedExample` embeddings are never fetched for scorer prompts in the current pipeline.

### 7.9 Frontend API Path Mismatch

`thesis.api.js` uses paths like `/thesis-submissions/{id}` and `/thesis-submissions/{id}/assess`, but the backend router prefix is `/api` and the actual routes are `/api/submissions/{id}`. This works because:
1. The Vite dev proxy forwards `/api` to the backend.
2. Dual route decorators exist for `@router.get("/submissions/{id}")` and `@router.get("/thesis-submissions/{id}")`.

However, some frontend calls (e.g. `uploadThesis` posting to `/thesis-submissions`) would need the Vite proxy to also prepend `/api`, and the backend doesn't have a `POST /api/thesis-submissions` route. This is a latent inconsistency.

### 7.10 No `logout` or `getMe` Backend Endpoints

`auth.api.js` on the frontend exports `logout()` and `getMe()` functions that call `POST /api/auth/logout` and `GET /api/auth/me`, but **neither endpoint exists** on the backend. Logout is handled purely client-side by clearing `localStorage`.

### 7.11 Vision Analysis Only Works for PDF

Figure image extraction via PyMuPDF (`fitz`) only works for PDF uploads. DOCX figures are not extracted or analyzed.

### 7.12 No Rate Limiting or Request Throttling

There is no rate limiting on any endpoint. The only protection against abuse is the max upload size (`THESIS_UPLOAD_MAX_MB`, default 20 MB).

### 7.13 `lecturer_id` Is Not a Foreign Key

`thesis_submissions.lecturer_id` is a plain `Integer` column with no `ForeignKey` constraint to `users.id`. Referential integrity between submissions and users is not enforced at the database level.

### 7.14 No Explicit TODO/FIXME Markers

A grep for `TODO`, `FIXME`, `HACK`, `XXX`, `STUB`, and `PLACEHOLDER` across the entire `app/` and `src/` directories returned **zero results**. There are no inline code annotations marking incomplete work.

---

## 8. Tech Stack Versions

### 8.1 Backend (from `pyproject.toml`)

| Package | Version Constraint | Purpose |
|---|---|---|
| Python | ≥ 3.11 | Runtime |
| `fastapi` | ≥ 0.110.0 | Web framework |
| `uvicorn[standard]` | ≥ 0.28.0 | ASGI server |
| `sqlalchemy[asyncio]` | ≥ 2.0.28 | ORM (async) |
| `asyncpg` | ≥ 0.29.0 | PostgreSQL async driver |
| `aiosqlite` | ≥ 0.20.0 | SQLite async driver (dev fallback) |
| `redis` | ≥ 5.0.3 | Redis client (declared, not used) |
| `pydantic-settings` | ≥ 2.2.1 | Settings management |
| `pydantic[email]` | ≥ 2.6.4 | Data validation |
| `passlib[bcrypt]` | ≥ 1.7.4 | Password hashing utilities |
| `bcrypt` | ≥ 4.0.1 | bcrypt implementation |
| `python-jose[cryptography]` | ≥ 3.3.0 | JWT encoding/decoding |
| `python-multipart` | ≥ 0.0.9 | File upload support |
| `python-docx` | ≥ 1.1.0 | DOCX text extraction and report generation |
| `pdfplumber` | ≥ 0.11.0 | PDF text extraction (fallback) |
| `groq` | ≥ 0.5.0 | Groq LLM API client |
| `anthropic` | ≥ 0.18.0 | Anthropic client (declared, not directly used — AgentRouter uses httpx) |
| `httpx` | ≥ 0.27.0 | HTTP client for AgentRouter, OpenAlex, Cloudinary proxy |
| `pgvector` | ≥ 0.3.0 | PostgreSQL vector extension support |
| `numpy` | ≥ 1.26.0 | Numerical operations for embeddings |
| `fastembed` | ≥ 0.4.0 | ONNX-based text embeddings |
| `cloudinary` | ≥ 1.40.0 | Cloud file storage (optional) |
| `requests` | ≥ 2.31.0 | HTTP client (declared, used minimally) |
| `hatchling` | — | Build system |

### 8.2 Frontend (from `package.json`)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.5 | UI framework |
| `react-dom` | ^19.2.5 | DOM rendering |
| `react-router-dom` | ^7.14.2 | Client-side routing |
| `zustand` | ^5.0.12 | State management |
| `axios` | ^1.15.2 | HTTP client |
| `framer-motion` | ^12.38.0 | Animations and page transitions |
| `lucide-react` | ^1.14.0 | Icon library |
| `react-markdown` | ^10.1.0 | Markdown rendering |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `@monaco-editor/react` | ^4.7.0 | In-browser code/text editor (for report editing) |
| `docx-preview` | ^0.4.0 | DOCX file preview in browser |
| `pdfjs-dist` | ^4.10.38 | PDF rendering in browser |
| `jszip` | ^3.10.1 | ZIP file handling |
| `date-fns` | ^4.1.0 | Date formatting |

**Dev dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.10 | Build tool |
| `@vitejs/plugin-react` | ^6.0.1 | React plugin for Vite |
| `tailwindcss` | ^3.4.19 | Utility-first CSS framework |
| `postcss` | ^8.5.12 | CSS processing |
| `autoprefixer` | ^10.5.0 | CSS vendor prefixing |
| `eslint` | ^10.2.1 | Linting |

### 8.3 Infrastructure (from `docker-compose.yml`)

| Service | Image | Purpose |
|---|---|---|
| Database | `pgvector/pgvector:pg15` | PostgreSQL 15 with pgvector extension |
| Cache | `redis:7-alpine` | Redis 7 (declared but not used by application code) |
| Backend | Custom Dockerfile | FastAPI + Uvicorn |

---

## Appendix A: File Map

```
app/
├── main.py                    FastAPI app entrypoint, lifespan, CORS, routers
├── config.py                  Pydantic Settings (env vars, model names, API keys)
├── database.py                SQLAlchemy async engine, session factory, pgvector init
├── dependencies.py            Auth dependency injection (JWT decode + mock fallback)
├── migrations.py              Startup schema migrations (ADD COLUMN, ALTER COLUMN)
├── seed.py                    Rubric data for all 4 degree levels + demo users
├── models/
│   ├── __init__.py            Model re-exports
│   ├── user.py                User model + UserRole enum
│   └── thesis_critique.py     All thesis-related models (7 tables)
├── schemas/
│   ├── auth.py                Register/Login Pydantic schemas
│   └── thesis_critique.py     Legacy Pydantic schemas (partially unused)
├── routers/
│   ├── __init__.py
│   ├── auth.py                /api/auth/register, /api/auth/login
│   └── thesis.py              All /api/submissions/* and /api/rubric/* endpoints
├── services/
│   ├── agent_pipeline.py      6-stage assessment pipeline + all LLM prompts
│   ├── auth_service.py        Register/login business logic
│   ├── compliance_check.py    Deterministic KNUST Guide compliance checks
│   ├── docx_exporter.py       Word document report generator
│   ├── embedding_service.py   Alternate embedding module (fastembed only)
│   ├── embeddings.py          Primary embedding module (sentence-transformers + fallback)
│   ├── grading_scale.py       KNUST grade bands + recommendation derivation
│   ├── plagiarism_service.py  OpenAlex + n-gram + vector similarity engine
│   ├── storage_service.py     Local file save + optional Cloudinary upload
│   ├── thesis_parser.py       DOCX/PDF text extraction, chapter chunking, metadata extraction
│   └── vision_service.py      Groq Vision API for PDF figure analysis
└── utils/
    ├── errors.py              Custom exception classes + global error handlers
    ├── hashing.py             bcrypt password hashing
    └── jwt.py                 JWT create/decode

src/
├── main.jsx                   React entrypoint
├── App.jsx                    Root component with BrowserRouter
├── api/
│   ├── axiosInstance.js        Axios config with auth interceptor
│   ├── auth.api.js             Login/register API calls
│   └── thesis.api.js           All thesis/rubric API calls
├── router/
│   └── AppRouter.jsx           Route definitions with ProtectedRoute
├── store/
│   └── authStore.js            Zustand auth state (user, token, isAuthenticated)
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── lecturer/
│   │   ├── SupervisorDashboardPage.jsx
│   │   ├── UploadThesisPage.jsx
│   │   ├── StructureMappingPage.jsx
│   │   ├── CriterionScoringPage.jsx
│   │   ├── VerificationCheckPage.jsx
│   │   ├── FinalNarrativeReportPage.jsx
│   │   └── RubricEditorPage.jsx
│   └── shared/
│       ├── LandingPage.jsx       (defined but not routed)
│       └── NotFoundPage.jsx
└── components/
    ├── DocumentViewer.jsx        PDF/DOCX inline viewer
    └── NavigationHeader.jsx      Top nav bar
```

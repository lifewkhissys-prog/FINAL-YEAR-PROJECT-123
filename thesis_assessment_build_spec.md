# Build Spec: Rubric-Grounded Multi-Agent Thesis Assessment System

## 0. Scope note

DevLab's FYP scope is now **only** this thesis assessment system — not the
broader assessment platform (guided/challenge modes, question authoring,
Judge0 code execution) that DevLab originally included. This spec covers the
backend and frontend for thesis assessment exclusively. Anything else DevLab
had (code execution, other assessment modes) is out of scope going forward —
see §12 for what to do with that existing code.

## 1. What this system does

A supervisor/lecturer uploads a student thesis document. The system runs a
preliminary readiness check, extracts and maps the thesis's logical structure,
retrieves the relevant rubric criteria for each section, scores the thesis
against each rubric dimension using an LLM agent (with a self-consistency
double-check), verifies each score against its own justification using a
second agent, then aggregates everything into a final weighted score plus a
full narrative report — all of which the supervisor can inspect and override.

The core idea: **never ask the LLM to grade the whole thesis holistically in
one shot.** Always ground it in retrieved rubric text, score one dimension at
a time, and force it to cite evidence for every score.

---

## 2. Tech stack (assumes you already have this working)

- **Backend:** FastAPI + async SQLAlchemy
- **Database:** PostgreSQL with `pgvector` extension (for rubric/example retrieval)
- **LLM:** Groq API (fast, cheap — good for multi-agent calls where you're
  making 5-10 LLM calls per thesis)
- **Embeddings:** `bge-small-en-v1.5` (you've used this before for Study Hub RAG)
- **Frontend:** React + Vite + Tailwind
- **File parsing:** `python-docx` for .docx, `pdfplumber` or `PyMuPDF` for PDF

---

## 3. Database schema

```sql
-- Top-level criteria (7 KNUST criteria, per degree level)
CREATE TABLE rubric_criteria (
    id SERIAL PRIMARY KEY,
    degree_level VARCHAR(50) NOT NULL,       -- 'undergraduate' | 'msc' | 'mphil' | 'phd'
    name VARCHAR(255) NOT NULL,              -- e.g. "Critical Review of Literature"
    description TEXT NOT NULL,               -- what this criterion evaluates
    max_marks FLOAT NOT NULL,                -- official mark allocation, e.g. 25 (out of 100)
    source VARCHAR(255),                     -- e.g. "KNUST HDR Guide 2016, Appendix 4.4" or "TBD - pending supervisor"
    embedding VECTOR(384),                   -- embedding of description, for retrieval
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sub-criteria: the lettered sub-parts KNUST's guide already breaks each
-- criterion into (e.g. Lit Review = 5 sub-items worth 5 marks each = 25).
-- Score at THIS level, not the top-level criterion — this matches both the
-- real KNUST rubric structure and the UI's per-sub-item scoring (see the
-- Criterion Scoring screen: "Comprehensiveness & Breadth, Max: 5").
CREATE TABLE rubric_sub_criteria (
    id SERIAL PRIMARY KEY,
    criterion_id INTEGER REFERENCES rubric_criteria(id),
    name VARCHAR(255) NOT NULL,              -- e.g. "Comprehensiveness & Breadth"
    description TEXT NOT NULL,
    max_marks FLOAT NOT NULL,                -- raw marks, e.g. 5 or 4 or 7 (matches KNUST's own sub-allocations)
    level_low_desc TEXT NOT NULL,            -- what a low score looks like
    level_mid_desc TEXT NOT NULL,            -- what a mid score looks like
    level_high_desc TEXT NOT NULL,           -- what a high (near-max) score looks like
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Maps sub-criteria to the thesis chapter they're primarily evidenced in.
-- This is what lets the frontend navigate by CHAPTER (Introduction,
-- Methodology, Literature Review, Data Analysis, Results, Discussion,
-- Conclusion, References — matching the UI) while scoring still happens
-- against the real KNUST sub-criteria underneath. Many-to-many: one
-- sub-criterion can draw evidence from more than one chapter, and one
-- chapter (e.g. "Data Analysis") can house more than one sub-criterion.
CREATE TABLE chapter_sub_criteria_map (
    id SERIAL PRIMARY KEY,
    chapter_name VARCHAR(100) NOT NULL,      -- 'introduction' | 'methodology' | 'literature_review' |
                                              -- 'data_analysis' | 'results' | 'discussion' | 'conclusion' | 'references'
    sub_criterion_id INTEGER REFERENCES rubric_sub_criteria(id),
    is_primary BOOLEAN DEFAULT TRUE          -- true if this is the main chapter for this sub-criterion,
                                              -- false if it's a secondary/supporting chapter
);
```

**Why the sub-criteria split matters:** KNUST's own rubric (Appendix 4.2/4.4)
already scores in lettered sub-parts with their own mark allocations (e.g.
MPhil Literature Review: 5 marks × 5 sub-criteria = 25 total) — this isn't an
invented structure, it's what the guide actually specifies. Scoring at the
sub-criterion level is both more accurate to the real rubric and matches what
the UI already does.

**Why the chapter mapping matters:** the Stitch UI navigates by thesis chapter
(8 nav items), which is how students and supervisors naturally think about a
thesis — not by abstract rubric criterion names. Keeping chapters as the
primary navigation while scoring against real sub-criteria underneath gets
you both: a UI that reads naturally, and scores that are still traceable to
the actual rubric for your evaluation chapter.

```sql
-- Reference examples: past graded excerpts tied to a sub-criterion (few-shot anchors)
CREATE TABLE graded_examples (
    id SERIAL PRIMARY KEY,
    sub_criterion_id INTEGER REFERENCES rubric_sub_criteria(id),
    excerpt TEXT NOT NULL,                   -- a real thesis excerpt
    assigned_score FLOAT NOT NULL,           -- raw marks, what a human gave it
    justification TEXT,                      -- why it got that score
    embedding VECTOR(384),
    created_at TIMESTAMP DEFAULT NOW()
);

-- One row per thesis submitted for assessment
CREATE TABLE thesis_submissions (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255),
    title VARCHAR(500),
    programme VARCHAR(255),
    institution VARCHAR(255),
    degree_level VARCHAR(50) NOT NULL,       -- 'undergraduate' | 'msc' | 'mphil' | 'phd' -- determines which rubric_criteria rows apply
    file_path VARCHAR(500),
    full_text TEXT NOT NULL,                 -- extracted plain text
    preliminary_check_passed BOOLEAN,        -- from Step 0.5
    preliminary_check_notes TEXT,            -- missing_elements + notes, if failed
    flow_analysis_table TEXT,                -- from Step 1.5: objectives/RQs/methods/results table
    plagiarism_score FLOAT,                  -- overall similarity percentage from Step 1.75
    plagiarism_report_url VARCHAR(500),      -- link to the full plagiarism provider report, if available
    plagiarism_checked_at TIMESTAMP,
    narrative_report TEXT,                   -- full synthesis agent output (markdown)
    narrative_report_edited TEXT,            -- supervisor's edited version, if any
    submitted_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending'     -- pending | preliminary_check_failed | assessing | completed | reviewed
);

-- One row per sub-criterion score for a given thesis
CREATE TABLE assessment_results (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES thesis_submissions(id),
    sub_criterion_id INTEGER REFERENCES rubric_sub_criteria(id),
    ai_score FLOAT NOT NULL,                 -- raw marks (0 to sub_criterion.max_marks), averaged from the two scorer runs
    ai_score_run_1 FLOAT,                    -- first scorer run
    ai_score_run_2 FLOAT,                    -- second scorer run (double-check)
    score_consistency_flag BOOLEAN,          -- true if run_1 and run_2 differed by more than 10% of max_marks
    ai_justification TEXT NOT NULL,          -- why the AI gave this score
    cited_text TEXT,                         -- exact thesis excerpt used as evidence
    confidence_score FLOAT,                  -- 0-100, the model's stated confidence (shown in the UI as e.g. "92%")
    verifier_passed BOOLEAN,                 -- did the verifier agent confirm this?
    verifier_notes TEXT,                     -- verifier's reasoning if it flagged an issue
    supervisor_override_score FLOAT,         -- NULL until supervisor edits it
    supervisor_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Plagiarism check results (Step 1.75) -- one row per checked section,
-- since a full thesis usually exceeds a single API call's word limit
CREATE TABLE plagiarism_checks (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES thesis_submissions(id),
    section_name VARCHAR(100),               -- which chapter/section this check covered
    similarity_percentage FLOAT,
    matched_sources JSONB,                   -- array of {source_url, matched_text, similarity} from the provider
    provider VARCHAR(50) DEFAULT 'copyleaks',
    checked_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. The agent pipeline (this is the core logic)

### Step 0: Preprocessing
1. Extract full text from the uploaded thesis (docx/pdf).
2. Chunk the thesis by section/chapter (use headings as split points —
   Introduction, Literature Review, Methodology, Results, Conclusion).
3. Store the full text and chunks.

### Step 0.5: Preliminary assessment (readiness gate)

Before running the full pipeline, check the thesis is actually ready to be
scored — this idea comes from RubiSCoT, a published academic framework for
AI-supported thesis assessment (Fröhlich & Schlippe, 2025), which halts
evaluation if fundamentals are missing rather than scoring a broken thesis
anyway.

One Groq call, using the submission's `degree_level` to set expectations:

```
Review the attached thesis. This is submitted at the {degree_level} level.

Check for the following before any detailed evaluation:
1. Are the core sections present (introduction, literature review or
   background, methodology, results/findings, conclusion)?
2. Are research questions, objectives, or hypotheses clearly stated anywhere
   in the document?
3. Is the thesis broadly consistent with what's expected at the
   {degree_level} level (e.g. a PhD should show more original contribution
   than an undergraduate FYP)?

Respond ONLY in this JSON format:
{
  "ready_for_evaluation": true or false,
  "missing_elements": ["list", "of", "missing", "fundamentals"],
  "notes": "brief explanation"
}
```

If `ready_for_evaluation: false`, stop the pipeline here, set
`thesis_submissions.status = 'preliminary_check_failed'`, and surface
`missing_elements` to the supervisor instead of running the full (expensive)
per-criterion pipeline on a document that isn't ready for it.

### Step 1: Retriever (per sub-criterion)
For each rubric sub-criterion (under the relevant degree level's 7 criteria):
1. Embed the sub-criterion's description.
2. Retrieve the top 2-3 most relevant thesis chunks (by cosine similarity)
   from the chapter(s) mapped to it in `chapter_sub_criteria_map`. Example:
   a Literature Review sub-criterion retrieves chunks from the Literature
   Review chapter; a Methodology sub-criterion retrieves from Methodology.
3. Retrieve 1-2 similar graded examples from `graded_examples` for that
   sub-criterion (few-shot anchors), if any exist yet.

### Step 1.5: Content extraction & flow analysis

Also from RubiSCoT — this step catches the specific kind of issue your
supervisor caught manually in the Elvis Atiah critique (declared scope not
matching what was actually implemented). One Groq call, run once per thesis
(not per criterion):

```
Analyze the attached thesis and extract the following:

- Objectives: each main objective stated in the introduction.
- Research Questions: each research question, and which objective(s) it
  addresses.
- Methodology: for each research question, the method used to address it.
- Results: for each research question, the main finding, referencing
  specific tables/figures if present.
- Discussion: how each result is discussed in relation to its objective.
- Conclusion: how conclusions link back to objectives and research questions.

Format as a table with columns: Objective | Research Question | Method Used |
Key Result | Discussed? (yes/no) | Concluded? (yes/no).

Flag explicitly: any objective with no corresponding research question, any
research question with no method, any result never discussed, and any
declared scope item (e.g. a feature/variable mentioned in the introduction or
methodology) that doesn't appear in the results/implementation.
```

Store the raw table output. Optionally, generate a Mermaid flow diagram from
it (objectives → research questions → methods → results → conclusions) to
visualize gaps for the frontend — this is a nice-to-have for later, not
required for v1.

**Feed this table into both the scorer agents (as extra grounding context for
sub-criteria touching scope/methodology alignment) and the synthesis
agent** — it's exactly the kind of cross-chapter evidence a narrow
per-criterion chunk retrieval would otherwise miss.

### Step 1.75: Plagiarism check

This is a **separate concern from the LLM scoring pipeline** — an LLM alone
can't reliably detect plagiarism against sources it wasn't trained on
(especially recent theses), so this needs a dedicated plagiarism API rather
than another Groq call. **Copyleaks** is the recommended provider: it has a
real developer API, the strongest accuracy among options with a public free
trial, and can also flag AI-generated text (useful given your topic).

**Honest constraint to plan around:** Copyleaks' free trial gives 2,500
words — a full thesis is typically 15,000-25,000+ words, so the free tier
won't cover a complete document. For your FYP demo, either:
1. Check only the highest-risk sections (Literature Review + Methodology,
   where copying is most common) within the free-word budget, clearly
   labelled as a partial check, or
2. Budget for a small paid tier if you want full-document coverage — costs
   are usage-based and low for occasional student-project volume.

Implementation:
```python
# One call per section (or per thesis, if within word budget)
# See Copyleaks' API docs for the current submission/webhook flow —
# their scans are typically async: you submit text, then receive results
# via a webhook or by polling a status endpoint.
```

Store one row per checked section in `plagiarism_checks`, and roll up an
overall `plagiarism_score` onto `thesis_submissions` (e.g. the average or max
similarity percentage across checked sections). Surface this on the
Supervisor Dashboard exactly as the Stitch UI already shows it ("Priority
Alerts: Plagiarism flags pending review") — that field just needs a real
value behind it now instead of being static.

### Step 2: Scorer agent (per sub-criterion)
Send a single Groq API call per sub-criterion with this prompt structure:

```
You are assessing ONE specific sub-criterion of a thesis. Do not evaluate
anything outside this sub-criterion. Score in RAW MARKS out of the maximum
given below — do not normalize to any other scale.

SUB-CRITERION: {sub_criterion.name}
PART OF CRITERION: {criterion.name}
DESCRIPTION: {sub_criterion.description}
MAXIMUM MARKS: {sub_criterion.max_marks}

SCORING GUIDE:
Low (near 0): {sub_criterion.level_low_desc}
Mid (~50% of max): {sub_criterion.level_mid_desc}
High (near max): {sub_criterion.level_high_desc}

REFERENCE EXAMPLES (previously graded by a human):
{for each graded_example: excerpt + assigned_score + justification}

RELEVANT THESIS EXCERPTS TO EVALUATE:
{retrieved chunks for this sub-criterion}

Respond ONLY in this JSON format:
{
  "score": <number, 0 to {sub_criterion.max_marks}, in increments of 0.5>,
  "justification": "<2-3 sentences explaining the score>",
  "cited_text": "<the exact excerpt from the thesis that most supports this score>",
  "confidence": <integer 0-100, how confident you are in this score>
}
```

Parse the JSON response and store it in `assessment_results`.

**Double-check (consistency re-run):** also from RubiSCoT — run this exact
same call a second time (same inputs, same prompt) and store both results.
If the two scores differ by more than 10% of `max_marks`, flag it for
supervisor attention (this usually means the level descriptions are
ambiguous for this case, or the retrieved chunks didn't give the model
enough to be confident). If they're within that threshold, average them for
the score that goes into aggregation. This is a cheap, no-extra-infrastructure
way to catch unstable/unreliable scoring before it reaches the supervisor,
and gives you a second useful metric for your FYP evaluation chapter (score
stability, not just accuracy).

### Step 3: Verifier agent (per sub-criterion)
Send a second Groq call to check consistency, NOT to re-grade from scratch:

```
You are verifying a grading decision, not re-grading.

SUB-CRITERION: {sub_criterion.name}
MAXIMUM MARKS: {sub_criterion.max_marks}
SCORE GIVEN: {score}
JUSTIFICATION GIVEN: {justification}
CITED TEXT: {cited_text}

Does the cited text actually support this score, given the scoring guide
below?

SCORING GUIDE:
Low: {level_low_desc}
Mid: {level_mid_desc}
High: {level_high_desc}

Respond ONLY in this JSON format:
{
  "verified": true or false,
  "notes": "<if false, explain the mismatch; if true, brief confirmation>"
}
```

If `verified: false`, flag this result for supervisor attention (don't
auto-correct — surface it, let the human decide).

### Step 4: Aggregation
```
criterion_score = sum(sub_criterion.ai_score for each sub-criterion under that criterion)
final_score = sum(criterion_score for each of the 7 criteria)  # already out of 100, no extra scaling needed
```
Since sub-criteria are already scored in raw marks matching the real KNUST
allocations, the final score sums directly to the 0-100 scale the department
already uses — no normalization step required.

### Step 5: Synthesis agent (produces the full narrative report)

This is the step that makes the output feel like what the supervisor actually
writes, instead of just a table of numbers. It runs ONCE per thesis, after all
7 criterion scores + justifications + cited text exist. It does NOT re-score
anything — it only synthesizes what the scorer/verifier agents already
produced, plus a fuller read of the thesis text, into a single narrative
report matching the supervisor's structure and depth.

Feed it:
- All 7 criterion scores, justifications, cited text, and verifier notes
- The full thesis text chunked by chapter (Introduction, Lit Review,
  Methodology, Results, Conclusion) — not just the narrow per-criterion
  retrieval slices, since cross-chapter comparisons (e.g. "scope in Ch.1
  doesn't match implementation in Ch.3") require seeing more at once
- Student name, thesis title, programme, institution (from submission metadata)

Prompt structure:

```
You are writing a full critical assessment report on a Master's/Bachelor's
thesis, in the style and depth of a supervisor's written review. You have
already scored the thesis against rubric sub-criteria below — use these as
your evidence base, do not re-score from scratch.

STUDENT: {student_name}
THESIS TITLE: {title}
PROGRAMME: {programme}
INSTITUTION: {institution}

SUB-CRITERION SCORES AND EVIDENCE:
{for each sub-criterion, grouped by parent criterion: name, score/max_marks,
justification, cited_text, verifier_notes}

PLAGIARISM CHECK RESULTS:
{overall similarity percentage and any flagged matched sources, or "not
checked" if the plagiarism step was skipped}

FULL THESIS TEXT BY CHAPTER:
{chapter-chunked thesis text}

Write a report with EXACTLY these sections, matching this depth and tone:

1. OVERALL SUPERVISOR'S ASSESSMENT
   - 1 paragraph in second person addressing the student directly, summarizing
     the thesis topic, its relevance, and overall judgement.
   - One bolded "overall judgement" line stating whether it's acceptable,
     conditionally acceptable, or needs major revision.

2. MAJOR STRENGTHS
   - 4-6 bullet points, each bolded with a short label followed by 1-2
     sentences of explanation, grounded in the actual thesis content.

3. MAJOR CORRECTIONS REQUIRED
   - A markdown table with columns: No. | Issue Identified | Why It Matters |
     Required Correction. Only include issues that are actually supported by
     the criterion scores/justifications and cited text — do not invent
     issues not grounded in the evidence above.

4. CHAPTER-BY-CHAPTER CRITICAL ASSESSMENT
   - One subsection per chapter (Introduction, Literature Review,
     Methodology, Results and Analysis, Conclusions and Recommendations).
   - 3-5 bullet points per chapter, specific to that chapter's content,
     referencing the relevant criterion scores where applicable.

5. TECHNICAL AND METHODOLOGICAL COMMENTS
   - Bulleted, bolded sub-labels (e.g. "Dataset suitability:", "Model
     formulation:") each followed by a specific technical comment grounded
     in the thesis text and criterion evidence.

6. FORMATTING, LANGUAGE, AND REFERENCING CORRECTIONS
   - Bulleted list of concrete, specific corrections (not generic advice).

7. PRIORITY ACTION PLAN FOR THE CANDIDATE
   - A numbered, sequential list (First, Second, Third...) ordering the
     corrections by priority/dependency, so the student knows what to fix
     first.

8. FINAL RECOMMENDATION
   - A closing paragraph plus a bolded "Decision:" line, plus a short
     "Supervisor's closing note to the supervisee" paragraph in a
     supportive but direct tone, addressed to the student by name.

Ground every specific claim in the criterion scores/evidence and thesis text
provided above. Do not fabricate issues, statistics, or thesis content that
isn't present in what was given to you.
```

Store the full output as one long text field (see schema addition below) and
render it as formatted markdown/HTML on the results page. This call will be
long — budget for a bigger `max_tokens` (e.g. 3000-4000) than the scorer/
verifier calls.

**Important:** since this step effectively drafts the same kind of feedback a
supervisor writes by hand, treat its output as a *first draft for supervisor
review*, not a final verdict — this matters both practically (he should still
be able to edit it before it goes to a student) and for your FYP framing
(the system assists the supervisor, it doesn't replace his judgement).

---

## 5. API endpoints (FastAPI)

```
POST   /rubric/criteria              # create/seed top-level rubric criteria
GET    /rubric/criteria              # list current rubric (with nested sub-criteria)
PATCH  /rubric/sub-criteria/{id}     # supervisor edits max_marks/description for a sub-criterion
GET    /rubric/chapters              # list the 8 chapter names + which sub-criteria map to each

POST   /submissions                  # upload thesis, extract text, store
POST   /submissions/{id}/assess      # trigger the agent pipeline (async/background task)
GET    /submissions/{id}/preliminary-check   # get the readiness gate result
GET    /submissions/{id}/flow-analysis       # get the objectives/RQ/method/result table
GET    /submissions/{id}/plagiarism          # get plagiarism_checks rows + overall score
GET    /submissions/{id}/results             # get all sub-criterion scores + justifications
GET    /submissions/{id}/results/by-chapter/{chapter_name}  # same, filtered to one chapter (for the nav)
PATCH  /submissions/{id}/results/{sub_criterion_id}   # supervisor overrides a score
GET    /submissions/{id}/report       # get the full narrative report (synthesis agent output)
PATCH  /submissions/{id}/report       # supervisor edits/finalizes the narrative report

POST   /graded-examples              # supervisor adds a graded excerpt (grows your dataset)
```

Use a FastAPI `BackgroundTasks` for the `/assess` endpoint since it now makes
~23+ sequential calls per thesis (1 preliminary check + 1 flow analysis +
1-2 plagiarism checks + ~15-20 sub-criteria × 2 scorer runs (double-check) +
~15-20 × verifier + 1 synthesis — the exact sub-criteria count depends on how
many you seed per criterion) — this takes a while, so don't block the
request. If you don't already have a task queue (Celery/Redis) set up for
DevLab specifically, `BackgroundTasks` alone is sufficient for a single-user
FYP demo; only add a real queue if you need to process multiple theses
concurrently.

---

## 6. Frontend pages (React)

This maps directly onto the 6 Stitch screens you already have code for —
below is what each one needs to actually connect to, on top of what's already
built:

1. **Upload Thesis** — matches as-is: student name, degree level, thesis
   title, file upload. Wire the "Start Evaluation" submit to
   `POST /submissions`.

2. **Structure Mapping & Alignment** — matches Step 1.5 (flow analysis) well.
   Wire the "Logical Alignment Matrix" table to
   `GET /submissions/{id}/flow-analysis`. The "Preliminary Gate Check"
   warning banner at the top should pull from
   `GET /submissions/{id}/preliminary-check` — if `ready_for_evaluation:
   false`, this banner is the primary content of the page (the alignment
   matrix below it won't have meaningful data yet). Add the plagiarism
   result here too, or as its own small card — the screen doesn't have one
   yet, but the "Scope Analysis" panel's evidence-callout pattern (quote +
   confidence score) is a good template to reuse for a plagiarism match.

3. **Per-Criterion Scoring** (dual-pane: Literature Review shown) — the
   sidebar's 8 chapters map to `chapter_sub_criteria_map`; clicking a chapter
   loads `GET /submissions/{id}/results/by-chapter/{chapter_name}`, which
   returns the sub-criteria scoped to that chapter (e.g. "Literature Review"
   chapter → the 5 KNUST literature-review sub-criteria). Each sub-criterion
   card wires to one `assessment_results` row: the slider/number input is
   `supervisor_override_score`, "AI Suggests: X" is `ai_score`, and the
   "Double Scored" disagreement state is `score_consistency_flag`. The
   right-pane "Section Subtotal" sums the sub-criteria scores under the
   current chapter's mapped criterion(s).

4. **Verification & Consistency Check** — matches Step 3 (verifier) closely.
   Wire "Overall Consistency" to an aggregate of `verifier_passed` across all
   sub-criteria for this thesis, and each detail card to one
   `assessment_results` row's `verifier_notes`/`confidence_score`. "Confirm"
   sets `verifier_passed = true` explicitly (supervisor sign-off, separate
   from the AI's own verifier_passed value); "Edit Score & Reasoning" opens
   the override field from the scoring screen.

5. **Final Narrative Report** — the Recommendation selector (Pass/Revise/Fail)
   should save into a new `thesis_submissions.supervisor_recommendation`
   field (add this column — it wasn't in the original schema draft). The
   Overall Assessment / Strengths / Corrections / Chapter Notes / Action Plan
   text areas are pre-filled from `narrative_report` (parse it into these
   sections) and save back to `narrative_report_edited` when the supervisor
   types in them.

6. **Supervisor Dashboard** — lists `thesis_submissions` rows. "Current Step"
   should reflect the chapter/step the supervisor last viewed, not literally
   thesis progress (an AI pipeline run finishes all steps at once — this is
   about *review* progress, i.e. which chapters the supervisor has looked at
   so far). "Priority Alerts: Plagiarism flags" now has a real source —
   `plagiarism_checks` rows above `similarity_percentage` threshold you set
   (e.g. flag anything over 20-25%).

**Rubric editor** wasn't one of the 6 screens delivered — you'll still need
a page (or an admin section) where the supervisor can view/edit sub-criteria
descriptions and `max_marks`, since that's what makes this his tool rather
than a black box. Worth adding to the Antigravity build list even though
Stitch didn't generate it.

---

## 7. Seeding the initial rubric

You now have two **official** rubrics — from KNUST's "Guide for Preparation and
Evaluation of Higher Degree Research Thesis" (2016), Appendix 4.2 (PhD) and
Appendix 4.4 (MPhil). Two levels are **not covered** by this document:

- **Taught Master's (MSc/MA/MBA etc.)** — the guide names this as a distinct
  thesis type in its intro (lower methodological expectation than MPhil), but
  gives it no separate scored appendix. It's unclear whether it's graded on
  the MPhil rubric as-is, a lightened version of it, or something
  department-specific.
- **Undergraduate/BSc FYP** — not mentioned anywhere in this document at all.

Ask your supervisor about both today. Don't invent criteria for either level
yourself and present them as official.

**The KNUST guide already specifies sub-criteria with their own mark
allocations** (lettered a/b/c under each numbered criterion) — seed
`rubric_sub_criteria` directly from these, not an invented breakdown:

```json
// MPhil (Appendix 4.4) — 7 criteria, 20 sub-criteria, sums to 100
[
  {"criterion": "1. Statement of Problem & Justification", "criterion_max": 10, "sub_criteria": [
    {"name": "Ability to articulate topic's import and implications", "max_marks": 3},
    {"name": "Justification (local/international relevance)", "max_marks": 3},
    {"name": "Statement of research questions/objectives/hypotheses", "max_marks": 4}
  ]},
  {"criterion": "2. Critical Review of Literature & Frameworks", "criterion_max": 25, "sub_criteria": [
    {"name": "Scholarly analysis and criticism of relevant research", "max_marks": 5},
    {"name": "Meticulous citation of relevant scholarly work", "max_marks": 5},
    {"name": "Competence in understanding/evaluating material", "max_marks": 5},
    {"name": "Drawing differences/similarities, identifying gaps", "max_marks": 5},
    {"name": "Developing robust conceptual/theoretical frameworks", "max_marks": 5}
  ]},
  {"criterion": "3. Research Design & Methodology", "criterion_max": 20, "sub_criteria": [
    {"name": "Statement of design/blueprint, with justification", "max_marks": 6},
    {"name": "Sampling procedures (size, frame, technique, justification)", "max_marks": 7},
    {"name": "Data collection/analysis framework", "max_marks": 7}
  ]},
  {"criterion": "4. Analysis of Data & Presentation of Results", "criterion_max": 12.5, "sub_criteria": [
    {"name": "Use of appropriate analysis methods/techniques", "max_marks": 7},
    {"name": "Accurate and clear presentation of results", "max_marks": 5.5}
  ]},
  {"criterion": "5. Statement of Findings & Discussion", "criterion_max": 12.5, "sub_criteria": [
    {"name": "Findings/discussion based on thesis data", "max_marks": 3},
    {"name": "Coherence in presentation of argument", "max_marks": 3},
    {"name": "Presentation of major findings", "max_marks": 3},
    {"name": "Discussion reflecting results in context of RQs/theory", "max_marks": 3.5}
  ]},
  {"criterion": "6. Conclusions & Recommendations", "criterion_max": 10, "sub_criteria": [
    {"name": "Conclusive statements incorporating major findings", "max_marks": 2},
    {"name": "Critical discussion of key issues arising", "max_marks": 2},
    {"name": "Statement of major contributions to knowledge", "max_marks": 2},
    {"name": "Addressing limitations", "max_marks": 2},
    {"name": "Recommendations and future research directions", "max_marks": 2}
  ]},
  {"criterion": "7. Presentation", "criterion_max": 10, "sub_criteria": [
    {"name": "Formatting, language, citation, referencing, sectioning", "max_marks": 10}
  ]}
]

// PhD (Appendix 4.2) — same 7 criteria and same sub-criteria NAMES, different
// marks per the guide: criterion maxes are 15/20/15/15/15/10/10. Scale each
// sub-criterion proportionally within its criterion (e.g. PhD Lit Review's 5
// sub-items are 4 marks each instead of MPhil's 5, since PhD criterion total
// is 20 not 25) — or copy the exact PhD sub-marks from Appendix 4.2 in the
// source document if you still have it (its sub-splits mirror MPhil's pattern).
```

For `level_low_desc`/`level_mid_desc`/`level_high_desc` on each sub-criterion:
the KNUST guide gives qualitative guidelines at the whole-criterion level
(e.g. "scores close to 75% of marks if demonstrating high competence in 75%
of listed criteria") rather than per-sub-criterion descriptions — you'll need
to write a short 1-sentence low/mid/high description for each sub-criterion
yourself, grounded in what that sub-criterion is actually checking (e.g. for
"Sampling procedures": low = no justification for sample size/technique; mid
= sample size stated but weakly justified; high = sample size, frame, and
technique all clearly justified with reference to the research design).

Set `source` on every MPhil/PhD criterion row to `"KNUST HDR Guide 2016,
Appendix 4.4"` or `"...Appendix 4.2"` respectively. Leave `source` as
`"TBD - pending supervisor"` for MSc/undergraduate until you have a real
answer.

**Chapter mapping (`chapter_sub_criteria_map`) — suggested defaults**, adjust
once you see how your specific thesis samples are structured:

```json
[
  {"chapter": "introduction", "sub_criteria_from": "1. Statement of Problem & Justification"},
  {"chapter": "literature_review", "sub_criteria_from": "2. Critical Review of Literature & Frameworks"},
  {"chapter": "methodology", "sub_criteria_from": "3. Research Design & Methodology"},
  {"chapter": "data_analysis", "sub_criteria_from": "4. Analysis of Data & Presentation of Results"},
  {"chapter": "results", "sub_criteria_from": "4. Analysis of Data & Presentation of Results", "is_primary": false},
  {"chapter": "discussion", "sub_criteria_from": "5. Statement of Findings & Discussion"},
  {"chapter": "conclusion", "sub_criteria_from": "6. Conclusions & Recommendations"},
  {"chapter": "references", "sub_criteria_from": "7. Presentation", "is_primary": false}
]
```
Note "Presentation" (criterion 7) actually applies across the *whole*
document, not just references — map it as a secondary (`is_primary: false`)
criterion under every chapter, or give it its own always-visible summary
card in the UI instead of hiding it inside "References" only.

---

## 8. Evaluation plan (for your FYP results chapter)

1. Every time the supervisor overrides a score, log both the AI score and
   his override — this pair is your ground truth data.
2. Once you have ~15-20 scored theses (or criterion-level scores), compute
   **Quadratic Weighted Kappa (QWK)** between AI scores and supervisor scores
   per criterion and overall.
3. Compare against a naive baseline: one single-prompt holistic Groq call
   with no rubric retrieval, no decomposition, no verifier — this is your
   "before" condition that justifies the whole architecture.
4. Report: QWK for naive baseline vs. QWK for your pipeline. This comparison
   IS your results chapter.

---

## 9. Implementation notes: using Groq for the agent calls

Groq is not an "agent framework" — there's no special product to plug your
pipeline into. Every "agent" in this spec (scorer, verifier, synthesis) is
just a separate Groq chat completion call with a different prompt, called in
sequence from your own FastAPI code. The retriever step isn't a Groq call at
all — it's your own embedding + cosine similarity lookup against pgvector.

**SDK setup:**
```python
from groq import Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
```
(Or use the OpenAI SDK pointed at `https://api.groq.com/openai/v1` if you'd
rather reuse OpenAI-style code — GroqCloud is OpenAI-compatible.)

**Use Structured Outputs for the scorer and verifier calls** (not the
synthesis call, which is prose). This guarantees valid JSON matching your
schema instead of hoping the model formats it right:

```python
response = client.chat.completions.create(
    model="<pick a model that supports strict structured outputs — check
           Groq's docs for the current list>",
    messages=[...],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "criterion_score",
            "schema": {
                "type": "object",
                "properties": {
                    "score": {"type": "integer", "minimum": 1, "maximum": 5},
                    "justification": {"type": "string"},
                    "cited_text": {"type": "string"}
                },
                "required": ["score", "justification", "cited_text"]
            },
            "strict": True
        }
    }
)
result = json.loads(response.choices[0].message.content)
```

Optional: use the `instructor` library on top of the Groq client to get typed
Pydantic objects back directly instead of parsing JSON yourself — less
boilerplate, same underlying mechanism.

**For the synthesis (narrative report) call:** no structured output needed —
just a plain text completion since the output is markdown prose, not JSON.
Use a higher `max_tokens` (3000-4000) since this response is long.

**Important constraint:** Structured Outputs currently do not work together
with streaming or tool use in the same call, and `strict: true` is only
supported on certain models — confirm your chosen model supports it before
building all four steps around it, since not every Groq model does.

**Cost/speed note:** this pipeline now makes ~22 Groq calls per thesis
(1 preliminary check + 1 flow analysis + 7 criteria × 2 scorer runs
(double-check) + 7 × verifier + 1 synthesis). Groq is fast and cheap enough
that this is fine sequentially for a single thesis, but if you ever batch-
process many theses (e.g. for your QWK evaluation across 15-20 documents),
consider Groq's Batch Processing tier for the bulk run to reduce cost.

---

## 10. Build order (do it in this sequence)

1. DB schema + seed rubric criteria (no AI yet — just get the data model right)
2. File upload + text extraction + chunking (test with Elvis Atiah's thesis
   if you still have access to it, or any other thesis PDF)
3. Preliminary check agent (Step 0.5) — get this working standalone first,
   since it gates everything after it
4. Retriever: embed rubric criteria + thesis chunks, get cosine similarity
   retrieval working (no LLM calls yet — just check retrieval quality manually)
5. Content extraction & flow analysis agent (Step 1.5)
6. Scorer agent: one criterion, one Groq call, verify JSON parsing works
7. Loop scorer across all 7 criteria, then add the double-check re-run
8. Verifier agent
9. Aggregation + final score calculation
10. Synthesis agent (full narrative report)
11. Results + narrative report pages (React)
12. Override functionality
13. Only then: graded examples management + evaluation/QWK scripts

Don't build the frontend before steps 6-8 work reliably from a script/notebook
— you want to know the AI logic is sound before wiring up the UI around it.

---

## 11. Cleaning up the rest of DevLab's codebase

Since scope is now thesis-assessment-only, everything else DevLab had (guided/
challenge assessment modes, question authoring system, Judge0 code execution
integration) is out of scope and should be removed or archived so the codebase
matches what you're actually presenting as your FYP.

**I can't do this cleanup without seeing the actual code** — I don't have
access to DevLab's repository in this conversation. To do this properly,
either:
1. Share the GitHub repo URL (if public, or give me read access) so I can
   look at the actual file/folder structure and tell you precisely what to
   remove vs. keep, or
2. Paste/upload the relevant file tree or `git ls-files` output so I can map
   out a removal plan even without full file contents.

Once I can see it, the general approach will be: keep anything shared
(auth, DB connection setup, base FastAPI app config, deployment config for
Render) and anything specifically for thesis assessment; remove routes,
models, and frontend pages tied to guided/challenge modes, question
authoring, and Judge0/code execution. Don't delete blindly — check for shared
dependencies first (e.g. a shared `User` model used by both thesis assessment
and the old modes should stay).
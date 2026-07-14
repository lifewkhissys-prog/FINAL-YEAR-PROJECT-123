# Build Spec: Rubric-Grounded Multi-Agent Thesis Assessment System

## 1. What this system does

A supervisor/lecturer uploads a student thesis document. The system extracts
the text, retrieves the relevant rubric criteria for each section, scores the
thesis against each rubric dimension using an LLM agent, verifies each score
against its own justification using a second agent, then aggregates everything
into a final weighted score with a full breakdown the supervisor can inspect
and override.

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
-- The rubric itself: criteria + scoring levels + weights
CREATE TABLE rubric_criteria (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,              -- e.g. "Metric & Technical Consistency"
    description TEXT NOT NULL,               -- what this criterion evaluates
    weight FLOAT NOT NULL,                   -- e.g. 0.25 (must sum to 1.0 across all criteria)
    level_1_desc TEXT NOT NULL,              -- what a score of 1 looks like
    level_3_desc TEXT NOT NULL,              -- what a score of 3 looks like
    level_5_desc TEXT NOT NULL,              -- what a score of 5 looks like
    embedding VECTOR(384),                   -- embedding of description, for retrieval
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reference examples: past graded excerpts tied to a criterion (few-shot anchors)
CREATE TABLE graded_examples (
    id SERIAL PRIMARY KEY,
    criterion_id INTEGER REFERENCES rubric_criteria(id),
    excerpt TEXT NOT NULL,                   -- a real thesis excerpt
    assigned_score INTEGER NOT NULL,         -- 1-5, what a human gave it
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
    file_path VARCHAR(500),
    full_text TEXT NOT NULL,                 -- extracted plain text
    narrative_report TEXT,                   -- full synthesis agent output (markdown)
    narrative_report_edited TEXT,            -- supervisor's edited version, if any
    submitted_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending'     -- pending | assessing | completed | reviewed
);

-- One row per criterion score for a given thesis
CREATE TABLE assessment_results (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES thesis_submissions(id),
    criterion_id INTEGER REFERENCES rubric_criteria(id),
    ai_score INTEGER NOT NULL,               -- 1-5, from the scoring agent
    ai_justification TEXT NOT NULL,          -- why the AI gave this score
    cited_text TEXT,                         -- exact thesis excerpt used as evidence
    verifier_passed BOOLEAN,                 -- did the verifier agent confirm this?
    verifier_notes TEXT,                     -- verifier's reasoning if it flagged an issue
    supervisor_override_score INTEGER,       -- NULL until supervisor edits it
    supervisor_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. The agent pipeline (this is the core logic)

### Step 0: Preprocessing
1. Extract full text from the uploaded thesis (docx/pdf).
2. Chunk the thesis by section/chapter (use headings as split points —
   Introduction, Literature Review, Methodology, Results, Conclusion).
3. Store the full text and chunks.

### Step 1: Retriever (per criterion)
For each of the 7 rubric criteria:
1. Embed the criterion's description.
2. Retrieve the top 2-3 most relevant thesis chunks (by cosine similarity)
   that likely relate to that criterion. Example: "Metric & Technical
   Consistency" retrieves chunks from the Results chapter; "Literature Review
   Quality" retrieves chunks from Chapter 2.
3. Retrieve 1-2 similar graded examples from `graded_examples` for that
   criterion (few-shot anchors), if any exist yet.

### Step 2: Scorer agent (per criterion)
Send a single Groq API call per criterion with this prompt structure:

```
You are assessing ONE dimension of a Master's thesis. Do not evaluate
anything outside this dimension.

CRITERION: {criterion.name}
DESCRIPTION: {criterion.description}

SCORING GUIDE:
1 (weak): {criterion.level_1_desc}
3 (adequate): {criterion.level_3_desc}
5 (excellent): {criterion.level_5_desc}

REFERENCE EXAMPLES (previously graded by a human):
{for each graded_example: excerpt + assigned_score + justification}

RELEVANT THESIS EXCERPTS TO EVALUATE:
{retrieved chunks for this criterion}

Respond ONLY in this JSON format:
{
  "score": <integer 1-5>,
  "justification": "<2-3 sentences explaining the score>",
  "cited_text": "<the exact excerpt from the thesis that most supports this score>"
}
```

Parse the JSON response and store it in `assessment_results`.

### Step 3: Verifier agent (per criterion)
Send a second Groq call to check consistency, NOT to re-grade from scratch:

```
You are verifying a grading decision, not re-grading.

CRITERION: {criterion.name}
SCORE GIVEN: {score}
JUSTIFICATION GIVEN: {justification}
CITED TEXT: {cited_text}

Does the cited text actually support this score, given the scoring guide
below?

SCORING GUIDE:
1: {level_1_desc}
3: {level_3_desc}
5: {level_5_desc}

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
final_score = sum(criterion.weight * result.ai_score for each criterion)
```
Scale to whatever your department uses (e.g. multiply by 20 for a 0-100 scale
if weights sum to 1.0 and scores are 1-5... adjust to match actual grading
scale used).

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
already scored the thesis against 7 rubric criteria below — use these as
your evidence base, do not re-score from scratch.

STUDENT: {student_name}
THESIS TITLE: {title}
PROGRAMME: {programme}
INSTITUTION: {institution}

CRITERION SCORES AND EVIDENCE:
{for each criterion: name, score, justification, cited_text, verifier_notes}

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
POST   /rubric/criteria              # create/seed rubric criteria
GET    /rubric/criteria              # list current rubric
PATCH  /rubric/criteria/{id}         # supervisor edits weight/description

POST   /submissions                  # upload thesis, extract text, store
POST   /submissions/{id}/assess      # trigger the agent pipeline (async/background task)
GET    /submissions/{id}/results      # get all criterion scores + justifications
PATCH  /submissions/{id}/results/{criterion_id}   # supervisor overrides a score
GET    /submissions/{id}/report       # get the full narrative report (synthesis agent output)
PATCH  /submissions/{id}/report       # supervisor edits/finalizes the narrative report

POST   /graded-examples              # supervisor adds a graded excerpt (grows your dataset)
```

Use a FastAPI `BackgroundTasks` or Celery (you already have Celery set up from
Uniloomy) for the `/assess` endpoint since it's making 14 sequential LLM calls
(7 criteria x scorer + verifier) — don't block the request.

---

## 6. Frontend pages (React)

1. **Upload page** — drag/drop thesis file, student name, title.
2. **Rubric editor page** — supervisor can view/edit the 7 criteria, their
   weights, and level descriptions. This is what makes it *his* tool, not a
   black box.
3. **Results page** — one card per criterion showing:
   - AI score (1-5) with a colored badge
   - Justification text
   - Cited excerpt (highlighted/quoted)
   - Verifier flag if `verified: false` (red warning icon)
   - An editable "supervisor override" field
   - Final weighted score at the top, recalculated live as he overrides scores
4. **Examples management page** — lets him add more graded excerpts over time,
   which grows your `graded_examples` table — this is also your evaluation
   dataset for the FYP writeup.

---

## 7. Seeding the initial rubric

Use this as your seed data (derived from the supervisor's critique pattern —
confirm/adjust with him before finalizing):

```json
[
  {"name": "Metric & Technical Consistency", "weight": 0.25},
  {"name": "Claims-Evidence Alignment", "weight": 0.20},
  {"name": "Scope-Methodology-Implementation Alignment", "weight": 0.15},
  {"name": "Methodological Rigor", "weight": 0.15},
  {"name": "Literature Review Quality", "weight": 0.10},
  {"name": "Referencing & Citation Integrity", "weight": 0.08},
  {"name": "Structure & Presentation", "weight": 0.07}
]
```
(Full level descriptions from the earlier draft — paste those into the
`level_1_desc`/`level_3_desc`/`level_5_desc` fields per criterion.)

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

## 10. Implementation notes: using Groq for the agent calls

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

**Cost/speed note:** this pipeline makes ~14 Groq calls per thesis (7 x
scorer + 7 x verifier) plus 1 synthesis call. Groq is fast and cheap enough
that this is fine sequentially for a single thesis, but if you ever batch-
process many theses (e.g. for your QWK evaluation across 15-20 documents),
consider Groq's Batch Processing tier for the bulk run to reduce cost.

---

## 11. Build order (do it in this sequence)

1. DB schema + seed rubric criteria (no AI yet — just get the data model right)
2. File upload + text extraction + chunking (test with Elvis Atiah's thesis
   if you still have access to it, or any other thesis PDF)
3. Retriever: embed rubric criteria + thesis chunks, get cosine similarity
   retrieval working (no LLM calls yet — just check retrieval quality manually)
4. Scorer agent: one criterion, one Groq call, verify JSON parsing works
5. Loop scorer across all 7 criteria
6. Verifier agent
7. Aggregation + final score calculation
8. Results page (React) showing everything
9. Override functionality
10. Only then: graded examples management + evaluation/QWK scripts

Don't build the frontend before step 4-6 work reliably from a script/notebook
— you want to know the AI logic is sound before wiring up the UI around it.

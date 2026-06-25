# DevLab — Question Creation Flow (Hybrid Approach)

This document covers how lecturers create questions in DevLab. It defines the two axes that describe every question — **Type** and **Interaction Mode** — and what the lecturer needs to configure for each combination.

---

## Two Axes of Every Question

### Axis 1: Question Type
What is being tested.

| Type | Description |
|---|---|
| `mcq` | Multiple choice, single or multi-select |
| `short_answer` | Free text response, manually or keyword graded |
| `coding` | Write code that passes test cases |
| `sql_problem` | Write SQL against a provided schema/dataset |

### Axis 2: Interaction Mode
How the student engages with the question.

| Mode | Description |
|---|---|
| `direct` | Student reads the problem and submits one answer. No steps, no sandbox exploration. Graded once at the end. |
| `guided` | Student is walked through a problem in sequential steps. Each step can have its own prompt, runnable sandbox, and grading criteria. Steps can be SQL queries, code cells, or conceptual answers. |
| `exploratory` | Student has an open sandbox (SQL DB or code runner) to explore freely, then submits a final answer. No prescribed steps. |

### Valid Combinations

Not every combination is meaningful. Here's what makes sense:

| | `direct` | `guided` | `exploratory` |
|---|---|---|---|
| `mcq` | ✅ | ❌ | ❌ |
| `short_answer` | ✅ | ✅ (concept steps) | ❌ |
| `coding` | ✅ | ✅ | ✅ |
| `sql_problem` | ✅ | ✅ | ✅ |

**Notes:**
- MCQ is always direct — stepping through choices makes no sense.
- Short answer guided = a multi-step conceptual walkthrough (explain → trace → analyze), no code execution needed but optionally available.
- SQL exploratory is where the murder mystery pattern lives — open sandbox, student queries freely, submits a final structured answer.
- Coding exploratory = student has a REPL-style environment, experiments, then submits final code.

---

## Core Principle (Hybrid Authoring)

**AI drafts → Lecturer edits → Platform validates → Lecturer publishes.**

The AI generates a full draft from a structured prompt. The lecturer reviews and edits every section. A validation step runs the reference solution (or solution query) against the actual execution sandbox before the publish button becomes active. No question can be published without a passing validation.

---

## Shared Step 0: Creation Entry

Lecturer clicks "Create Question" inside a course. They pick:

1. **Question Type** — MCQ / Short Answer / Coding / SQL Problem
2. **Interaction Mode** — Direct / Guided / Exploratory (filtered to valid combinations)

Then the AI Prompt Panel loads.

---

## Shared Step 1: AI Prompt Panel

A structured form (not a chat) that captures intent so the AI can generate a meaningful draft. Fields vary slightly by type but the core is:

| Field | All Types | Coding | SQL Problem |
|---|---|---|---|
| Topic / Concept | ✅ | ✅ | ✅ |
| Difficulty | ✅ | ✅ | ✅ |
| Concepts / tags to cover | ✅ | ✅ | ✅ |
| Narrative hint *(optional)* | ✅ | ✅ | ✅ |
| Interaction mode | ✅ | ✅ | ✅ |
| Number of steps | — | Guided only | Guided only |
| Number of test cases | — | ✅ | — |
| Allowed languages | — | ✅ | — |
| Schema complexity (tables, rows) | — | — | ✅ |
| Final answer format | — | — | ✅ (direct/exploratory) |
| Murder mystery framing | — | — | Optional (exploratory) |

Lecturer clicks **"Generate Draft"**. The AI populates the full authoring form for the selected type × mode.

---

## MCQ — Direct Only

Simple form, no AI complexity needed beyond generating plausible distractors.

**Lecturer configures:**
- Question stem
- Answer options (2–6)
- Correct answer(s)
- Explanation shown after submission (optional)
- Points

**Validation:** No execution needed. Platform checks at least one correct answer is marked.

---

## Short Answer — Direct

**Lecturer configures:**
- Question prompt
- Expected answer(s) — keyword list or exact match
- Grading mode: `keyword_match` (any of these words = correct) | `manual` (lecturer grades each submission)
- Points

**Validation:** N/A for manual grading. For keyword match, lecturer confirms keywords are reasonable.

---

## Short Answer — Guided

A multi-step conceptual walkthrough. No code execution. Each step is a prompt + text response.

**Lecturer configures per step:**
- Step prompt (e.g. "In your own words, explain what Big O notation measures")
- Grading mode per step: `manual` | `keyword_match`
- Whether the student can see the previous step's answer before proceeding

**AI generates:** Step sequence with prompts calibrated to the topic and difficulty, suggested keywords per step.

**Validation:** N/A. Lecturer reviews step flow makes pedagogical sense.

---

## Coding — Direct

Student writes code, submits once, graded against hidden test cases.

**Lecturer configures:**
- Problem statement (markdown, with examples + constraints)
- Starter code per language
- Reference solution per language
- Test cases: stdin / expected stdout / visible-to-student / weight
- Allowed languages
- Time limit and memory limit
- Points

**AI generates:** Full problem statement, starter code, reference solution, and 8–12 test cases (mix of sample and hidden).

**Validation:** Platform runs reference solution against all test cases via execution sandbox. Every test case must pass before publish is available.

---

## Coding — Guided

Student works through a problem in sequential steps. Each step can have a runnable code cell, a conceptual prompt, or both. Steps build on each other.

**Good for:**
- Teaching a concept incrementally (implement the base case → add recursion → optimize)
- Debugging walkthroughs (what does this code output → find the bug → fix it)
- Algorithm tracing (trace this sort on [3,1,4] → implement it → analyze its complexity)

**Step types available to the lecturer:**

| Step Type | Student Does | Can Run Code? | Graded By |
|---|---|---|---|
| `code_write` | Writes code from scratch | ✅ | Test cases |
| `code_fix` | Fixes provided broken code | ✅ | Test cases |
| `code_trace` | Traces output of provided code | ❌ (read-only) | Expected output match |
| `concept` | Answers a conceptual question in text | ❌ | Keyword match / manual |
| `code_run` | Runs provided code and observes/explains output | ✅ (pre-written, student runs it) | Manual / keyword |

**Lecturer configures per step:**
- Step type
- Step prompt
- For `code_write` / `code_fix`: starter code, reference solution, test cases
- For `code_trace` / `concept`: expected answer / keywords
- Whether the step is gated (student must pass this step to unlock the next)
- Partial credit weight per step

**AI generates:** Full step sequence with code, prompts, test cases, and reference solutions for executable steps. The narrative connects steps into a coherent learning arc.

**Validation:** Platform runs reference solutions against test cases for every executable step. All must pass before publish.

---

## Coding — Exploratory

Student has a persistent code runner (REPL-style) for the duration of the attempt. They experiment freely, then submit their final solution.

**Good for:**
- Open-ended problems with multiple valid approaches
- Assessing problem-solving process, not just the final answer
- Take-home style assessments

**Lecturer configures:**
- Problem statement
- Starter code (optional scaffold)
- Reference solution (for validation only)
- Hidden test cases (graded on submission)
- Whether intermediate runs are logged (for process assessment)
- Allowed languages, time limit

**Validation:** Same as direct — reference solution must pass all hidden test cases.

---

## SQL Problem — Direct

Student reads a problem about a provided schema, writes a query, submits once. Graded by comparing query output to expected output (not query text).

**Good for:** Standard SQL exercises — SELECT, JOIN, GROUP BY, subqueries, CTEs, window functions.

**Lecturer configures:**
- Problem statement (describes the schema and what to retrieve)
- Schema SQL (CREATE TABLE statements)
- Seed SQL (INSERT statements)
- Solution query (canonical correct query)
- Expected output (derived from running solution query against seed — auto-filled by validation)
- Grading mode: `exact_match` (output must match exactly) | `subset_match` (student's output must be a subset) | `row_match` (same rows, any order)
- Points, time limit

**AI generates:** Problem statement, schema, seed data, solution query, and expected output.

**Validation:** Platform provisions a sandbox DB, runs schema + seed SQL, executes solution query, stores expected output. If it runs cleanly, validation passes.

---

## SQL Problem — Guided

Student works through a SQL problem in sequential steps. Each step is a sub-query or sub-task that builds toward a final result. Each step has its own runnable SQL editor.

**Good for:**
- Teaching complex queries incrementally (filter → aggregate → join → window function)
- Guided SQL murder mystery (narrative + structured steps leading to the culprit)
- Breaking down a hard query into teachable pieces

**Lecturer configures per step:**
- Step prompt (what to query and why, framed in the narrative or problem context)
- Expected output for this step (auto-filled from solution query run)
- Solution query for this step
- Whether the step is gated
- Hint text (optional, shown if student is stuck)

**For a guided murder mystery specifically:**
- The narrative wraps each step in story context ("The security logs show entries from Block C. Query the `access_logs` table to find who was there between 9pm and 11pm.")
- Each step's solution query reveals a clue
- The final step is always the accusation (structured final answer form)

**AI generates:** Full step sequence with narrative, per-step solution queries, expected outputs, and hint text.

**Validation:** Platform runs each step's solution query against seed data in sequence. All steps must produce valid output before publish.

---

## SQL Problem — Exploratory

Student has an open SQL sandbox for the entire attempt. They run as many queries as they want against the provided database, then submit a final structured answer (not their SQL).

**This is where the unguided SQL murder mystery lives.** The student gets the narrative and the database. No steps. They figure out what to query.

**Lecturer configures:**
- Narrative / problem statement
- Schema SQL + seed SQL
- Final answer schema (the fields the student fills in to submit — e.g. `culprit_name`, `method`, `location`)
- Final answer key (the correct values — never shown to students)
- Solution query (proves the mystery is solvable during validation)
- Max queries per attempt (optional cap — unlimited by default)
- Sandbox strategy: `per_attempt` (isolated DB per student, recommended) | `shared_readonly` (single DB, cheaper)
- Progressive clues (optional — unlock after N queries run, or after time elapsed)

**AI generates:** Full narrative, schema, seed data, solution query, final answer key, and optional clues.

**Validation:** Platform provisions sandbox, runs schema + seed, runs solution query, confirms output matches final answer key. Passes = mystery is solvable. Sandbox torn down immediately after.

---

## Validation Rules (All Types)

| Type × Mode | Validation Checks |
|---|---|
| MCQ Direct | At least one correct answer marked |
| Short Answer Direct/Guided | Keywords defined (if keyword mode), or manual grading acknowledged |
| Coding Direct/Exploratory | Reference solution passes all test cases |
| Coding Guided | Reference solution passes test cases for every executable step |
| SQL Direct | Solution query runs cleanly, expected output stored |
| SQL Guided | Every step's solution query runs cleanly in sequence |
| SQL Exploratory | Solution query output matches final answer key |

**A question cannot be published without a passing validation. This is enforced at the API level.**

---

## Execution Sandbox (Coding + SQL)

Both coding and SQL modes that involve execution share the same sandbox infrastructure. The mode (direct/guided/exploratory) doesn't change whether execution is available — it changes how execution is *structured* in the student experience.

- **Coding:** Piston or Judge0 handles code execution per language
- **SQL:** Ephemeral Postgres schema per attempt (for exploratory/guided) or single shared schema per question (for direct, since it's one submission)
- **Guided steps:** Each step gets its own isolated execution context — a code cell run in step 2 doesn't affect step 3's environment unless explicitly designed to (lecturer can toggle "persistent state between steps")

---

## AI Authoring Summary

| What AI Generates | Lecturer Reviews |
|---|---|
| Problem statement / narrative | Edits tone, accuracy, narrative quality |
| Schema SQL + seed data | Checks relationships, data makes sense |
| Starter code per language | Confirms scaffold is appropriate |
| Reference solution per language | Verifies it actually solves the problem |
| Test cases (stdin/stdout) | Edits weights, visibility, adds edge cases |
| Step sequence (guided) | Reorders, edits prompts, removes steps |
| Clues (SQL exploratory) | Edits unlock conditions and clue quality |
| Final answer key | Confirms correctness |

The lecturer never authors from scratch. They review, adjust, and approve. The AI handles generation. The platform handles verification.

---

## State Machine (All Types)

```
[Pick Type + Mode]
       ↓
[AI Prompt Panel]
       ↓
  Generate Draft
       ↓
[Authoring Form — "Generated, Pending Review"]
       ↓
  Lecturer Reviews / Edits
       ↓
  Run Validation
       ↓ (pass)
[Authoring Form — "Validated"]
       ↓
  Set metadata (points, time limit, tags)
       ↓
  Publish or Save as Draft
       ↓
[Published — Available for Assessments]
```

Failed validation returns to the authoring form. Fix the reference solution or test cases, re-run validation.

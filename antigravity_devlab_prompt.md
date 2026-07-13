# Antigravity Prompt — DevLab: Thesis-Critique Feature + Judge0 Executor Swap

**How to use this:** Run in **Plan mode**, not Fast mode — every phase below touches multiple files and you want a reviewable plan/artifact before code changes land. Run **Phase 0 first as its own message**, then Phase 1, review, Phase 2, review, and so on. Do not paste all phases into one message — that causes Antigravity to try to parallelize unrelated work and increases file-conflict risk. Each phase below is written as a standalone prompt you paste in sequence.

---

## Phase 0 — Rules file (run once, first)

```
Act as a senior full-stack engineer joining the DevLab project. Before any code changes, create a workspace rules file at .agents/rules/devlab.md that captures these conventions so I don't have to repeat them in every prompt:

- Backend: FastAPI, async SQLAlchemy 2.x (Mapped/mapped_column style), PostgreSQL, Redis available but only used where explicitly noted.
- All datetimes stored and returned as UTC-aware Python datetime objects.
- Service functions raise NotFoundError, ForbiddenError, ConflictError from app/utils/errors.py — never raise HTTPException directly inside services. Global handlers in app/utils/errors.py translate these to HTTP responses.
- Use await db.flush() mid-operation to get an auto-generated ID before the transaction ends; commit once at the end of the service function.
- Auth: JWT via Depends(get_current_user) / Depends(require_lecturer) / Depends(require_student) from app/dependencies.py. JWT payload is {sub, role, name, exp}.
- Routers live in app/routers/, services in app/services/, models in app/models/, Pydantic schemas in app/schemas/.
- Request/response JSON uses camelCase; Python internals use snake_case — Pydantic aliasing handles the conversion, follow the existing pattern in app/schemas/assessment.py.
- Frontend: [FILL IN — e.g. "React + TypeScript, Tailwind, component library X, API client at src/api/client.ts" — inspect the existing frontend repo structure and describe what you find here instead of guessing]
- Never mix unrelated features in a single commit-sized change. Flag if a task seems to require touching files outside its stated scope, and ask before proceeding.

First, actually inspect app/dependencies.py, app/utils/errors.py, and the frontend's existing folder structure and API client pattern to verify these claims are accurate before writing the rules file — correct anything above that doesn't match what you find in the real code. Show me the rules file content before moving to any other task.
```

**Checkpoint:** Review the generated rules file. Fix anything wrong about your frontend stack (the guide above only had backend info) before continuing.

---

## Phase 1 — Frontend: Thesis Critique UI (built from scratch)

```
Act as a senior frontend engineer. We're adding a new feature to DevLab: AI-powered thesis/document critique for lecturers. This is entirely new UI — there is no existing rough version to extend.

Context: DevLab is an assessment platform for KNUST lecturers and students (course management, coding assessments, gradebook). This new feature is a separate capability: a lecturer uploads a thesis or long-form document (docx/pdf), and the system returns a structured supervisor-style critique report — strengths, required corrections, per-chapter assessment, technical comments, formatting notes, a priority action plan, and a final recommendation.

Before writing any code:
1. Inspect the existing frontend structure — routing setup, how existing pages/tabs are added, the design system/component library in use, the API client pattern, and how auth/role-based routes are handled (this feature is lecturer-only).
2. Follow the existing visual language exactly — don't introduce a new design system, spacing scale, or component pattern. Match what's already there.

Build:
1. A new route/tab, "Thesis Critique" (or similar, matching existing naming conventions), visible only to lecturers, added to the existing lecturer navigation.
2. An upload view: file picker (accept .docx and .pdf), optional fields for candidate name / programme / thesis title (the backend may auto-extract these, but let the lecturer override), an "Analyze" action, and a clear loading/progress state — this call may take 30–90 seconds since it involves multiple LLM calls server-side, so design the waiting state accordingly (progress messaging, not just a spinner with no context).
3. A list view of past critiques the lecturer has run (candidate name, thesis title, date, status), with the ability to open one.
4. A report view that renders the critique with these sections, matching this exact data shape (I'll confirm the real backend contract in Phase 2, but scaffold against this now — use realistic placeholder/mock data so the UI is fully reviewable before the backend exists):

{
  "id": 1,
  "header": { "candidateName": "string", "programme": "string", "institution": "string", "thesisTitle": "string", "overallRecommendation": "string" },
  "strengths": ["string"],
  "majorCorrections": [
    { "issue": "string", "whyItMatters": "string", "requiredCorrection": "string", "locations": ["string"], "chapter": 4 }
  ],
  "chapterAssessment": { "1": ["string"], "2": ["string"], "3": ["string"], "4": ["string"], "5": ["string"] },
  "technicalComments": [ { "category": "string", "comment": "string" } ],
  "formattingCorrections": ["string"],
  "priorityActionPlan": ["string"],
  "finalRecommendation": { "decision": "string", "closingNote": "string" },
  "status": "pending | processing | completed | error",
  "createdAt": "ISO datetime"
}

5. In the report view, support two ways of browsing the same data: a category view (strengths / major corrections / technical comments / etc., in that order — mirrors a real supervisor report) and a per-chapter filter/toggle (chapterAssessment + any majorCorrections tagged with that chapter number). Same underlying data, two lenses — don't fetch or render it twice.
6. Each majorCorrections item should visually surface its locations (e.g. "Table 4.5, Abstract") — this is the part that makes the report actionable, don't bury it.
7. Handle the "processing" and "error" statuses gracefully (poll or re-fetch while processing; show a retry option on error).

Do NOT touch any backend code, routes, or the existing execution/submission/assessment frontend flows in this phase. Stay scoped to this new feature's UI only.

When done, run the app and take me through the upload → processing → report flow using the built-in browser, with mock data, before we move to backend work.
```

**Checkpoint:** Review the UI against your actual design system. Confirm the mock JSON shape is what you actually want before backend work starts — it's much cheaper to change now.

---

## Phase 2 — Backend: Thesis Critique Feature

```
Act as a senior backend engineer on the DevLab FastAPI codebase. Follow .agents/rules/devlab.md exactly. This phase is scoped ONLY to the new thesis-critique feature — do not touch app/execution/, the submission pipeline, or anything related to code grading. That is a separate, later task.

Goal: implement a feature where a lecturer uploads a thesis/document (docx or pdf), the backend extracts and chunks the text, sends it through Groq for chapter-by-chapter critique + cross-chapter synthesis, and returns a structured JSON report matching the shape below. This is a standalone lecturer tool — not tied to a course, assessment, or student.

### 1. Dependencies
Add to the project: python-docx (docx extraction), pdfplumber (pdf extraction), and the groq Python SDK. Confirm these install cleanly with the project's existing dependency manager (check pyproject.toml / requirements — match whatever's already used elsewhere in the repo, don't introduce a second package manager).

### 2. Config
Add to app/config.py (follow the existing settings pattern used for JWT/DB config):
- GROQ_API_KEY
- GROQ_MODEL (default to a current Groq-hosted model suitable for long-context critique work — check Groq's currently available models via their docs/API before hardcoding a model name, model availability changes)
- THESIS_UPLOAD_MAX_MB (default 20)

### 3. Model — app/models/thesis_critique.py
Create a ThesisCritique model:
- id: int PK
- lecturer_id: int FK -> users.id, not nullable
- original_filename: str
- candidate_name: str | None
- programme: str | None
- thesis_title: str | None
- status: enum "pending" | "processing" | "completed" | "error"
- report_json: Text (nullable) — the full structured report, stored as a JSON string, deserialised in the service layer only, same pattern as Problem.content in app/models/problem.py
- error_message: str | None
- created_at: datetime, server_default now()

Add the relationship on User (lecturer) if that's the established pattern elsewhere (check app/models/user.py first).

Generate the Alembic migration (or whatever migration tool this project already uses — check first).

### 4. Extraction module — app/thesis_analysis/extraction.py
- extract_text(file_path, content_type) -> returns full text, using python-docx for .docx and pdfplumber for .pdf. Raise a clear error for unsupported types.
- split_into_chapters(text) -> list of {chapter_number, title, content}. Use heading pattern detection (e.g. "Chapter One", "Chapter 1", "CHAPTER 1:", numbered headings) with a sensible fallback: if no chapter headings are detected, split into roughly equal-sized chunks and label them generically, and set a flag so the synthesis step knows chapter detection was unreliable.

### 5. Prompts module — app/thesis_analysis/prompts.py
Build two prompts:
- CHAPTER_CRITIQUE_PROMPT: given one chapter's text + its position in the thesis, ask Groq to identify: coherence issues, gaps, factual/methodological inconsistencies, overstated claims, and anything that would need supervisor correction. Output strict JSON only, no prose outside JSON.
- SYNTHESIS_PROMPT: given all chapter-level findings + basic thesis metadata, produce the final report matching the schema in section 6 below. Output strict JSON only.

Anchor both prompts on a rubric, not a specific past thesis: characterize the standard of a good supervisor critique as (a) categorizing findings into strengths / major corrections / minor formatting notes, (b) always giving major corrections in issue / why-it-matters / required-correction / location form, (c) flagging overstated result claims, dataset/methodology validity issues (e.g. train-test leakage, mismatched scope vs implementation), and citation/reference quality, (d) closing with a clear decision (e.g. "accept with corrections" / "major revision needed" / "not yet acceptable") and a direct, encouraging closing note to the candidate. Do not hardcode any specific person's name, thesis title, or thesis content into these prompts — they must be fully generic and reusable across any uploaded document.

### 6. Report JSON schema (must match Phase 1's frontend contract exactly)
{
  "header": {"candidateName", "programme", "institution", "thesisTitle", "overallRecommendation"},
  "strengths": [string],
  "majorCorrections": [{"issue", "whyItMatters", "requiredCorrection", "locations": [string], "chapter": int}],
  "chapterAssessment": {"1": [string], "2": [string], ...},
  "technicalComments": [{"category", "comment"}],
  "formattingCorrections": [string],
  "priorityActionPlan": [string],
  "finalRecommendation": {"decision", "closingNote"}
}
If candidateName/programme/thesisTitle weren't supplied by the lecturer at upload time, extract them from the document's title page / early text as part of the synthesis step.

### 7. Service — app/services/thesis_critique_service.py
- create_and_run_critique(db, lecturer, file, candidate_name, programme, thesis_title): saves the upload, creates a ThesisCritique row with status="processing", runs extraction -> chapter split -> per-chapter Groq calls -> synthesis Groq call, stores the result, sets status="completed" (or "error" with error_message on failure — never let a Groq/parsing failure bubble up as a raw 500, same principle as the grading pipeline's error handling in submission_service.py). This runs synchronously in the request, consistent with this project's existing "no background job queue" convention — but log timing and consider whether the request needs a longer server-side timeout configured.
- get_critique(db, lecturer, critique_id): NotFoundError if missing, ForbiddenError if lecturer_id doesn't match current_user.id.
- list_critiques(db, lecturer): all critiques for this lecturer, most recent first.
- delete_critique(db, lecturer, critique_id): ownership check, then delete (and delete the stored upload file if one is retained on disk — decide and document whether the original file is kept or discarded after extraction; discarding after successful extraction is simplest for FYP scope).

### 8. Router — app/routers/thesis_critique.py
- POST /thesis-critique — multipart form upload (file + optional candidateName/programme/thesisTitle). Lecturer only. Returns the created ThesisCritique (likely still "processing" or "completed" depending on how you structure the sync flow — decide and be consistent with what Phase 1's UI expects).
- GET /thesis-critique — list, lecturer only, own critiques.
- GET /thesis-critique/:id — full report, lecturer only, own critique.
- DELETE /thesis-critique/:id — lecturer only, own critique.

Register the router in the app factory the same way other routers are registered — check app's main entrypoint for the pattern first.

### 9. Schemas — app/schemas/thesis_critique.py
Pydantic models matching the router contracts above and the report shape in section 6, using the same camelCase-alias pattern as app/schemas/assessment.py.

Once built, run the backend, hit the new endpoints with a real sample docx (ask me for one if you need it, or generate a short dummy thesis-like docx for testing), and confirm the JSON coming back actually matches what Phase 1's frontend expects byte-for-byte on field names. Fix any mismatch on the backend side, not the frontend — the frontend was reviewed and approved already.
```

**Checkpoint:** Confirm the live JSON response from a real uploaded file matches Phase 1's expected shape, and that lecturer-only access control actually rejects a student-role token (test this, don't assume).

---

## Phase 3 — Update the backend guide docs

```
Add a new guide file, devlab_backend_thesis_critique_guide.md, written in the same style and structure as the existing guides in this project (see devlab_backend_assessment_engine_guide.md for the format: endpoints with request/response JSON, logic as numbered steps, schemas, "Out of Scope" section at the end). Document the actual implementation from Phase 2 — endpoints, request/response shapes, the extraction/chunking/synthesis pipeline, the Groq prompt strategy at a high level (don't dump the full prompt text into the guide, just describe its structure/goals), and an "Out of Scope" section (e.g. background job queue, re-analysis after edits, multi-lecturer sharing of a critique, PDF export of the report — adjust based on what you actually built).

Then update devlab_backend_index.md:
- Add the new guide file to the "Guide Files" table.
- Add the new routes to "Full API Route Map".
- Add GROQ_API_KEY / GROQ_MODEL to any config/env var reference if one exists in that file.

Show me both files before finishing.
```

**Checkpoint:** Read the new guide file yourself — it's now the source of truth for anyone (including future-you) picking this feature back up.

---

## Phase 4 — SEPARATE TASK: Replace Docker executor with Judge0

This is unrelated to the thesis-critique feature. Run it as its own session/thread if Antigravity supports that, or at minimum treat it as a hard context switch — don't let it bleed into the thesis-critique files above.

```
Act as a senior backend engineer. This task is scoped ONLY to app/execution/ and its direct dependents (grading_service.py's use of get_executor, and any config/settings referencing Docker). Do not touch anything related to the thesis-critique feature, courses, assessments, or dashboards.

Goal: replace DockerExecutor (app/execution/docker_executor.py) with a Judge0Executor that implements the same BaseExecutor interface (app/execution/base.py), so it's a drop-in replacement via the existing get_executor() factory in app/execution/__init__.py. SQLiteExecutor and BrowserExecutor are untouched — they're unrelated to this swap.

### 1. Config
Add to app/config.py:
- JUDGE0_API_URL (e.g. a self-hosted instance URL, or the RapidAPI-hosted URL — ask me which one I'm using before assuming; if I haven't told you, default to expecting a self-hosted URL via env var and document both options in a comment)
- JUDGE0_API_KEY (optional — only required if using RapidAPI or a Judge0 instance with auth enabled)
- JUDGE0_USE_AUTH_HEADER (bool, since RapidAPI and self-hosted instances authenticate differently — RapidAPI uses X-RapidAPI-Key/X-RapidAPI-Host headers, self-hosted with auth enabled uses X-Auth-Token)

### 2. Language ID mapping — do not hardcode blindly
Judge0 language_id values differ between versions/instances (e.g. Python 3 has been ID 71 on some deployments and different on others depending on the Python version pinned). Before hardcoding a mapping, call GET {JUDGE0_API_URL}/languages on the actual configured instance and inspect the real list, then build the mapping for python/java/cpp from what's actually returned. Put this mapping in app/execution/judge0_executor.py as a constant, with a comment showing the date/instance it was verified against.

### 3. Judge0Executor — app/execution/judge0_executor.py
Implement BaseExecutor.run(code, language, stdin, expected_stdout, time_limit_ms, memory_limit_mb):
1. Map `language` to Judge0's language_id using the verified mapping from step 2. Raise a clear error for unsupported languages rather than silently failing.
2. Base64-encode source_code and stdin (Judge0 requires this when content may include non-printable characters — always encode to be safe, per Judge0's own docs).
3. POST to {JUDGE0_API_URL}/submissions with base64_encoded=true and wait=true (synchronous mode) — this matches the existing grading_service.py pattern, which awaits each test case's executor.run() sequentially rather than using a job queue. Pass cpu_time_limit and memory_limit derived from time_limit_ms/memory_limit_mb (convert units correctly — Judge0's cpu_time_limit is in seconds as a float, memory_limit is in KB, not MB — check exact units in the response of GET {JUDGE0_API_URL}/languages or the config info endpoint before assuming, and document the conversion in a code comment).
4. Include the auth header (X-RapidAPI-Key or X-Auth-Token) conditionally based on JUDGE0_USE_AUTH_HEADER.
5. Parse the response: decode base64 stdout/stderr/compile_output, compare stdout.strip() to expected_stdout.strip() (same comparison logic as the old DockerExecutor — preserve exact behavior here so grading results don't silently change).
6. Map Judge0's status.id to pass/fail: status.id == 3 ("Accepted") plus stdout match = passed; status.id in the "Time Limit Exceeded" / "Compilation Error" / "Runtime Error" range = failed, with stderr/compile_output surfaced. Check Judge0's actual status ID table (via the /statuses endpoint or docs) rather than assuming ID numbers — show me the table you find before hardcoding.
7. Return ExecutionResult with the same field meanings as the Docker version (passed, actual_stdout, exec_time_ms — Judge0 returns time in seconds as a string, convert to ms as an int — and stderr).
8. Handle network/timeout failures the same way submission_service.py expects executor failures to be handled: never raise unhandled, always return a structured ExecutionResult with passed=False and a clear stderr message, OR raise in a way that submit_submission's existing try/except (which sets status="error") catches cleanly — check that function first and match its expectations exactly.

### 4. Wire it in
Update app/execution/__init__.py's get_executor() so "python", "java", "cpp" return Judge0Executor instead of DockerExecutor. Do not delete docker_executor.py yet — rename its class reference out of the factory but leave the file in place, in case we need to roll back before the FYP deadline. Add a code comment noting it's no longer wired in as of this change.

### 5. Test
Run a real submission through /submissions/run or /submissions/submit for a simple Python problem (e.g. echo stdin) end-to-end against the configured Judge0 instance, and show me the actual response, not a hypothetical one. Confirm timing (exec_time_ms) is populated correctly and a deliberately wrong-output submission correctly comes back as failed, not just successful submissions.

### 6. Update the guide
In devlab_backend_execution_engines_guide.md, replace the "Docker Executor" section with a "Judge0 Executor" section written in the same style (how it works, config, language mapping, status handling, security notes — Judge0's sandboxing replaces the old Docker security checklist, so rewrite that section to reflect what Judge0 actually provides vs. what you're responsible for, e.g. still validating/limiting request payload size). Update the "Engine" table at the top of the file and the language/isolation column for python/java/cpp. Update devlab_backend_index.md's "Execution sandboxes" line at the top to say Judge0 instead of Docker.

Ask me for my actual Judge0 instance URL and whether it's self-hosted or RapidAPI before running step 5's live test — don't guess or use a public demo endpoint for real grading tests.
```

**Checkpoint:** Confirm a real pass and a real fail both come back correctly before trusting this in the gradebook. This is grading-critical — a silent mismatch here (e.g. wrong unit conversion on memory_limit) could misgrade every student submission.

---

## Notes for you, not for Antigravity

- **Phase 1 and Phase 2 must produce byte-identical field names.** I wrote Phase 2's schema to match Phase 1's mock exactly on purpose — if Antigravity drifts (e.g. `chapter_assessment` vs `chapterAssessment`) in either phase, catch it before merging.
- **Groq model name**: I deliberately told Antigravity to check Groq's current model list rather than hardcoding one, since available models on Groq change. Skim what it picks before accepting.
- **Judge0 hosting decision**: you'll need to tell Antigravity mid-Phase-4 whether you're self-hosting Judge0 (e.g. on the same OCI VM, likely as another Docker Compose service) or using RapidAPI's hosted version. Self-hosting keeps it free but adds one more container to your OCI stack; RapidAPI has a free tier but rate limits that could bite during grading spikes near your deadline. Worth deciding before you paste Phase 4 in.
- **Timeline**: given July 13, I'd run Phases 0–3 (thesis critique) first since it's the supervisor-requested feature, and treat Phase 4 (Judge0) as lower priority if time gets tight — the existing DockerExecutor already works.

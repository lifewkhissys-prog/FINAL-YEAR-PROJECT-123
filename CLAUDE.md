# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is now

The repo started as **DevLab**, a coding-assessment platform, and was pivoted into an
**Evidence-Based Thesis Assessor** — a supervisor-facing tool that ingests a `.pdf`/`.docx` thesis,
runs a multi-agent LLM pipeline against the KNUST *Guide for Preparation and Evaluation of Higher
Degree Research Thesis* (June 2016) rubric, and produces per-criterion marks with cited evidence plus
a narrative supervisor report exportable as `.docx`.

The DevLab code is still present and still wired into `app/main.py` (`app/routers/courses.py`,
`assessments.py`, `problems.py`, `submissions.py`, `dashboard.py`, `app/execution/*`, and most of
`src/pages/student/`), but **no frontend route reaches it** — `src/router/AppRouter.jsx` only serves
`/thesis/*`, and `/`, `/dashboard`, `/lecturer/dashboard`, `/student/dashboard` all redirect to
`/thesis/dashboard`. Treat the DevLab paths as dormant unless a task explicitly names them. Likewise
`src/api/thesis.api.js` and `src/pages/lecturer/ThesisCritiquePage.jsx` are legacy and unreachable —
the live pages call `authFetch('/api/...')` directly rather than going through `src/api/`.

## Commands

### Frontend (Vite + React 19, JS/JSX — not TypeScript)

```bash
npm install
npm run dev        # http://localhost:3000, proxies /api -> http://127.0.0.1:8001
npm run build
npm run lint       # eslint .
```

### Backend (FastAPI, async SQLAlchemy 2.x, uv)

```bash
docker compose up --build          # backend on :8001, postgres+pgvector on :5432, redis
docker compose run --rm web python verify_knust_alignment.py
```

Docker maps container `8000` -> host `8001`, which is what the Vite proxy expects. Local (non-Docker)
runs need `uvicorn app.main:app --port 8001` so the proxy still lines up; the default
`DATABASE_URL` falls back to `sqlite+aiosqlite:///./devlab.db` when Postgres is absent.

### Tests

There is no pytest suite. Verification is a set of standalone scripts run against a live app/DB:

| Script | Covers |
| --- | --- |
| `verify_knust_alignment.py` | 80 checks: rubric arithmetic totals 100 per degree level, Appendix 4.1 grade bands, compliance rules, chapter chunking, and **that the pipeline records unscored criteria rather than inventing marks** |
| `verify_docx_export.py` | `.docx` report renders with a correct mark table |
| `verify_full_system.py` | End-to-end pipeline + "zero-mock" audit |
| `verify_app.py`, `verify_thesis.py` | Older end-to-end flows via `TestClient` / HTTP (`verify_thesis.py` hardcodes `localhost:8000`, the container-internal port) |

To run one check in isolation, edit or import the relevant function — the scripts are linear `asyncio`
mains, not parameterised runners.

## Architecture

### Assessment pipeline (`app/services/agent_pipeline.py`, ~950 lines)

`execute_thesis_assessment_pipeline(submission_id)` runs as a FastAPI `BackgroundTask` in **its own
`SessionLocal()`**, writing `status` / `pipeline_step` / `pipeline_progress` to `thesis_submissions`
after each stage so the frontend can poll:

1. `preliminary_check` (20%) — deterministic `compliance_check.run_compliance_check` gates
   assessability. A blocking failure stops the run at `preliminary_check_failed`; nothing downstream
   executes.
2. `flow_analysis` (—) — LLM narrative flow table.
3. `plagiarism_scan` (—) — `plagiarism_service.run_plagiarism_check`.
4. `rubric_scoring` (80%) — scorer → verifier per sub-criterion, fanned out under
   `asyncio.Semaphore(3)` (tuned to Groq TPM limits).
5. `narrative_synthesis` (95%) → `completed` (100%).

**Session-safety rule:** the concurrent workers must never touch `db`. An `AsyncSession` cannot serve
overlapping operations, so the orchestrator eagerly loads criteria, `GradedExample` exemplars, and
`ChapterSubCriteriaMap` rows into dicts and passes them into
`evaluate_single_subcriterion_bounded(...)`. Adding a new per-sub-criterion DB read means loading it
up front, not inside the worker.

### The no-fabrication invariant

This is the design constraint that most of the surrounding code exists to protect, and the thing most
likely to be broken by a well-meaning change:

- `AssessmentResult.ai_score` and `ai_justification` are **nullable**. An unscored sub-criterion is
  stored as unscored with `scoring_failed=True` and an `error_detail` — never as a default or zero.
- `ScoringError` is raised rather than substituting a mark.
- `grading_scale.grade_for(None)` returns `{"grade": None, "interpretation": "Not graded"}` — an
  ungraded thesis is not an F.
- If `scored_count == 0` the submission is marked `failed` and **no narrative report is generated**;
  a report about a thesis nothing evaluated would be a fabrication.
- Pipeline exceptions record `status="failed"`, never `"completed"`.
- `app/migrations.py` warns loudly on SQLite when `ai_score`/`ai_justification` are still `NOT NULL`,
  because that constraint would force a substitute mark at insert time.

`run_scorer_agent` optionally does a second scoring pass when confidence is below
`SECOND_RUN_CONFIDENCE_THRESHOLD` (75.0), flagging `score_consistency_flag` when the two runs diverge
by more than `SCORE_DIVERGENCE_FRACTION` (0.15) of max marks.

### Rubrics and grading (`app/services/grading_scale.py`, `app/seed.py`)

Four independent mark schemes keyed by `degree_level`: `mphil` (Guide Appendix 4.4), `phd` (Appendix
4.2), `msc` and `undergraduate` (departmental adaptations — `RUBRIC_SOURCES` states explicitly which
schemes are *not* from the Guide, and that provenance is user-visible). Each set totals 100.

Grade bands from Appendix 4.1 are `A ≥70 / B ≥60 / C ≥55 / E ≥50 (Referred) / F` — **there is no D
band**, and a Referred thesis caps re-assessment at 60.

Seeding runs from the FastAPI lifespan. Because an already-populated DB can hold a stale scheme
(`phd` was once seeded with the MPhil rubric), `main.py` calls `repair_rubric_set(level)` for every
level when `seed_database()` reports `already_populated`.

### Schema migrations

`Base.metadata.create_all` never alters existing tables, so post-hoc columns live in
`app/migrations.py` as an idempotent `ADDED_COLUMNS` list plus a `RELAXED_NOT_NULL` list. It is a
separate module (not inline in `main.py`) so verification scripts driving the pipeline directly can
apply the same migrations. **Adding a column to a model means adding it to `ADDED_COLUMNS` too**, or
existing databases silently lack it.

### Routing gotcha

`app/routers/thesis.py` sets `prefix="/api"` internally and defines `/submissions`, while
`app/main.py` also mounts `submissions.router` at `/api/submissions`. The thesis router is included
**first**, so `/api/submissions` resolves to the thesis handlers. Don't "fix" the ordering without
checking what the frontend calls.

### Auth

`app/dependencies.py` `get_current_user` falls back to a hardcoded `MOCK_DEMO_USER` (lecturer, id=1)
when no valid JWT is present, and `require_lecturer` / `require_student` do **not** check roles. This
is deliberate demo scaffolding but means endpoint protection is nominal; `check_submission_access` in
`thesis.py` is the real ownership gate (`ThesisSubmission.lecturer_id`). Seeded logins are
`lecturer@knust.edu.gh` / `student@knust.edu.gh`, password `password123`.

`main.py` refuses to start with the default `SECRET_KEY` when `ENV=production`.

### Embeddings

`select_relevant_excerpts` picks evidence paragraphs by cosine similarity via `fastembed`
(`BAAI/bge-small-en-v1.5`, 384-dim), degrading to keyword counting when
`embeddings_are_degraded()`. Vector columns use `pgvector` with a `JSON` fallback when pgvector is
unavailable — so the same models work on SQLite, just without vector search.

## Conventions

`.agents/rules/devlab.md` is the workspace convention doc; the load-bearing parts:

- Service-layer functions must **never** raise `HTTPException`. Raise the custom errors from
  `app/utils/errors.py` and let the global handlers registered by `register_error_handlers(app)`
  translate them.
- `await db.flush()` mid-operation for generated IDs; commit exactly once at the end of a service
  function.
- All datetimes stored and returned as UTC-aware.
- Request/response JSON is `camelCase`, Python internals `snake_case`, bridged by Pydantic aliasing.
- Frontend styling uses the `src/styles/tokens.css` variables (`var(--bg-primary)`, `var(--accent)`,
  `var(--border)`, …) and the semantic classes `glass`, `glass-sm`, `input`, `select`, `btn-primary`,
  `nav-item`. Match the existing dark grid-dots aesthetic.

## Reference documents

- `TODO.md` — status of the KNUST Guide alignment pass (all sections currently complete).
- `thesis_assessment_build_spec.md` — the build spec for the thesis assessor.
- `backend_guide/`, `frontend_guide/`, `devlab_guide.md`, `DEMO.md` — DevLab-era architecture docs;
  accurate for the dormant coding-assessment subsystem, not for the thesis pipeline.
- `structure.md` — despite the name, this is a sample thesis assessment report used as reference
  output, not a description of the repo layout.

# Thesis Assessor — Outstanding Work & Status

Handover and tracking for work remaining after the KNUST HDR Guide alignment pass.

Reference: *Guide for Preparation and Evaluation of Higher Degree Research Thesis*, KNUST, June 2016.

---

## 0. Verification · [COMPLETED]

- [x] End-to-end verification script: `docker compose run --rm web python verify_knust_alignment.py` (**80/80 checks passing**).
- [x] `.docx` mark table export script: `docker compose run --rm web python verify_docx_export.py` (**All checks passing**).
- [x] Docker `__pycache__` permissions cleaned up.

---

## 1. Security · [COMPLETED]

### 1.1 Every endpoint is unauthenticated · [COMPLETED]
- [x] Added `Depends(require_lecturer)` from `app/dependencies.py` to every route in `app/routers/thesis.py`.
- [x] Set `ThesisSubmission.lecturer_id` on submission creation and enforced lecturer ownership on read/write endpoints.
- [x] Updated all frontend API calls in `src/pages/lecturer/*.jsx` to use `authFetch` with Bearer tokens and 401 handling.

### 1.2 Arbitrary file write via upload filename · [COMPLETED]
- [x] Sanitized filenames using `Path(file.filename).name` and prefixed with `uuid.uuid4().hex`.
- [x] Implemented allowlist for `.pdf` and `.docx` extensions.
- [x] Enforced `THESIS_UPLOAD_MAX_MB` file size limits with streaming chunk reading.
- [x] Prevented event loop blocking during file uploads.

### 1.3 Unparseable uploads handling · [COMPLETED]
- [x] Removed placeholder dummy text fallback (`Sample Thesis Content...`). Failed parses now return a clean 400 Bad Request error.

### 1.4 CORS and JWT secret · [COMPLETED]
- [x] Pinned CORS `allow_origins` in `app/main.py` away from wildcard `*` with credentials.
- [x] Added startup safety check in `app/main.py` requiring a non-default `SECRET_KEY` in production environment.

---

## 2. Oral examination rubric · [COMPLETED]

- [x] Added `assessment_type` column (`thesis` / `oral`) to `RubricCriterion` model in `app/models/thesis_critique.py`.
- [x] Added database schema migration in `app/migrations.py`.

---

## 3. Assessment quality · [COMPLETED]

### 3.1 Evidence window & Retrieval quality · [COMPLETED]
- [x] Integrated semantic vector similarity retrieval (`select_relevant_excerpts`) using `app/services/embeddings.py` to retrieve top relevant thesis paragraph chunks for sub-criterion scoring.

### 3.2 Plagiarism & Embedding dependencies · [COMPLETED]
- [x] Updated `app/services/embeddings.py` to support `fastembed` (present in `pyproject.toml`) so vector embeddings work out-of-the-box in Docker without requiring `sentence-transformers`.

---

## 4. Code health · [COMPLETED]

### 4.1 Delete `app/services/thesis_service.py` · [COMPLETED]
- [x] Deleted unreferenced 863-line `app/services/thesis_service.py`.

### 4.2 Database Migrations · [COMPLETED]
- [x] Improved `app/migrations.py` with individual transaction contexts and `ADD COLUMN IF NOT EXISTS` for PostgreSQL reliability.

### 4.5 Leftovers · [COMPLETED]
- [x] Updated `src/pages/lecturer/StructureMappingPage.jsx` step number labels.
- [x] Handled `app/__pycache__` permissions.

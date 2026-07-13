# DevLab Backend Guides — Index

**Framework:** FastAPI (Python)  
**Database:** PostgreSQL via async SQLAlchemy  
**Cache:** Redis  
**Auth:** JWT + bcrypt  
**Execution sandboxes:** Judge0 (Python/Java/C++), SQLite in-process (SQL), Browser iframe (HTML)

---

## Guide Files

| Feature | File | Read first? |
|---------|------|-------------|
| Project structure & setup | `devlab_backend_project_setup_guide.md` | ✅ Yes — contains app factory, config, dependencies, error handling |
| Data models | `devlab_backend_data_models_guide.md` | ✅ Yes — all ORM models, relationships, and the `content` JSON format |
| Authentication | `devlab_backend_auth_guide.md` | — |
| Course management & enrollment | `devlab_backend_course_management_guide.md` | — |
| Problem & test case management | `devlab_backend_problem_management_guide.md` | — |
| Assessment engine | `devlab_backend_assessment_engine_guide.md` | — |
| Execution engines | `devlab_backend_execution_engines_guide.md` | — |
| Submission pipeline & grading | `devlab_backend_submission_pipeline_guide.md` | — |
| Dashboards & reporting | `devlab_backend_dashboards_guide.md` | — |
| Thesis Critique | `devlab_backend_thesis_critique_guide.md` | — |

Always read **project setup** and **data models** first. Every other guide assumes their contents.

---

## Full API Route Map

```
POST   /auth/register
POST   /auth/login

GET    /courses
POST   /courses
GET    /courses/:courseId
PATCH  /courses/:courseId
DELETE /courses/:courseId

GET    /courses/:courseId/students
POST   /courses/:courseId/students
DELETE /courses/:courseId/students/:userId

GET    /courses/:courseId/problems           ← practice list (student)
GET    /courses/:courseId/assessments        ← assessments in course

POST   /assessments
GET    /assessments/:assessmentId
PATCH  /assessments/:assessmentId
DELETE /assessments/:assessmentId
GET    /assessments/:assessmentId/gradebook
GET    /assessments/:assessmentId/students/:userId/submissions
GET    /assessments/:assessmentId/results    ← student own results (after assessment ends)

POST   /problems
GET    /problems/:problemId
PATCH  /problems/:problemId
DELETE /problems/:problemId
POST   /problems/:problemId/test-cases
GET    /problems/:problemId/test-cases
GET    /problems/:problemId/submissions      ← student own history for a problem

POST   /submissions/run
POST   /submissions/submit
GET    /submissions/:submissionId

GET    /lecturer/dashboard
GET    /student/dashboard
GET    /student/submissions
GET    /courses/:courseId/students/:userId/submissions

POST   /thesis-critique
GET    /thesis-critique
GET    /thesis-critique/:critiqueId
DELETE /thesis-critique/:critiqueId
```

---

## Dependency Chain

```
FastAPI Request
  └── Router (app/routers/)
        └── Depends(get_current_user)     ← validates JWT, fetches User
        └── Depends(require_lecturer)     ← role check on top of above
        └── Depends(get_db)               ← async SQLAlchemy session
              └── Service (app/services/)
                    └── ORM Models (app/models/)
                    └── Executor (app/execution/)   ← only for submission routes
```

---

## Auth Quick Reference

Every protected route injects one of:

```python
current_user = Depends(get_current_user)    # any authenticated user
current_user = Depends(require_lecturer)    # lecturer only — raises 403 for students
current_user = Depends(require_student)     # student only — raises 403 for lecturers
```

Token is passed as `Authorization: Bearer <jwt>`.  
JWT payload: `{ sub, role, name, exp }`.

---

## Access Control Summary

| Route group | Check |
|-------------|-------|
| Course endpoints | Lecturer: `course.lecturer_id == current_user.id` |
| Course endpoints | Student: `Enrollment` row exists for (student, course) |
| Assessment endpoints | Inherit course ownership/enrollment check |
| Problem endpoints | Inherit via Assessment → Course chain |
| Submission endpoints | Student: own submissions only; Lecturer: any in their courses |
| Gradebook | Lecturer owns the assessment's course |

---

## Execution Engine Quick Reference

```python
from app.execution import get_executor

executor = get_executor(language)   # "python" | "java" | "cpp" | "sql" | "html"
result   = await executor.run(code, language, stdin, expected_stdout, time_limit_ms, memory_limit_mb)
# result.passed, result.actual_stdout, result.exec_time_ms, result.stderr
```

---

## Key Conventions

- All datetimes stored and returned in **UTC**, as timezone-aware Python `datetime` objects
- `Problem.content` is stored as a **JSON string** in the DB; always parse/serialise in the service layer, never expose the raw string to clients
- `Submission.is_graded = True` only when submitted during an active assessment window — practice submissions are `is_graded = False`
- `status` on `Assessment` is always **computed** at query time from `starts_at`/`ends_at` — never stored
- Use `await db.flush()` (not `commit()`) mid-operation when you need an auto-generated ID before the transaction ends; commit once at the end of the service function
- Raise `NotFoundError`, `ForbiddenError`, `ConflictError` from service functions — the global exception handlers in `app/utils/errors.py` translate these to the correct HTTP responses

---

## Recommended Build Order

1. Project setup, config, database connection
2. Data models + Alembic migration
3. Auth (register + login)
4. Course management + enrollment
5. Problem management + test cases
6. Assessment engine
7. Execution engines (start with SQLite, then Docker)
8. Submission pipeline + grading
9. Dashboards + reporting

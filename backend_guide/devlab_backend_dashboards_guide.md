# DevLab Backend Guide — Dashboards & Reporting

**Router:** `app/routers/dashboard.py`  
**Service:** `app/services/dashboard_service.py`  
**Models:** `User`, `Course`, `Enrollment`, `Assessment`, `Problem`, `Submission`, `TestResult`

---

## Overview

The dashboard layer provides aggregated data for the frontend dashboards. There are four distinct data shapes needed:

1. **Lecturer home dashboard** — summary stats + recent assessments
2. **Student home dashboard** — active/upcoming assessments + enrolled courses
3. **Gradebook** — per-assessment, all students × all problems, best scores
4. **Student submission history** — filtered list of a student's own submissions

---

## Lecturer Endpoints

### `GET /lecturer/dashboard`

**Auth:** Lecturer only.

Returns summary stats and recent assessments for the logged-in lecturer.

**Response `200`:**
```json
{
  "totalCourses": 3,
  "activeAssessments": 1,
  "totalStudents": 87,
  "recentAssessments": [
    {
      "id":        7,
      "title":     "Lab 1 — Control Flow",
      "courseName": "Introduction to Python",
      "status":    "active",
      "startsAt":  "2026-05-10T08:00:00Z",
      "endsAt":    "2026-05-10T10:00:00Z"
    }
  ]
}
```

**Queries:**

```python
# Total courses
select(func.count()).where(Course.lecturer_id == lecturer_id)

# Active assessments (status computed from time)
select(Assessment)
    .join(Course)
    .where(
        Course.lecturer_id == lecturer_id,
        Assessment.starts_at <= now,
        Assessment.ends_at >= now,
    )

# Total unique students enrolled across all lecturer's courses
select(func.count(func.distinct(Enrollment.user_id)))
    .join(Course)
    .where(Course.lecturer_id == lecturer_id)

# Recent assessments (last 5 by starts_at desc)
select(Assessment)
    .join(Course)
    .where(Course.lecturer_id == lecturer_id)
    .order_by(Assessment.starts_at.desc())
    .limit(5)
```

---

### `GET /assessments/:assessmentId/gradebook`

**Auth:** Lecturer only, must own the parent course.

Returns a grid: all enrolled students × all problems in the assessment, with each student's best graded score per problem.

**Response `200`:**
```json
{
  "assessmentId":   7,
  "assessmentTitle": "Lab 1 — Control Flow",
  "problems": [
    { "id": 12, "title": "Fizz Buzz" },
    { "id": 13, "title": "List Reversal" }
  ],
  "rows": [
    {
      "userId":   22,
      "name":     "Ama Owusu",
      "email":    "ama@knust.edu.gh",
      "scores": {
        "12": { "score": 5, "total": 5, "submissionId": 101 },
        "13": { "score": 3, "total": 5, "submissionId": 102 }
      }
    },
    {
      "userId":   23,
      "name":     "Kofi Mensah",
      "email":    "kofi@knust.edu.gh",
      "scores": {
        "12": null,
        "13": { "score": 5, "total": 5, "submissionId": 103 }
      }
    }
  ]
}
```

`null` in `scores` means no graded submission for that problem.  
`total` comes from `count(test_cases)` for that problem.

**Query strategy:**

```python
# Get all enrolled students
students = select(User).join(Enrollment).where(Enrollment.course_id == course_id)

# Get all problems in assessment
problems = select(Problem).where(Problem.assessment_id == assessment_id)

# For each student × problem, find best graded submission
# "Best" = highest score; if tie, most recent
select(Submission)
    .where(
        Submission.user_id == student_id,
        Submission.problem_id == problem_id,
        Submission.is_graded == True,
        Submission.status == "completed",
    )
    .order_by(Submission.score.desc(), Submission.submitted_at.desc())
    .limit(1)
```

Build the grid in Python after fetching — avoid a single mega-query. Fetch students, problems, and submissions separately, then assemble.

---

### `GET /assessments/:assessmentId/students/:userId/submissions`

**Auth:** Lecturer only, must own the parent course.

Returns all submissions a specific student made for all problems in a given assessment.

**Response `200`:**
```json
[
  {
    "problemId":    12,
    "problemTitle": "Fizz Buzz",
    "submissions": [
      {
        "id":          101,
        "language":    "python",
        "score":       5,
        "totalCases":  5,
        "status":      "completed",
        "isGraded":    true,
        "submittedAt": "2026-05-10T09:15:00Z"
      }
    ]
  }
]
```

```python
select(Submission)
    .join(Problem)
    .where(
        Submission.user_id == student_id,
        Problem.assessment_id == assessment_id,
    )
    .order_by(Submission.submitted_at.desc())
```

---

### `GET /courses/:courseId/students/:userId/submissions`

**Auth:** Lecturer only, must own the course.

Full submission history for a student across all assessments in a course.

Groups by assessment, then by problem. Same shape as above but scoped to the whole course.

```python
select(Submission)
    .join(Problem)
    .join(Assessment)
    .where(
        Submission.user_id == student_id,
        Assessment.course_id == course_id,
    )
    .order_by(Assessment.starts_at.desc(), Submission.submitted_at.desc())
```

---

## Student Endpoints

### `GET /student/dashboard`

**Auth:** Student only.

Returns active assessments, upcoming assessments, and enrolled courses.

**Response `200`:**
```json
{
  "activeAssessments": [
    {
      "id":        7,
      "title":     "Lab 1 — Control Flow",
      "courseName": "Introduction to Python",
      "endsAt":    "2026-05-10T10:00:00Z"
    }
  ],
  "upcomingAssessments": [
    {
      "id":        8,
      "title":     "Lab 2 — Functions",
      "courseName": "Introduction to Python",
      "startsAt":  "2026-05-17T08:00:00Z"
    }
  ],
  "enrolledCourses": [
    {
      "id":           3,
      "title":        "Introduction to Python",
      "language":     "python",
      "lecturerName": "Ankomah Kelvin"
    }
  ]
}
```

---

### `GET /assessments/:assessmentId/results`

**Auth:** Student only, must be enrolled.

The student's own results for a completed assessment.

**Response `200`:**
```json
{
  "assessmentId":   7,
  "assessmentTitle": "Lab 1",
  "totalScore":     8,
  "totalPossible":  10,
  "problems": [
    {
      "id":           12,
      "title":        "Fizz Buzz",
      "score":        5,
      "totalCases":   5,
      "status":       "completed",
      "submissionId": 101
    }
  ]
}
```

Only show if `assessment.ends_at < now()` — if the assessment is still active, return `403` with "Assessment is still in progress".

---

### `GET /student/submissions`

**Auth:** Student only.

Full personal submission history, with optional filters.

**Query params:**
- `courseId` (int, optional)
- `type` — `guided` | `challenge` (optional)
- `status` — `completed` | `error` (optional)
- `from` — ISO date string (optional)
- `to` — ISO date string (optional)
- `page` (int, default 1)
- `pageSize` (int, default 20, max 100)

**Response `200`:**
```json
{
  "total": 42,
  "page":  1,
  "items": [
    {
      "id":           101,
      "problemId":    12,
      "problemTitle": "Fizz Buzz",
      "courseId":     3,
      "courseName":   "Introduction to Python",
      "language":     "python",
      "score":        5,
      "totalCases":   5,
      "status":       "completed",
      "isGraded":     true,
      "submittedAt":  "2026-05-10T09:15:00Z"
    }
  ]
}
```

---

## Personal Best Score

Used in the practice problem list (`GET /courses/:courseId/problems`). For each problem, compute the student's personal best:

```python
select(func.max(Submission.score))
    .where(
        Submission.user_id == student_id,
        Submission.problem_id == problem_id,
        Submission.status == "completed",
    )
```

Include `totalCases` from `count(TestCase)` for the same problem.

---

## Performance Notes

- Gradebook queries can be expensive for large cohorts. Fetch students, problems, and submissions in three separate queries, then assemble in Python — do not use nested subqueries per cell.
- Add database indexes on: `submissions(user_id, problem_id)`, `submissions(problem_id, is_graded)`, `enrollments(user_id, course_id)`, `assessments(course_id)`.
- For the FYP scope, no caching is required, but the gradebook endpoint is a natural candidate for Redis caching if performance becomes an issue.

---

## Out of Scope

- Per-question analytics (average score, difficulty rating across cohort)
- CSV export (handled client-side from the gradebook response)
- Email notifications
- Real-time score updates via WebSocket

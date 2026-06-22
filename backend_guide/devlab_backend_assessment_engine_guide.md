# DevLab Backend Guide — Assessment Engine

**Router:** `app/routers/assessments.py`  
**Service:** `app/services/assessment_service.py`  
**Models:** `Assessment`, `Course`, `Problem`, `Enrollment`

---

## Endpoints

### `POST /assessments`

Create a new assessment. **Lecturer only.**

**Request body:**
```json
{
  "courseId":  3,
  "title":     "Lab 1 — Control Flow",
  "startsAt":  "2026-05-10T08:00:00Z",
  "endsAt":    "2026-05-10T10:00:00Z"
}
```

**Logic:**
1. Fetch the course → `404` if not found
2. Verify `course.lecturer_id == current_user.id` → `403` if not
3. Validate `ends_at > starts_at` → `422` with message "End time must be after start time"
4. Compute `duration_secs = (ends_at - starts_at).total_seconds()`
5. Insert `Assessment` row
6. Return `201` with the created assessment

**Response `201`:**
```json
{
  "id":           7,
  "courseId":     3,
  "title":        "Lab 1 — Control Flow",
  "startsAt":     "2026-05-10T08:00:00Z",
  "endsAt":       "2026-05-10T10:00:00Z",
  "durationSecs": 7200,
  "status":       "scheduled",
  "problemCount": 0,
  "createdAt":    "2026-04-01T12:00:00Z"
}
```

---

### `GET /assessments/:assessmentId`

Fetch an assessment with its problems list.

**Access rules:**
- Lecturer: must own the parent course
- Student: must be enrolled in the parent course

**Response `200`:**
```json
{
  "id":           7,
  "courseId":     3,
  "courseName":   "Introduction to Python",
  "title":        "Lab 1 — Control Flow",
  "startsAt":     "2026-05-10T08:00:00Z",
  "endsAt":       "2026-05-10T10:00:00Z",
  "durationSecs": 7200,
  "status":       "active",
  "problems": [
    {
      "id":       12,
      "title":    "Fizz Buzz",
      "type":     "challenge",
      "language": "python"
    }
  ]
}
```

`status` is computed at query time (see Status Computation below).

---

### `GET /courses/:courseId/assessments`

List all assessments in a course.

**Access:**
- Lecturer: must own the course
- Student: must be enrolled

**Response `200`:** Array of assessment objects (same shape as above, `problems` omitted for performance — use `GET /assessments/:id` for problems).

---

### `PATCH /assessments/:assessmentId`

Update an assessment. **Lecturer only, must own the parent course.**

**Logic:**
- If the assessment has already ended (`ends_at < now()`), reject all edits with `400` — "This assessment has ended and cannot be edited"
- Otherwise apply partial updates to `title`, `starts_at`, `ends_at`
- Recompute `duration_secs` if times change
- Re-validate `ends_at > starts_at`

**Request body** (all optional):
```json
{
  "title":    "Updated Title",
  "startsAt": "2026-05-10T09:00:00Z",
  "endsAt":   "2026-05-10T11:00:00Z"
}
```

---

### `DELETE /assessments/:assessmentId`

Delete an assessment and all its problems/test cases. **Lecturer only, must own the course.**

**Response `204`.**

---

## Status Computation

`status` is never stored — always computed from the current UTC time against `starts_at` and `ends_at`:

```python
from datetime import datetime, timezone

def compute_status(assessment: Assessment) -> str:
    now = datetime.now(timezone.utc)
    if now < assessment.starts_at:
        return "scheduled"
    if assessment.starts_at <= now <= assessment.ends_at:
        return "active"
    return "ended"
```

Add this to the assessment response schema as a computed field (`@computed_field` in Pydantic v2, or compute it in the service before returning).

---

## Assessment Window Check

Other services (submissions, problem detail) need to know if a given assessment is currently active. Centralise this:

```python
def is_assessment_active(assessment: Assessment) -> bool:
    now = datetime.now(timezone.utc)
    return assessment.starts_at <= now <= assessment.ends_at
```

This is used by the submission pipeline to set `is_graded` on a submission (see Submission Pipeline guide).

---

## Upcoming Assessments (Student Dashboard)

For the student dashboard, return assessments starting within the next 7 days:

```python
from datetime import timedelta

now = datetime.now(timezone.utc)
in_seven_days = now + timedelta(days=7)

select(Assessment)
    .join(Course)
    .join(Enrollment)
    .where(
        Enrollment.user_id == student_id,
        Assessment.starts_at > now,
        Assessment.starts_at <= in_seven_days,
    )
    .order_by(Assessment.starts_at)
```

---

## Schemas (`app/schemas/assessment.py`)

```python
from pydantic import BaseModel, model_validator
from datetime import datetime

class AssessmentCreate(BaseModel):
    courseId:  int
    title:     str
    startsAt:  datetime
    endsAt:    datetime

    @model_validator(mode="after")
    def ends_after_starts(self):
        if self.endsAt <= self.startsAt:
            raise ValueError("endsAt must be after startsAt")
        return self

class AssessmentUpdate(BaseModel):
    title:    str | None = None
    startsAt: datetime | None = None
    endsAt:   datetime | None = None

class AssessmentProblemSummary(BaseModel):
    id:       int
    title:    str
    type:     str
    language: str

class AssessmentResponse(BaseModel):
    id:           int
    courseId:     int
    courseName:   str
    title:        str
    startsAt:     datetime
    endsAt:       datetime
    durationSecs: int
    status:       str        # "scheduled" | "active" | "ended" — computed
    problems:     list[AssessmentProblemSummary] = []
    createdAt:    datetime

    model_config = ConfigDict(from_attributes=True)
```

---

## Out of Scope

- Per-student time extensions
- Early manual lock
- Assessment password / access codes
- Pausing a running assessment

# DevLab Backend Guide — Problem & Test Case Management

**Routers:** `app/routers/problems.py`, `app/routers/test_cases.py`  
**Service:** `app/services/problem_service.py`  
**Models:** `Problem`, `TestCase`, `Assessment`, `Course`

---

## Problem Endpoints

### `POST /problems`

Create a new problem. **Lecturer only.**

**Request body:**
```json
{
  "assessmentId": 7,
  "title": "Fizz Buzz",
  "type": "challenge",
  "language": "python",
  "content": "{\"description\": \"# Fizz Buzz\\n...\", \"starterCode\": \"def solution(n):\\n    pass\"}",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256
}
```

**Logic:**
1. Fetch the assessment → `404` if not found
2. Verify the assessment's course is owned by the caller → `403` if not
3. Validate `type` and `language` enum values
4. Insert `Problem` row with `content` stored as-is (JSON string)
5. Return `201` with the created problem

**Response `201`:** Full problem object.

---

### `GET /problems/:problemId`

Fetch a problem with its test cases and context.

**Access rules:**
- Lecturer: must own the course that contains this problem
- Student: must be enrolled in the course that contains this problem

**Response `200`:**
```json
{
  "id": 12,
  "assessmentId": 7,
  "title": "Fizz Buzz",
  "type": "challenge",
  "language": "python",
  "content": { "description": "...", "starterCode": "..." },
  "timeLimitMs": 2000,
  "memoryLimitMb": 256,
  "testCases": [
    {
      "id": 1,
      "stdin": "15",
      "expectedStdout": "FizzBuzz",
      "isHidden": false,
      "position": 0
    }
  ],
  "assessmentContext": {
    "isAssessment": true,
    "assessmentEndsAt": "2026-05-10T18:00:00Z"
  }
}
```

**Notes:**
- `content` is deserialised from the JSON string before returning
- `testCases` for students: hidden cases (`is_hidden=True`) have `stdin` and `expectedStdout` stripped — only `id`, `isHidden`, and `position` are returned
- `assessmentContext.isAssessment` is `true` if the current UTC time is within the assessment window

---

### `GET /courses/:courseId/problems`

List all problems available for practice in a course (outside assessment windows).

**Access:** Student, must be enrolled.

Returns all problems belonging to any assessment in that course. The student's personal best score per problem is included if they have prior submissions.

**Response `200`:**
```json
[
  {
    "id": 12,
    "title": "Fizz Buzz",
    "type": "challenge",
    "language": "python",
    "assessmentTitle": "Lab 1",
    "personalBest": { "score": 4, "total": 5 }
  }
]
```

---

### `PATCH /problems/:problemId`

Update a problem. **Lecturer only, must own the course.**

**Request body** (all optional):
```json
{
  "title": "Updated Title",
  "content": "...",
  "timeLimitMs": 3000,
  "memoryLimitMb": 512
}
```

`type` and `language` are not editable after creation to avoid orphaned test cases.

---

### `DELETE /problems/:problemId`

Delete a problem and all its test cases. **Lecturer only, must own the course.**

Cascade deletes: `TestCase` rows, and optionally `Submission` + `TestResult` rows tied to this problem (decide based on data retention policy — document the choice in code).

**Response `204`.**

---

## Test Case Endpoints

### `POST /problems/:problemId/test-cases`

Replace all test cases for a problem. **Lecturer only, must own the course.**

This is a **replace-all** operation, not append. Send the complete desired set.

**Request body:**
```json
[
  { "stdin": "15",   "expectedStdout": "FizzBuzz", "isHidden": false, "position": 0 },
  { "stdin": "9",    "expectedStdout": "Fizz",     "isHidden": false, "position": 1 },
  { "stdin": "10",   "expectedStdout": "Buzz",     "isHidden": true,  "position": 2 },
  { "stdin": "7",    "expectedStdout": "7",        "isHidden": true,  "position": 3 }
]
```

**Logic:**
1. Verify ownership
2. Delete all existing `TestCase` rows for this problem
3. Bulk-insert the new set
4. Return `200` with the saved test cases

Minimum 1 test case required → `422` if the array is empty.

---

### `GET /problems/:problemId/test-cases`

Get all test cases. **Lecturer only** (students receive test cases embedded in `GET /problems/:id`).

Returns all test cases including hidden ones (with full `stdin` and `expectedStdout`).

---

## Content Field Handling

The `Problem.content` column stores a raw JSON string. Deserialise it in the service layer:

```python
import json

def parse_problem_content(problem: Problem) -> dict:
    try:
        return json.loads(problem.content)
    except (json.JSONDecodeError, TypeError):
        return {}

def serialise_problem_content(content: dict) -> str:
    return json.dumps(content)
```

When returning a problem to the client, always return `content` as a parsed dict, never as a raw string.

---

## Access Control Helper

Problems sit three levels deep: `Problem → Assessment → Course → Lecturer`. Build a helper:

```python
async def get_problem_with_ownership_check(
    db: AsyncSession,
    problem_id: int,
    current_user: User,
) -> Problem:
    result = await db.execute(
        select(Problem)
        .join(Assessment)
        .join(Course)
        .where(Problem.id == problem_id)
        .options(selectinload(Problem.test_cases))
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise NotFoundError("Problem")

    course = problem.assessment.course
    if current_user.role == "lecturer" and course.lecturer_id != current_user.id:
        raise ForbiddenError()
    if current_user.role == "student":
        # check enrollment
        enrollment = await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == course.id,
                Enrollment.user_id == current_user.id,
            )
        )
        if not enrollment.scalar_one_or_none():
            raise ForbiddenError()

    return problem
```

---

## Schemas (`app/schemas/problem.py`, `app/schemas/test_case.py`)

```python
class ProblemCreate(BaseModel):
    assessmentId:   int
    title:          str
    type:           ProblemType
    language:       ProblemLanguage
    content:        dict          # parsed at request time
    timeLimitMs:    int = 2000
    memoryLimitMb:  int = 256

class ProblemUpdate(BaseModel):
    title:         str | None = None
    content:       dict | None = None
    timeLimitMs:   int | None = None
    memoryLimitMb: int | None = None

class TestCaseIn(BaseModel):
    stdin:          str | None = None
    expectedStdout: str
    isHidden:       bool = False
    position:       int  = 0

class TestCaseResponse(BaseModel):
    id:             int
    stdin:          str | None
    expectedStdout: str
    isHidden:       bool
    position:       int
```

---

## Out of Scope

- Problem bank (reuse problems across assessments)
- Problem versioning
- Bulk problem import
- Guided mode block-level test cases (guided blocks use `expectedOutput` in the content JSON, not `TestCase` rows)

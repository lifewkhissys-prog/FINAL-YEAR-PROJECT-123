# DevLab Backend Guide — Submission Pipeline & Grading

**Router:** `app/routers/submissions.py`  
**Services:** `app/services/submission_service.py`, `app/services/grading_service.py`  
**Models:** `Submission`, `TestResult`, `Problem`, `TestCase`, `Assessment`  
**Depends on:** `app/execution/` (execution engines guide)

---

## Overview

There are two submission endpoints:

| Endpoint | Purpose | Records to DB | Affects gradebook |
|----------|---------|---------------|-------------------|
| `POST /submissions/run` | Quick check against visible test cases only | No | No |
| `POST /submissions/submit` | Full graded submission against all test cases | Yes | If within assessment window |

Both endpoints execute synchronously and return results immediately (no background job queue for FYP scope).

---

## `POST /submissions/run`

Run code against visible (non-hidden) test cases only. **Student only.**

**Request body:**
```json
{
  "problemId": 12,
  "code":      "def solution(n):\n    ...",
  "language":  "python",
  "blockId":   null
}
```

`blockId` is only present for guided mode inline checks (see Guided Mode section below).

**Logic:**
1. Fetch the problem, verify the student is enrolled in the course
2. Load visible test cases only (`is_hidden=False`)
3. For each test case, call the appropriate executor
4. Return results immediately — nothing written to the database

**Response `200`:**
```json
{
  "submissionId": null,
  "status": "completed",
  "score": 2,
  "totalCases": 2,
  "results": [
    {
      "testCaseId":     1,
      "passed":         true,
      "stdin":          "15",
      "expectedStdout": "FizzBuzz",
      "actualStdout":   "FizzBuzz",
      "execTimeMs":     42,
      "isHidden":       false
    }
  ]
}
```

---

## `POST /submissions/submit`

Full submission. **Student only.**

**Request body:**
```json
{
  "problemId": 12,
  "code":      "def solution(n):\n    ...",
  "language":  "python"
}
```

**Logic:**
1. Fetch the problem, verify enrollment
2. Determine `is_graded`: check if the current time is within the problem's assessment window using `is_assessment_active(assessment)` (see Assessment Engine guide)
3. Create a `Submission` row with `status="running"`
4. Load **all** test cases (visible + hidden)
5. Execute against each test case using the appropriate executor
6. Create one `TestResult` row per test case
7. Compute `score = count of passed results`
8. Update `Submission.status = "completed"`, `Submission.score = score`
9. Return the full result set

**Response `200`:** Same shape as `/run` but `submissionId` is the saved ID and hidden test cases have `stdin`/`expectedStdout` stripped.

---

## Grading Service (`app/services/grading_service.py`)

The grading service orchestrates execution across all test cases for a submission:

```python
from app.execution import get_executor

async def grade_submission(
    db:         AsyncSession,
    submission: Submission,
    problem:    Problem,
    test_cases: list[TestCase],
) -> list[TestResult]:
    executor = get_executor(problem.language)
    results = []

    for tc in test_cases:
        result = await executor.run(
            code=submission.code,
            language=submission.language,
            stdin=tc.stdin,
            expected_stdout=tc.expected_stdout,
            time_limit_ms=problem.time_limit_ms,
            memory_limit_mb=problem.memory_limit_mb,
        )

        test_result = TestResult(
            submission_id=submission.id,
            test_case_id=tc.id,
            passed=result.passed,
            actual_stdout=result.actual_stdout,
            exec_time_ms=result.exec_time_ms,
            stderr=result.stderr or None,
        )
        db.add(test_result)
        results.append(test_result)

    await db.flush()
    return results
```

---

## Submission Service (`app/services/submission_service.py`)

```python
async def run_submission(db, student, problem_id, code, language, block_id=None):
    problem = await get_problem_with_ownership_check(db, problem_id, student)

    if block_id:
        # Guided mode: single inline check
        return await run_guided_block_check(db, problem, code, language, block_id)

    test_cases = [tc for tc in problem.test_cases if not tc.is_hidden]
    return await execute_and_format(problem, test_cases, code, language, save=False)


async def submit_submission(db, student, problem_id, code, language):
    problem = await get_problem_with_ownership_check(db, problem_id, student)
    assessment = problem.assessment
    is_graded = is_assessment_active(assessment)

    # Create submission record
    submission = Submission(
        user_id=student.id,
        problem_id=problem_id,
        code=code,
        language=language,
        status="running",
        is_graded=is_graded,
    )
    db.add(submission)
    await db.flush()  # get submission.id

    try:
        results = await grade_submission(db, submission, problem, problem.test_cases)
        score = sum(1 for r in results if r.passed)
        submission.status = "completed"
        submission.score  = score
        await db.commit()
        return submission, results
    except Exception as e:
        submission.status = "error"
        await db.commit()
        raise
```

---

## Guided Mode Inline Check

For guided mode, `/submissions/run` with a `blockId` does a single-output check:

```python
async def run_guided_block_check(db, problem, code, language, block_id):
    content = parse_problem_content(problem)
    blocks = content.get("blocks", [])
    block = next((b for b in blocks if b["id"] == block_id and b["type"] == "editor"), None)
    if not block:
        raise NotFoundError("Block")

    expected = block.get("expectedOutput", "")
    executor = get_executor(language)
    result = await executor.run(
        code=code,
        language=language,
        stdin=None,
        expected_stdout=expected,
        time_limit_ms=problem.time_limit_ms,
        memory_limit_mb=problem.memory_limit_mb,
    )

    return {
        "submissionId": None,
        "status": "completed" if result.passed else ("error" if result.stderr else "completed"),
        "score": 1 if result.passed else 0,
        "totalCases": 1,
        "results": [{
            "testCaseId":     None,
            "passed":         result.passed,
            "stdin":          None,
            "expectedStdout": expected,
            "actualStdout":   result.actual_stdout,
            "execTimeMs":     result.exec_time_ms,
            "isHidden":       False,
            "stderr":         result.stderr,
        }]
    }
```

---

## Retrieving Past Submissions

### `GET /submissions/:submissionId`

Fetch a single saved submission with its test results. **Student (own) or Lecturer (any in their course).**

Returns the full `SubmissionResult` shape. Hidden test cases have `stdin`/`expectedStdout` stripped for students.

### `GET /problems/:problemId/submissions`

All submissions for a student on a specific problem. **Student only, own submissions.**

Returns a list ordered by `submitted_at DESC`. Useful for the submission history UI.

```python
select(Submission)
    .where(
        Submission.problem_id == problem_id,
        Submission.user_id == current_user.id,
    )
    .order_by(Submission.submitted_at.desc())
```

---

## Response Schemas (`app/schemas/submission.py`)

```python
class RunRequest(BaseModel):
    problemId: int
    code:      str
    language:  str
    blockId:   str | None = None

class SubmitRequest(BaseModel):
    problemId: int
    code:      str
    language:  str

class TestCaseResultResponse(BaseModel):
    testCaseId:     int | None
    passed:         bool
    stdin:          str | None
    expectedStdout: str | None    # None for hidden cases shown to student
    actualStdout:   str
    execTimeMs:     int
    isHidden:       bool
    stderr:         str | None = None

class SubmissionResultResponse(BaseModel):
    submissionId: int | None
    status:       str           # "completed" | "error"
    score:        int
    totalCases:   int
    results:      list[TestCaseResultResponse]

class SubmissionSummary(BaseModel):
    id:          int
    problemId:   int
    language:    str
    score:       int
    totalCases:  int
    status:      str
    isGraded:    bool
    submittedAt: datetime
```

---

## Error Handling in Execution

If any executor raises an unhandled exception (e.g. Docker daemon not available):

1. Set `Submission.status = "error"`
2. Return a result with `status="error"`, `score=0`, and a single result with `stderr` showing the error message
3. Log the full exception server-side

Never let an execution failure return a 500 to the client — always surface it as a structured error result.

---

## Out of Scope

- Background job queue (Redis/Celery) for async grading — submissions are graded synchronously
- Submission rate limiting per student
- Plagiarism detection between submissions
- Re-grading all submissions after a test case change

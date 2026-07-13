from sqlalchemy.ext.asyncio import AsyncSession
from app.models.submission import Submission
from app.models.problem import Problem
from app.models.test_case import TestCase
from app.models.test_result import TestResult
from app.execution import get_executor

async def grade_submission(
    db:         AsyncSession,
    submission: Submission,
    problem:    Problem,
    test_cases: list[TestCase],
) -> list[TestResult]:
    executor = get_executor(problem.language.value)
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

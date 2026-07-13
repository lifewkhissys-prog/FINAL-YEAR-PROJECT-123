import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.models.user import User, UserRole
from app.models.problem import Problem
from app.models.submission import Submission, SubmissionStatus
from app.models.test_result import TestResult
from app.execution import get_executor
from app.services.problem_service import get_problem_with_ownership_check, parse_problem_content
from app.services.assessment_service import is_assessment_active
from app.services.grading_service import grade_submission
from app.utils.errors import NotFoundError, ForbiddenError, BadRequestError

logger = logging.getLogger(__name__)

async def run_submission(
    db: AsyncSession,
    student: User,
    problem_id: int,
    code: str,
    language: str,
    block_id: str | None = None
) -> dict:
    problem = await get_problem_with_ownership_check(db, problem_id, student)

    if block_id:
        # Guided mode: single inline check
        return await run_guided_block_check(db, problem, code, language, block_id)

    # Student practice run: visible test cases only
    test_cases = [tc for tc in problem.test_cases if not tc.is_hidden]
    return await execute_and_format(problem, test_cases, code, language)

async def execute_and_format(problem: Problem, test_cases: list, code: str, language: str) -> dict:
    executor = get_executor(language)
    results = []
    
    try:
        for tc in test_cases:
            result = await executor.run(
                code=code,
                language=language,
                stdin=tc.stdin,
                expected_stdout=tc.expected_stdout,
                time_limit_ms=problem.time_limit_ms,
                memory_limit_mb=problem.memory_limit_mb,
            )
            results.append({
                "testCaseId": tc.id,
                "passed": result.passed,
                "stdin": tc.stdin,
                "expectedStdout": tc.expected_stdout,
                "actualStdout": result.actual_stdout,
                "execTimeMs": result.exec_time_ms,
                "isHidden": tc.is_hidden,
                "stderr": result.stderr or None
            })
            
        score = sum(1 for r in results if r["passed"])
        return {
            "submissionId": None,
            "status": "completed",
            "score": score,
            "totalCases": len(test_cases),
            "results": results
        }
    except Exception as e:
        logger.exception("Practice run execution failed")
        return {
            "submissionId": None,
            "status": "error",
            "score": 0,
            "totalCases": len(test_cases),
            "results": [{
                "testCaseId": None,
                "passed": False,
                "stdin": None,
                "expectedStdout": None,
                "actualStdout": "",
                "execTimeMs": 0,
                "isHidden": False,
                "stderr": str(e)
            }]
        }

async def run_guided_block_check(db: AsyncSession, problem: Problem, code: str, language: str, block_id: str) -> dict:
    content = parse_problem_content(problem)
    blocks = content.get("blocks", [])
    block = next((b for b in blocks if b.get("id") == block_id and b.get("type") == "editor"), None)
    if not block:
        raise NotFoundError("Block")

    expected = block.get("expectedOutput", "")
    executor = get_executor(language)
    
    try:
        result = await executor.run(
            code=code,
            language=language,
            stdin=None,
            expected_stdout=expected,
            time_limit_ms=problem.time_limit_ms,
            memory_limit_mb=problem.memory_limit_mb,
        )
        
        status = "completed"
        if result.stderr:
            # Let it be completed with error details if compiler/interpreter output has stderr
            status = "completed"
            
        return {
            "submissionId": None,
            "status": status,
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
                "stderr":         result.stderr or None,
            }]
        }
    except Exception as e:
        logger.exception("Guided block run failed")
        return {
            "submissionId": None,
            "status": "error",
            "score": 0,
            "totalCases": 1,
            "results": [{
                "testCaseId":     None,
                "passed":         False,
                "stdin":          None,
                "expectedStdout": expected,
                "actualStdout":   "",
                "execTimeMs":     0,
                "isHidden":       False,
                "stderr":         str(e),
            }]
        }

async def submit_submission(db: AsyncSession, student: User, problem_id: int, code: str, language: str) -> dict:
    problem = await get_problem_with_ownership_check(db, problem_id, student)
    assessment = problem.assessment
    is_graded = is_assessment_active(assessment)

    # Create submission record
    submission = Submission(
        user_id=student.id,
        problem_id=problem_id,
        code=code,
        language=language,
        status=SubmissionStatus.running,
        is_graded=is_graded,
    )
    db.add(submission)
    await db.flush()  # get submission.id

    try:
        results = await grade_submission(db, submission, problem, problem.test_cases)
        score = sum(1 for r in results if r.passed)
        submission.status = SubmissionStatus.completed
        submission.score = score
        await db.commit()
        
        # Format response
        formatted_results = []
        for tc, r in zip(problem.test_cases, results):
            # Strip hidden test case info for students
            is_hidden = tc.is_hidden
            formatted_results.append({
                "testCaseId": tc.id,
                "passed": r.passed,
                "stdin": None if is_hidden else tc.stdin,
                "expectedStdout": None if is_hidden else tc.expected_stdout,
                "actualStdout": r.actual_stdout,
                "execTimeMs": r.exec_time_ms,
                "isHidden": is_hidden,
                "stderr": r.stderr
            })
            
        return {
            "submissionId": submission.id,
            "status": "completed",
            "score": score,
            "totalCases": len(problem.test_cases),
            "results": formatted_results
        }
        
    except Exception as e:
        logger.exception("Submission grading failed")
        submission.status = SubmissionStatus.error
        await db.commit()
        return {
            "submissionId": submission.id,
            "status": "error",
            "score": 0,
            "totalCases": len(problem.test_cases),
            "results": [{
                "testCaseId": None,
                "passed": False,
                "stdin": None,
                "expectedStdout": None,
                "actualStdout": "",
                "execTimeMs": 0,
                "isHidden": False,
                "stderr": str(e)
            }]
        }

async def get_submission_detail(db: AsyncSession, submission_id: int, user: User) -> dict:
    result = await db.execute(
        select(Submission)
        .where(Submission.id == submission_id)
        .options(
            selectinload(Submission.results).selectinload(TestResult.test_case),
            selectinload(Submission.problem).selectinload(Problem.assessment).selectinload(Assessment.course)
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission")
        
    # Check access
    course = submission.problem.assessment.course
    if user.role == UserRole.lecturer:
        if course.lecturer_id != user.id:
            raise ForbiddenError("You do not own this course")
    else:
        if submission.user_id != user.id:
            raise ForbiddenError("You do not own this submission")
            
    # Format response
    formatted_results = []
    for r in submission.results:
        is_hidden = r.test_case.is_hidden
        formatted_results.append({
            "testCaseId": r.test_case_id,
            "passed": r.passed,
            "stdin": None if (is_hidden and user.role == UserRole.student) else r.test_case.stdin,
            "expectedStdout": None if (is_hidden and user.role == UserRole.student) else r.test_case.expected_stdout,
            "actualStdout": r.actual_stdout,
            "execTimeMs": r.exec_time_ms,
            "isHidden": is_hidden,
            "stderr": r.stderr
        })
        
    return {
        "submissionId": submission.id,
        "status": submission.status.value,
        "score": submission.score,
        "totalCases": len(submission.results),
        "results": formatted_results
    }

async def get_problem_submissions(db: AsyncSession, problem_id: int, student_id: int) -> list[dict]:
    # Verify enrollment
    await get_problem_with_ownership_check(db, problem_id, User(id=student_id, role=UserRole.student))
    
    result = await db.execute(
        select(Submission)
        .where(
            and_(
                Submission.problem_id == problem_id,
                Submission.user_id == student_id
            )
        )
        .options(selectinload(Submission.problem).selectinload(Problem.test_cases))
        .order_by(Submission.submitted_at.desc())
    )
    submissions = result.scalars().all()
    
    return [
        {
            "id": s.id,
            "problemId": s.problem_id,
            "language": s.language,
            "score": s.score,
            "totalCases": len(s.problem.test_cases),
            "status": s.status.value,
            "isGraded": s.is_graded,
            "submittedAt": s.submitted_at
        }
        for s in submissions
    ]

import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.problem import Problem, ProblemType, ProblemLanguage
from app.models.test_case import TestCase
from app.models.submission import Submission
from app.schemas.problem import ProblemCreate, ProblemUpdate
from app.schemas.test_case import TestCaseIn
from app.services.course_service import assert_lecturer_owns_course, assert_student_enrolled
from app.services.assessment_service import ensure_utc, is_assessment_active
from app.utils.errors import NotFoundError, ForbiddenError, BadRequestError

def parse_problem_content(problem: Problem) -> dict:
    try:
        return json.loads(problem.content)
    except (json.JSONDecodeError, TypeError):
        return {}

def serialise_problem_content(content: dict) -> str:
    return json.dumps(content)

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
        .options(
            selectinload(Problem.test_cases),
            selectinload(Problem.assessment).selectinload(Assessment.course)
        )
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise NotFoundError("Problem")

    course = problem.assessment.course
    if current_user.role == UserRole.lecturer:
        if course.lecturer_id != current_user.id:
            raise ForbiddenError("You do not own this course")
    elif current_user.role == UserRole.student:
        # Check enrollment
        enrollment = await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == course.id,
                Enrollment.user_id == current_user.id,
            )
        )
        if not enrollment.scalar_one_or_none():
            raise ForbiddenError("You are not enrolled in this course")

    return problem

async def create_problem(db: AsyncSession, lecturer_id: int, data: ProblemCreate) -> Problem:
    # 1. Fetch assessment
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == data.assessment_id)
        .options(selectinload(Assessment.course))
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    # Check ownership
    await assert_lecturer_owns_course(db, assessment.course_id, lecturer_id)
    
    # Create problem
    problem = Problem(
        assessment_id=data.assessment_id,
        title=data.title,
        type=data.type,
        language=data.language,
        content=serialise_problem_content(data.content),
        time_limit_ms=data.time_limit_ms,
        memory_limit_mb=data.memory_limit_mb
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return problem

async def get_problem_detail(db: AsyncSession, problem_id: int, user: User) -> dict:
    problem = await get_problem_with_ownership_check(db, problem_id, user)
    
    # Decode content
    content_dict = parse_problem_content(problem)
    
    # Process test cases: students should not see stdin/expected_stdout for hidden test cases
    test_cases_list = []
    # Sort test cases by position
    sorted_cases = sorted(problem.test_cases, key=lambda tc: tc.position)
    for tc in sorted_cases:
        is_hidden = tc.is_hidden
        if is_hidden and user.role == UserRole.student:
            test_cases_list.append({
                "id": tc.id,
                "stdin": None,
                "expected_stdout": None,
                "is_hidden": True,
                "position": tc.position
            })
        else:
            test_cases_list.append({
                "id": tc.id,
                "stdin": tc.stdin,
                "expected_stdout": tc.expected_stdout,
                "is_hidden": tc.is_hidden,
                "position": tc.position
            })
            
    # Assessment context
    now = datetime.now(timezone.utc)
    is_active = is_assessment_active(problem.assessment)
    ends_at_str = ensure_utc(problem.assessment.ends_at).isoformat()
    
    context = {
        "is_assessment": is_active,
        "assessment_ends_at": ends_at_str if is_active else None
    }
    
    return {
        "id": problem.id,
        "assessment_id": problem.assessment_id,
        "title": problem.title,
        "type": problem.type.value,
        "language": problem.language.value,
        "content": content_dict,
        "time_limit_ms": problem.time_limit_ms,
        "memory_limit_mb": problem.memory_limit_mb,
        "test_cases": test_cases_list,
        "assessment_context": context
    }

async def get_practice_problems(db: AsyncSession, course_id: int, student_id: int) -> list[dict]:
    await assert_student_enrolled(db, course_id, student_id)
    
    # Practice problems are problems whose assessment window has ended OR practice problems generally.
    # But wait, the guide says: "List all problems available for practice in a course (outside assessment windows)."
    # Meaning their assessment has started or ended? Or they can practice if not currently inside active assessment window?
    # In standard systems, practice means assessment has ended, or practicing generally. Let's return all problems
    # where the assessment has ended (or starts_at <= now, but ends_at < now).
    # Wait, the guide says: "practice in a course (outside assessment windows)."
    # Let's filter out problems where the assessment is currently ACTIVE. That means students can practice after the assessment ends,
    # or before it starts? Before starting, it shouldn't show. So ends_at < now is correct!
    now = datetime.now(timezone.utc)
    
    result = await db.execute(
        select(Problem)
        .join(Assessment)
        .where(
            and_(
                Assessment.course_id == course_id,
                Assessment.ends_at < now
            )
        )
        .options(
            selectinload(Problem.assessment),
            selectinload(Problem.test_cases)
        )
    )
    problems = result.scalars().all()
    
    out = []
    for p in problems:
        # Find student's personal best score on this problem
        pb_res = await db.execute(
            select(func.max(Submission.score))
            .where(
                and_(
                    Submission.user_id == student_id,
                    Submission.problem_id == p.id,
                    Submission.status == "completed"
                )
            )
        )
        pb_score = pb_res.scalar_one_or_none()
        
        total_cases = len(p.test_cases)
        
        pb = None
        if pb_score is not None:
            pb = {
                "score": pb_score,
                "total": total_cases
            }
            
        out.append({
            "id": p.id,
            "title": p.title,
            "type": p.type.value,
            "language": p.language.value,
            "assessment_title": p.assessment.title,
            "personal_best": pb
        })
    return out

async def update_problem(db: AsyncSession, problem_id: int, lecturer_id: int, data: ProblemUpdate) -> Problem:
    problem = await get_problem_with_ownership_check(db, problem_id, User(id=lecturer_id, role=UserRole.lecturer))
    
    if data.title is not None:
        problem.title = data.title
    if data.content is not None:
        problem.content = serialise_problem_content(data.content)
    if data.time_limit_ms is not None:
        problem.time_limit_ms = data.time_limit_ms
    if data.memory_limit_mb is not None:
        problem.memory_limit_mb = data.memory_limit_mb
        
    await db.commit()
    await db.refresh(problem)
    return problem

async def delete_problem(db: AsyncSession, problem_id: int, lecturer_id: int) -> None:
    problem = await get_problem_with_ownership_check(db, problem_id, User(id=lecturer_id, role=UserRole.lecturer))
    await db.delete(problem)
    await db.commit()

async def replace_test_cases(
    db: AsyncSession,
    problem_id: int,
    lecturer_id: int,
    test_cases_list: list[TestCaseIn]
) -> list[TestCase]:
    if not test_cases_list:
        raise BadRequestError("At least one test case is required")
        
    problem = await get_problem_with_ownership_check(db, problem_id, User(id=lecturer_id, role=UserRole.lecturer))
    
    # 1. Delete all existing test cases
    for tc in problem.test_cases:
        await db.delete(tc)
        
    # 2. Insert new ones
    new_cases = []
    for item in test_cases_list:
        new_tc = TestCase(
            problem_id=problem_id,
            stdin=item.stdin,
            expected_stdout=item.expected_stdout,
            is_hidden=item.is_hidden,
            position=item.position
        )
        db.add(new_tc)
        new_cases.append(new_tc)
        
    await db.commit()
    
    # Reload from DB to return
    result = await db.execute(
        select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.position.asc())
    )
    return result.scalars().all()

async def get_test_cases(db: AsyncSession, problem_id: int, lecturer_id: int) -> list[TestCase]:
    problem = await get_problem_with_ownership_check(db, problem_id, User(id=lecturer_id, role=UserRole.lecturer))
    result = await db.execute(
        select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.position.asc())
    )
    return result.scalars().all()

from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.problem import Problem
from app.models.submission import Submission, SubmissionStatus
from app.models.test_case import TestCase
from app.services.course_service import assert_lecturer_owns_course, assert_student_enrolled
from app.services.assessment_service import ensure_utc, compute_status
from app.utils.errors import NotFoundError, ForbiddenError

async def get_lecturer_dashboard(db: AsyncSession, lecturer_id: int) -> dict:
    now = datetime.now(timezone.utc)
    
    # Total courses
    courses_res = await db.execute(
        select(func.count(Course.id)).where(Course.lecturer_id == lecturer_id)
    )
    total_courses = courses_res.scalar_one() or 0
    
    # Active assessments
    active_res = await db.execute(
        select(Assessment)
        .join(Course)
        .where(
            and_(
                Course.lecturer_id == lecturer_id,
                Assessment.starts_at <= now,
                Assessment.ends_at >= now
            )
        )
    )
    active_assessments_count = len(active_res.scalars().all())
    
    # Total unique students enrolled
    students_res = await db.execute(
        select(func.count(func.distinct(Enrollment.user_id)))
        .join(Course)
        .where(Course.lecturer_id == lecturer_id)
    )
    total_students = students_res.scalar_one() or 0
    
    # Recent assessments (last 5 starts_at desc)
    recent_res = await db.execute(
        select(Assessment)
        .join(Course)
        .where(Course.lecturer_id == lecturer_id)
        .options(selectinload(Assessment.course))
        .order_by(Assessment.starts_at.desc())
        .limit(5)
    )
    recent_assessments = recent_res.scalars().all()
    
    recent_list = []
    for a in recent_assessments:
        recent_list.append({
            "id": a.id,
            "title": a.title,
            "courseName": a.course.title if a.course else "Unknown",
            "status": compute_status(a),
            "startsAt": a.starts_at,
            "endsAt": a.ends_at
        })
        
    return {
        "totalCourses": total_courses,
        "activeAssessments": active_assessments_count,
        "totalStudents": total_students,
        "recentAssessments": recent_list
    }

async def get_student_dashboard(db: AsyncSession, student_id: int) -> dict:
    now = datetime.now(timezone.utc)
    
    # Active assessments (starts_at <= now <= ends_at)
    active_res = await db.execute(
        select(Assessment)
        .join(Course)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .where(
            and_(
                Enrollment.user_id == student_id,
                Assessment.starts_at <= now,
                Assessment.ends_at >= now
            )
        )
        .options(selectinload(Assessment.course))
        .order_by(Assessment.ends_at.asc())
    )
    active_assessments = active_res.scalars().all()
    
    # Upcoming assessments (starts_at > now, up to 7 days out)
    in_seven_days = now + timedelta(days=7)
    upcoming_res = await db.execute(
        select(Assessment)
        .join(Course)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .where(
            and_(
                Enrollment.user_id == student_id,
                Assessment.starts_at > now,
                Assessment.starts_at <= in_seven_days
            )
        )
        .options(selectinload(Assessment.course))
        .order_by(Assessment.starts_at.asc())
    )
    upcoming_assessments = upcoming_res.scalars().all()
    
    # Enrolled courses
    courses_res = await db.execute(
        select(Course)
        .join(Enrollment)
        .where(Enrollment.user_id == student_id)
        .options(selectinload(Course.lecturer))
    )
    enrolled_courses = courses_res.scalars().all()
    
    return {
        "activeAssessments": [
            {
                "id": a.id,
                "title": a.title,
                "courseName": a.course.title if a.course else "Unknown",
                "endsAt": a.ends_at
            }
            for a in active_assessments
        ],
        "upcomingAssessments": [
            {
                "id": a.id,
                "title": a.title,
                "courseName": a.course.title if a.course else "Unknown",
                "startsAt": a.starts_at
            }
            for a in upcoming_assessments
        ],
        "enrolledCourses": [
            {
                "id": c.id,
                "title": c.title,
                "language": c.language.value,
                "lecturerName": c.lecturer.name if c.lecturer else "Unknown"
            }
            for c in enrolled_courses
        ]
    }

async def get_assessment_gradebook(db: AsyncSession, assessment_id: int, lecturer_id: int) -> dict:
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(selectinload(Assessment.course))
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    await assert_lecturer_owns_course(db, assessment.course_id, lecturer_id)
    
    # Get all problems in the assessment
    prob_res = await db.execute(
        select(Problem)
        .where(Problem.assessment_id == assessment_id)
        .options(selectinload(Problem.test_cases))
    )
    problems = prob_res.scalars().all()
    problems_json = [{"id": p.id, "title": p.title} for p in problems]
    
    # Get all enrolled students
    students_res = await db.execute(
        select(User)
        .join(Enrollment)
        .where(Enrollment.course_id == assessment.course_id)
        .order_by(User.name.asc())
    )
    students = students_res.scalars().all()
    
    # Fetch all completed graded submissions for these problems
    sub_res = await db.execute(
        select(Submission)
        .where(
            and_(
                Submission.problem_id.in_([p.id for p in problems]) if problems else False,
                Submission.is_graded == True,
                Submission.status == SubmissionStatus.completed
            )
        )
    )
    submissions = sub_res.scalars().all()
    
    # Group by student & problem, selecting the best (highest score, then most recent)
    best_subs = {} # (user_id, problem_id) -> Submission
    for s in submissions:
        key = (s.user_id, s.problem_id)
        if key not in best_subs:
            best_subs[key] = s
        else:
            curr = best_subs[key]
            if s.score > curr.score:
                best_subs[key] = s
            elif s.score == curr.score:
                if s.submitted_at > curr.submitted_at:
                    best_subs[key] = s
                    
    # Map problems to total cases count
    total_cases = {p.id: len(p.test_cases) for p in problems}
    
    # Assemble gradebook rows
    rows = []
    for std in students:
        scores_map = {}
        for p in problems:
            s_record = best_subs.get((std.id, p.id))
            if s_record:
                scores_map[str(p.id)] = {
                    "score": s_record.score,
                    "total": total_cases[p.id],
                    "submissionId": s_record.id
                }
            else:
                scores_map[str(p.id)] = None
                
        rows.append({
            "userId": std.id,
            "name": std.name,
            "email": std.email,
            "scores": scores_map
        })
        
    return {
        "assessmentId": assessment.id,
        "assessmentTitle": assessment.title,
        "problems": problems_json,
        "rows": rows
    }

async def get_assessment_student_submissions(
    db: AsyncSession,
    assessment_id: int,
    student_id: int,
    lecturer_id: int
) -> list[dict]:
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment_id)
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    await assert_lecturer_owns_course(db, assessment.course_id, lecturer_id)
    
    # Get all problems in the assessment
    prob_res = await db.execute(
        select(Problem)
        .where(Problem.assessment_id == assessment_id)
    )
    problems = prob_res.scalars().all()
    problems_map = {p.id: p for p in problems}
    
    # Get all submissions by student for these problems
    sub_res = await db.execute(
        select(Submission)
        .where(
            and_(
                Submission.user_id == student_id,
                Submission.problem_id.in_([p.id for p in problems]) if problems else False
            )
        )
        .options(selectinload(Submission.problem).selectinload(Problem.test_cases))
        .order_by(Submission.submitted_at.desc())
    )
    submissions = sub_res.scalars().all()
    
    # Group by problem
    submissions_by_problem = {p.id: [] for p in problems}
    for s in submissions:
        submissions_by_problem[s.problem_id].append({
            "id": s.id,
            "language": s.language,
            "score": s.score,
            "totalCases": len(s.problem.test_cases),
            "status": s.status.value,
            "isGraded": s.is_graded,
            "submittedAt": s.submitted_at
        })
        
    out = []
    for p in problems:
        out.append({
            "problemId": p.id,
            "problemTitle": p.title,
            "submissions": submissions_by_problem[p.id]
        })
    return out

async def get_course_student_submissions(
    db: AsyncSession,
    course_id: int,
    student_id: int,
    lecturer_id: int
) -> list[dict]:
    await assert_lecturer_owns_course(db, course_id, lecturer_id)
    
    # Find all assessments in the course
    assessments_res = await db.execute(
        select(Assessment)
        .where(Assessment.course_id == course_id)
        .order_by(Assessment.starts_at.desc())
    )
    assessments = assessments_res.scalars().all()
    
    out = []
    for a in assessments:
        # Get submissions for this assessment
        p_subs = await get_assessment_student_submissions(db, a.id, student_id, lecturer_id)
        # Only append if there are problems
        if p_subs:
            out.extend(p_subs)
    return out

async def get_assessment_results_student(db: AsyncSession, assessment_id: int, student_id: int) -> dict:
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment_id)
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    await assert_student_enrolled(db, assessment.course_id, student_id)
    
    # If the assessment is still active, student is forbidden to see detailed results
    now = datetime.now(timezone.utc)
    ends = ensure_utc(assessment.ends_at)
    if now <= ends:
        raise ForbiddenError("Assessment is still in progress")
        
    # Get all problems in the assessment
    prob_res = await db.execute(
        select(Problem)
        .where(Problem.assessment_id == assessment_id)
        .options(selectinload(Problem.test_cases))
    )
    problems = prob_res.scalars().all()
    
    # For each problem, find student's best graded submission
    formatted_problems = []
    total_score = 0
    total_possible = 0
    
    for p in problems:
        sub_res = await db.execute(
            select(Submission)
            .where(
                and_(
                    Submission.user_id == student_id,
                    Submission.problem_id == p.id,
                    Submission.is_graded == True,
                    Submission.status == SubmissionStatus.completed
                )
            )
            .order_by(Submission.score.desc(), Submission.submitted_at.desc())
            .limit(1)
        )
        s = sub_res.scalar_one_or_none()
        
        tc_count = len(p.test_cases)
        total_possible += tc_count
        
        if s:
            total_score += s.score
            formatted_problems.append({
                "id": p.id,
                "title": p.title,
                "score": s.score,
                "totalCases": tc_count,
                "status": s.status.value,
                "submissionId": s.id
            })
        else:
            formatted_problems.append({
                "id": p.id,
                "title": p.title,
                "score": 0,
                "totalCases": tc_count,
                "status": "not_submitted",
                "submissionId": None
            })
            
    return {
        "assessmentId": assessment.id,
        "assessmentTitle": assessment.title,
        "totalScore": total_score,
        "totalPossible": total_possible,
        "problems": formatted_problems
    }

async def get_student_submissions_list(
    db: AsyncSession,
    student_id: int,
    course_id: int | None = None,
    prob_type: str | None = None,
    status: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    page: int = 1,
    page_size: int = 20
) -> dict:
    # Build filter query
    query = (
        select(Submission)
        .join(Problem)
        .join(Assessment)
        .join(Course)
        .where(Submission.user_id == student_id)
    )
    
    if course_id:
        query = query.where(Assessment.course_id == course_id)
    if prob_type:
        query = query.where(Problem.type == prob_type)
    if status:
        query = query.where(Submission.status == status)
    if from_date:
        query = query.where(Submission.submitted_at >= from_date)
    if to_date:
        query = query.where(Submission.submitted_at <= to_date)
        
    # Get total count first
    count_query = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_query)
    total = count_res.scalar_one() or 0
    
    # Run paged query
    query = (
        query
        .options(
            selectinload(Submission.problem).selectinload(Problem.test_cases),
            selectinload(Submission.problem).selectinload(Problem.assessment).selectinload(Assessment.course)
        )
        .order_by(Submission.submitted_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(query)
    items = res.scalars().all()
    
    formatted_items = []
    for s in items:
        prob = s.problem
        assess = prob.assessment
        course = assess.course
        
        formatted_items.append({
            "id": s.id,
            "problemId": s.problem_id,
            "problemTitle": prob.title,
            "courseId": course.id if course else None,
            "courseName": course.title if course else "Unknown",
            "language": s.language,
            "score": s.score,
            "totalCases": len(prob.test_cases),
            "status": s.status.value,
            "isGraded": s.is_graded,
            "submittedAt": s.submitted_at
        })
        
    return {
        "total": total,
        "page": page,
        "items": formatted_items
    }

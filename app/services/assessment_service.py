from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.user import User, UserRole
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate
from app.services.course_service import assert_lecturer_owns_course, assert_student_enrolled
from app.utils.errors import NotFoundError, ForbiddenError, BadRequestError

def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def compute_status(assessment: Assessment) -> str:
    now = datetime.now(timezone.utc)
    starts = ensure_utc(assessment.starts_at)
    ends = ensure_utc(assessment.ends_at)
    
    if now < starts:
        return "scheduled"
    if starts <= now <= ends:
        return "active"
    return "ended"

def is_assessment_active(assessment: Assessment) -> bool:
    now = datetime.now(timezone.utc)
    starts = ensure_utc(assessment.starts_at)
    ends = ensure_utc(assessment.ends_at)
    return starts <= now <= ends

async def create_assessment(db: AsyncSession, lecturer_id: int, data: AssessmentCreate) -> Assessment:
    # 1. Fetch course & check ownership
    course = await assert_lecturer_owns_course(db, data.course_id, lecturer_id)
    
    # starts_at and ends_at validation
    starts = ensure_utc(data.starts_at)
    ends = ensure_utc(data.ends_at)
    if ends <= starts:
        raise BadRequestError("End time must be after start time")
        
    duration_secs = int((ends - starts).total_seconds())
    
    assessment = Assessment(
        course_id=data.course_id,
        title=data.title,
        starts_at=starts,
        ends_at=ends,
        duration_secs=duration_secs
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    
    # Reload with course relation
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment.id)
        .options(selectinload(Assessment.course))
    )
    c = result.scalar_one()
    return {
        "id": c.id,
        "course_id": c.course_id,
        "course_name": c.course.title if c.course else "Unknown",
        "title": c.title,
        "starts_at": c.starts_at,
        "ends_at": c.ends_at,
        "duration_secs": c.duration_secs,
        "status": compute_status(c),
        "problems": [],
        "created_at": c.created_at
    }


async def get_assessment_detail(db: AsyncSession, assessment_id: int, user: User) -> dict:
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(
            selectinload(Assessment.course),
            selectinload(Assessment.problems)
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    # Check access
    if user.role == UserRole.lecturer:
        await assert_lecturer_owns_course(db, assessment.course_id, user.id)
    else:
        await assert_student_enrolled(db, assessment.course_id, user.id)
        
    # Check if assessment starts in future for student
    now = datetime.now(timezone.utc)
    starts = ensure_utc(assessment.starts_at)
    if user.role == UserRole.student and now < starts:
        # Student cannot see assessment details (problems) before it starts
        raise ForbiddenError("This assessment has not started yet")
        
    status = compute_status(assessment)
    
    problems_list = []
    for p in assessment.problems:
        problems_list.append({
            "id": p.id,
            "title": p.title,
            "type": p.type.value,
            "language": p.language.value
        })
        
    return {
        "id": assessment.id,
        "course_id": assessment.course_id,
        "course_name": assessment.course.title if assessment.course else "Unknown",
        "title": assessment.title,
        "starts_at": assessment.starts_at,
        "ends_at": assessment.ends_at,
        "duration_secs": assessment.duration_secs,
        "status": status,
        "problems": problems_list,
        "created_at": assessment.created_at
    }

async def get_course_assessments(db: AsyncSession, course_id: int, user: User) -> list[dict]:
    if user.role == UserRole.lecturer:
        await assert_lecturer_owns_course(db, course_id, user.id)
    else:
        await assert_student_enrolled(db, course_id, user.id)
        
    result = await db.execute(
        select(Assessment)
        .where(Assessment.course_id == course_id)
        .options(selectinload(Assessment.course))
        .order_by(Assessment.starts_at.asc())
    )
    assessments = result.scalars().all()
    
    out = []
    for a in assessments:
        out.append({
            "id": a.id,
            "course_id": a.course_id,
            "course_name": a.course.title if a.course else "Unknown",
            "title": a.title,
            "starts_at": a.starts_at,
            "ends_at": a.ends_at,
            "duration_secs": a.duration_secs,
            "status": compute_status(a),
            "problems": [],
            "created_at": a.created_at
        })
    return out

async def update_assessment(db: AsyncSession, assessment_id: int, lecturer_id: int, data: AssessmentUpdate) -> dict:
    result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment_id)
        .options(selectinload(Assessment.course))
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    await assert_lecturer_owns_course(db, assessment.course_id, lecturer_id)
    
    # If the assessment has already ended, reject all edits with 400
    now = datetime.now(timezone.utc)
    ends = ensure_utc(assessment.ends_at)
    if ends < now:
        raise BadRequestError("This assessment has ended and cannot be edited")
        
    # Apply updates
    if data.title is not None:
        assessment.title = data.title
        
    starts = ensure_utc(data.starts_at) if data.starts_at is not None else ensure_utc(assessment.starts_at)
    ends = ensure_utc(data.ends_at) if data.ends_at is not None else ensure_utc(assessment.ends_at)
    
    if data.starts_at is not None or data.ends_at is not None:
        if ends <= starts:
            raise BadRequestError("End time must be after start time")
        assessment.starts_at = starts
        assessment.ends_at = ends
        assessment.duration_secs = int((ends - starts).total_seconds())
        
    await db.commit()
    await db.refresh(assessment)
    
    reload_result = await db.execute(
        select(Assessment)
        .where(Assessment.id == assessment.id)
        .options(
            selectinload(Assessment.course),
            selectinload(Assessment.problems)
        )
    )
    c = reload_result.scalar_one()
    problems_list = []
    for p in c.problems:
        problems_list.append({
            "id": p.id,
            "title": p.title,
            "type": p.type.value,
            "language": p.language.value
        })
    return {
        "id": c.id,
        "course_id": c.course_id,
        "course_name": c.course.title if c.course else "Unknown",
        "title": c.title,
        "starts_at": c.starts_at,
        "ends_at": c.ends_at,
        "duration_secs": c.duration_secs,
        "status": compute_status(c),
        "problems": problems_list,
        "created_at": c.created_at
    }


async def delete_assessment(db: AsyncSession, assessment_id: int, lecturer_id: int) -> None:
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise NotFoundError("Assessment")
        
    await assert_lecturer_owns_course(db, assessment.course_id, lecturer_id)
    
    await db.delete(assessment)
    await db.commit()

async def get_upcoming_student_assessments(db: AsyncSession, student_id: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    in_seven_days = now + timedelta(days=7)
    
    result = await db.execute(
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
    assessments = result.scalars().all()
    
    return [
        {
            "id": a.id,
            "title": a.title,
            "course_name": a.course.title if a.course else "Unknown",
            "starts_at": a.starts_at
        }
        for a in assessments
    ]

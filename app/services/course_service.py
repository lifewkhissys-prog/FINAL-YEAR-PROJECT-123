from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.course import Course, CourseLanguage
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.user import User, UserRole
from app.schemas.course import CourseCreate, CourseUpdate
from app.utils.errors import NotFoundError, ForbiddenError, ConflictError, BadRequestError

async def assert_lecturer_owns_course(db: AsyncSession, course_id: int, lecturer_id: int) -> Course:
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.lecturer))
    )
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course")
    if course.lecturer_id != lecturer_id:
        raise ForbiddenError("You do not own this course")
    return course

async def assert_student_enrolled(db: AsyncSession, course_id: int, student_id: int) -> Course:
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.lecturer))
    )
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course")
        
    enroll_result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == student_id
        )
    )
    if not enroll_result.scalar_one_or_none():
        raise ForbiddenError("You are not enrolled in this course")
    return course

async def get_courses_for_user(db: AsyncSession, user: User) -> list[dict]:
    if user.role == UserRole.lecturer:
        query = select(Course).where(Course.lecturer_id == user.id)
    else:
        query = select(Course).join(Enrollment).where(Enrollment.user_id == user.id)
        
    result = await db.execute(query.options(selectinload(Course.lecturer)))
    courses = result.scalars().all()
    
    out = []
    for c in courses:
        student_count_res = await db.execute(
            select(func.count(Enrollment.id)).where(Enrollment.course_id == c.id)
        )
        student_count = student_count_res.scalar_one() or 0
        
        assessment_count_res = await db.execute(
            select(func.count(Assessment.id)).where(Assessment.course_id == c.id)
        )
        assessment_count = assessment_count_res.scalar_one() or 0
        
        out.append({
            "id": c.id,
            "title": c.title,
            "language": c.language.value,
            "description": c.description,
            "lecturer_id": c.lecturer_id,
            "lecturer_name": c.lecturer.name if c.lecturer else "Unknown",
            "student_count": student_count,
            "assessment_count": assessment_count,
            "created_at": c.created_at
        })
    return out

async def get_course_detail(db: AsyncSession, course_id: int, user: User) -> dict:
    if user.role == UserRole.lecturer:
        course = await assert_lecturer_owns_course(db, course_id, user.id)
    else:
        course = await assert_student_enrolled(db, course_id, user.id)
        
    student_count_res = await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.course_id == course.id)
    )
    student_count = student_count_res.scalar_one() or 0
    
    assessment_count_res = await db.execute(
        select(func.count(Assessment.id)).where(Assessment.course_id == course.id)
    )
    assessment_count = assessment_count_res.scalar_one() or 0
    
    return {
        "id": course.id,
        "title": course.title,
        "language": course.language.value,
        "description": course.description,
        "lecturer_id": course.lecturer_id,
        "lecturer_name": course.lecturer.name if course.lecturer else "Unknown",
        "student_count": student_count,
        "assessment_count": assessment_count,
        "created_at": course.created_at
    }

async def create_course(db: AsyncSession, lecturer_id: int, data: CourseCreate) -> dict:
    # Validate language is valid
    if data.language not in CourseLanguage.__members__.values():
        raise BadRequestError("Invalid course language")
        
    course = Course(
        title=data.title,
        language=data.language,
        description=data.description,
        lecturer_id=lecturer_id
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    
    # We fetch it again with relationship preloaded
    result = await db.execute(
        select(Course).where(Course.id == course.id).options(selectinload(Course.lecturer))
    )
    c = result.scalar_one()
    return {
        "id": c.id,
        "title": c.title,
        "language": c.language.value,
        "description": c.description,
        "lecturer_id": c.lecturer_id,
        "lecturer_name": c.lecturer.name if c.lecturer else "Unknown",
        "student_count": 0,
        "assessment_count": 0,
        "created_at": c.created_at
    }

async def update_course(db: AsyncSession, course_id: int, lecturer_id: int, data: CourseUpdate) -> dict:
    course = await assert_lecturer_owns_course(db, course_id, lecturer_id)
    
    if data.title is not None:
        course.title = data.title
    if data.language is not None:
        if data.language not in CourseLanguage.__members__.values():
            raise BadRequestError("Invalid course language")
        course.language = data.language
    if data.description is not None:
        course.description = data.description
        
    await db.commit()
    await db.refresh(course)
    
    student_count_res = await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.course_id == course.id)
    )
    student_count = student_count_res.scalar_one() or 0
    
    assessment_count_res = await db.execute(
        select(func.count(Assessment.id)).where(Assessment.course_id == course.id)
    )
    assessment_count = assessment_count_res.scalar_one() or 0

    return {
        "id": course.id,
        "title": course.title,
        "language": course.language.value,
        "description": course.description,
        "lecturer_id": course.lecturer_id,
        "lecturer_name": course.lecturer.name if course.lecturer else "Unknown",
        "student_count": student_count,
        "assessment_count": assessment_count,
        "created_at": course.created_at
    }


async def delete_course(db: AsyncSession, course_id: int, lecturer_id: int) -> None:
    course = await assert_lecturer_owns_course(db, course_id, lecturer_id)
    await db.delete(course)
    await db.commit()

async def get_enrolled_students(db: AsyncSession, course_id: int, lecturer_id: int) -> list[dict]:
    await assert_lecturer_owns_course(db, course_id, lecturer_id)
    
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.course_id == course_id)
        .options(selectinload(Enrollment.student))
    )
    enrollments = result.scalars().all()
    
    return [
        {
            "user_id": e.user_id,
            "name": e.student.name,
            "email": e.student.email,
            "enrolled_at": e.enrolled_at
        }
        for e in enrollments
    ]

async def enroll_student_by_email(db: AsyncSession, course_id: int, lecturer_id: int, email: str) -> dict:
    await assert_lecturer_owns_course(db, course_id, lecturer_id)
    
    # Find student by email
    student_res = await db.execute(select(User).where(User.email == email))
    student = student_res.scalar_one_or_none()
    if not student:
        raise NotFoundError("No student found with that email")
        
    if student.role != UserRole.student:
        raise BadRequestError("Target user is not a student")
        
    # Check existing enrollment
    existing_res = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == student.id
        )
    )
    if existing_res.scalar_one_or_none():
        raise ConflictError("Student is already enrolled in this course")
        
    enrollment = Enrollment(
        user_id=student.id,
        course_id=course_id
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    
    return {
        "user_id": student.id,
        "name": student.name,
        "email": student.email,
        "enrolled_at": enrollment.enrolled_at
    }

async def remove_student_from_course(db: AsyncSession, course_id: int, lecturer_id: int, student_id: int) -> None:
    await assert_lecturer_owns_course(db, course_id, lecturer_id)
    
    enroll_res = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == student_id
        )
    )
    enrollment = enroll_res.scalar_one_or_none()
    if not enrollment:
        raise NotFoundError("Enrollment")
        
    await db.delete(enrollment)
    await db.commit()

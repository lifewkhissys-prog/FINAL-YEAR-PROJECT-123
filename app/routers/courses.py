from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, require_lecturer
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse, EnrollRequest, EnrollmentResponse
from app.services import course_service

router = APIRouter()

@router.get("", response_model=list[CourseResponse])
async def list_courses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await course_service.get_courses_for_user(db, current_user)

@router.post("", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CourseCreate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await course_service.create_course(db, current_user.id, body)

@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await course_service.get_course_detail(db, course_id, current_user)

@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    body: CourseUpdate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await course_service.update_course(db, course_id, current_user.id, body)

@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    await course_service.delete_course(db, course_id, current_user.id)
    return None

# Student Management inside Course
@router.get("/{course_id}/students", response_model=list[EnrollmentResponse])
async def list_course_students(
    course_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await course_service.get_enrolled_students(db, course_id, current_user.id)

@router.post("/{course_id}/students", response_model=EnrollmentResponse, status_code=201)
async def enroll_student(
    course_id: int,
    body: EnrollRequest,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await course_service.enroll_student_by_email(db, course_id, current_user.id, body.email)

@router.delete("/{course_id}/students/{student_id}")
async def remove_student(
    course_id: int,
    student_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    await course_service.remove_student_from_course(db, course_id, current_user.id, student_id)
    return {"message": "Student removed from course."}

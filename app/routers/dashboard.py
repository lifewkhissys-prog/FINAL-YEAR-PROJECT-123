from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user, require_lecturer, require_student
from app.models.user import User
from app.services import dashboard_service

router = APIRouter()

@router.get("/lecturer/dashboard")
async def get_lecturer_stats(
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await dashboard_service.get_lecturer_dashboard(db, current_user.id)

@router.get("/student/dashboard")
async def get_student_stats(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    return await dashboard_service.get_student_dashboard(db, current_user.id)

@router.get("/student/submissions")
async def get_student_submissions_list(
    courseId: int | None = Query(None),
    probType: str | None = Query(None),
    status: str | None = Query(None),
    fromDate: str | None = Query(None),
    toDate: str | None = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    from_dt = None
    to_dt = None
    if fromDate:
        try:
            from_dt = datetime.fromisoformat(fromDate)
        except ValueError:
            pass
    if to_date := toDate:
        try:
            to_dt = datetime.fromisoformat(to_date)
        except ValueError:
            pass
            
    return await dashboard_service.get_student_submissions_list(
        db=db,
        student_id=current_user.id,
        course_id=courseId,
        prob_type=probType,
        status=status,
        from_date=from_dt,
        to_date=to_dt,
        page=page,
        page_size=pageSize
    )

@router.get("/student/assessments/{assessment_id}/results")
async def get_assessment_results_student(
    assessment_id: int,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    return await dashboard_service.get_assessment_results_student(db, assessment_id, current_user.id)

@router.get("/lecturer/courses/{course_id}/students/{student_id}/submissions")
async def get_course_student_submissions(
    course_id: int,
    student_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await dashboard_service.get_course_student_submissions(
        db=db,
        course_id=course_id,
        student_id=student_id,
        lecturer_id=current_user.id
    )

@router.get("/lecturer/assessments/{assessment_id}/students/{student_id}/submissions")
async def get_assessment_student_submissions(
    assessment_id: int,
    student_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await dashboard_service.get_assessment_student_submissions(
        db=db,
        assessment_id=assessment_id,
        student_id=student_id,
        lecturer_id=current_user.id
    )

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, require_lecturer
from app.models.user import User
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentResponse
from app.services import assessment_service, dashboard_service

router = APIRouter()

@router.get("", response_model=list[AssessmentResponse])
async def list_assessments(
    courseId: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await assessment_service.get_course_assessments(db, courseId, current_user)

@router.post("", response_model=AssessmentResponse, status_code=201)
async def create_assessment(
    body: AssessmentCreate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await assessment_service.create_assessment(db, current_user.id, body)

@router.get("/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(
    assessment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await assessment_service.get_assessment_detail(db, assessment_id, current_user)

@router.put("/{assessment_id}", response_model=AssessmentResponse)
async def update_assessment(
    assessment_id: int,
    body: AssessmentUpdate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await assessment_service.update_assessment(db, assessment_id, current_user.id, body)

@router.delete("/{assessment_id}", status_code=204)
async def delete_assessment(
    assessment_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    await assessment_service.delete_assessment(db, assessment_id, current_user.id)
    return None

# Gradebook
@router.get("/{assessment_id}/gradebook")
async def get_gradebook(
    assessment_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await dashboard_service.get_assessment_gradebook(db, assessment_id, current_user.id)

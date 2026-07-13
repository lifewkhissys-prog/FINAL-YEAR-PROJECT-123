from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, require_student
from app.models.user import User
from app.schemas.submission import RunRequest, SubmitRequest, SubmissionResultResponse, SubmissionSummary
from app.services import submission_service

router = APIRouter()

@router.post("/run", response_model=SubmissionResultResponse)
async def run_code(
    body: RunRequest,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    return await submission_service.run_submission(
        db=db,
        student=current_user,
        problem_id=body.problem_id,
        code=body.code,
        language=body.language,
        block_id=body.block_id
    )

@router.post("/submit", response_model=SubmissionResultResponse)
async def submit_code(
    body: SubmitRequest,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    return await submission_service.submit_submission(
        db=db,
        student=current_user,
        problem_id=body.problem_id,
        code=body.code,
        language=body.language
    )

@router.get("/{submission_id}", response_model=SubmissionResultResponse)
async def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await submission_service.get_submission_detail(db, submission_id, current_user)

@router.get("", response_model=list[SubmissionSummary])
async def list_submissions(
    problemId: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # This listing can be accessed by both students and lecturers, but get_problem_submissions
    # will check proper enrollment or ownership of the problem's course.
    # Note: submission_service.get_problem_submissions verifies enrollment internally.
    return await submission_service.get_problem_submissions(db, problemId, current_user.id)

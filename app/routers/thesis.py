"""Thesis Assessment API — Rubric, Submissions, Results, Examples."""

from fastapi import APIRouter, Depends, Form, File, UploadFile, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.database import get_db
from app.dependencies import require_lecturer
from app.models.user import User
from app.schemas.thesis_critique import (
    RubricCriterionCreate,
    RubricCriterionUpdate,
    RubricCriterionResponse,
    GradedExampleCreate,
    GradedExampleResponse,
    ThesisSubmissionResponse,
    AssessmentResultResponse,
    SupervisorOverrideRequest,
    NarrativeReportUpdate,
)
from app.services import thesis_service


# ─── Rubric Criteria ────────────────────────────────────────────────────────

rubric_router = APIRouter(prefix="/rubric", tags=["Rubric"])


@rubric_router.post("/criteria", response_model=RubricCriterionResponse, status_code=201)
async def create_criterion(
    body: RubricCriterionCreate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.create_criterion(db, body.model_dump(by_alias=False))


@rubric_router.get("/criteria", response_model=list[RubricCriterionResponse])
async def list_criteria(
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.list_criteria(db)


@rubric_router.patch("/criteria/{criterion_id}", response_model=RubricCriterionResponse)
async def update_criterion(
    criterion_id: int,
    body: RubricCriterionUpdate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump(by_alias=False, exclude_none=True)
    return await thesis_service.update_criterion(db, criterion_id, data)


# ─── Thesis Submissions ────────────────────────────────────────────────────

submissions_router = APIRouter(prefix="/thesis-submissions", tags=["Thesis Submissions"])


@submissions_router.post("", response_model=ThesisSubmissionResponse, status_code=201)
async def upload_submission(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    studentName: str = Form(None),
    title: str = Form(None),
    programme: str = Form(None),
    institution: str = Form(None),
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await file.read()
    return await thesis_service.create_submission(
        db=db,
        lecturer_id=current_user.id,
        student_name=studentName,
        title=title,
        programme=programme,
        institution=institution,
        filename=file.filename,
        file_bytes=file_bytes,
        background_tasks=background_tasks,
    )


@submissions_router.get("", response_model=list[ThesisSubmissionResponse])
async def list_submissions(
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.list_submissions(db, current_user.id)


@submissions_router.get("/{submission_id}", response_model=ThesisSubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.get_submission(db, submission_id, current_user.id)


@submissions_router.delete("/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    await thesis_service.delete_submission(db, submission_id, current_user.id)
    return None


@submissions_router.post("/{submission_id}/assess", response_model=ThesisSubmissionResponse)
async def trigger_assessment(
    submission_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.trigger_assessment(db, submission_id, current_user.id, background_tasks)


@submissions_router.get("/{submission_id}/results")
async def get_results(
    submission_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.get_results(db, submission_id, current_user.id)


@submissions_router.patch("/{submission_id}/results/{criterion_id}")
async def override_result(
    submission_id: int,
    criterion_id: int,
    body: SupervisorOverrideRequest,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.override_result(
        db, submission_id, criterion_id, current_user.id,
        body.supervisor_override_score,
        body.supervisor_notes,
    )


@submissions_router.get("/{submission_id}/report")
async def get_report(
    submission_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.get_report(db, submission_id, current_user.id)


@submissions_router.patch("/{submission_id}/report")
async def update_report(
    submission_id: int,
    body: NarrativeReportUpdate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.update_report(
        db, submission_id, current_user.id, body.narrative_report_edited
    )


@submissions_router.get("/{submission_id}/export")
async def export_submission(
    submission_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    docx_bytes, title = await thesis_service.export_submission_docx(db, submission_id, current_user.id)
    safe = "".join(c for c in title if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={safe or 'report'}_assessment.docx"},
    )


# ─── Graded Examples ────────────────────────────────────────────────────────

examples_router = APIRouter(prefix="/graded-examples", tags=["Graded Examples"])


@examples_router.post("", response_model=GradedExampleResponse, status_code=201)
async def create_example(
    body: GradedExampleCreate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.create_example(db, body.model_dump(by_alias=False))


@examples_router.get("", response_model=list[GradedExampleResponse])
async def list_examples(
    criterion_id: int = Query(None),
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
):
    return await thesis_service.list_examples(db, criterion_id)

from fastapi import APIRouter, Depends, Form, File, UploadFile, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import require_lecturer
from app.models.user import User
from app.schemas.thesis_critique import ThesisCritiqueResponse
from app.services import thesis_service

router = APIRouter()

@router.post("", response_model=ThesisCritiqueResponse, status_code=201)
async def upload_thesis(
    background_tasks: BackgroundTasks,
    candidateName: str = Form(None),
    programme: str = Form(None),
    thesisTitle: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    file_bytes = await file.read()
    return await thesis_service.create_thesis_critique(
        db=db,
        lecturer_id=current_user.id,
        candidate_name=candidateName,
        programme=programme,
        thesis_title=thesisTitle,
        filename=file.filename,
        file_bytes=file_bytes,
        background_tasks=background_tasks
    )

@router.get("", response_model=list[ThesisCritiqueResponse])
async def list_theses(
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await thesis_service.get_thesis_critiques_list(db, current_user.id)

@router.get("/{critique_id}", response_model=ThesisCritiqueResponse)
async def get_thesis_critique(
    critique_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await thesis_service.get_thesis_critique_detail(db, critique_id, current_user.id)

@router.delete("/{critique_id}", status_code=204)
async def delete_thesis_critique(
    critique_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    await thesis_service.delete_thesis_critique(db, critique_id, current_user.id)
    return None

from fastapi.responses import StreamingResponse
import io

@router.get("/{critique_id}/export")
async def export_thesis_critique(
    critique_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    docx_bytes, title = await thesis_service.export_thesis_critique_docx(
        db, critique_id, current_user.id
    )
    
    safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    if not safe_title:
        safe_title = "thesis_critique"
        
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename={safe_title}_critique.docx"
        }
    )


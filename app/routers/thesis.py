import os
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from fastapi.responses import StreamingResponse, Response, RedirectResponse


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, Field

from app.config import settings
from app.database import get_db
from app.dependencies import require_lecturer
from app.models.user import User
from app.models.thesis_critique import (
    ThesisSubmission,
    RubricCriterion,
    RubricSubCriterion,
    ChapterSubCriteriaMap,
    AssessmentResult,
    PlagiarismCheck,
    GradedExample
)
from app.services.thesis_parser import parse_thesis_document, chunk_thesis_by_chapters, extract_document_structure
from app.services.agent_pipeline import execute_thesis_assessment_pipeline
from app.services.embeddings import generate_embedding
from app.services.grading_scale import grade_for
from app.services.plagiarism_service import PROVIDER_DESCRIPTION, ACADEMIC_CORPUS
from app.services.docx_exporter import generate_thesis_docx_report

router = APIRouter(prefix="/api", tags=["Thesis Assessment"])


def check_submission_access(sub: ThesisSubmission, user: User):
    if sub.lecturer_id is not None and sub.lecturer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access or modify this thesis submission."
        )



# Pydantic Schemas
class SubCriterionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_marks: Optional[float] = None
    level_low_desc: Optional[str] = None
    level_mid_desc: Optional[str] = None
    level_high_desc: Optional[str] = None


class OverrideScoreRequest(BaseModel):
    supervisor_override_score: float
    supervisor_notes: Optional[str] = None


class NarrativeReportUpdate(BaseModel):
    narrative_report_edited: str
    supervisor_recommendation: Optional[str] = None


class GradedExampleCreate(BaseModel):
    sub_criterion_id: int
    excerpt: str
    assigned_score: float
    justification: Optional[str] = None


# Endpoints

@router.get("/rubric/criteria")
async def get_rubric_criteria(
    degree_level: str = "mphil",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """List rubric criteria with nested sub-criteria."""
    stmt = (
        select(RubricCriterion)
        .where(
            RubricCriterion.degree_level == degree_level,
            RubricCriterion.deprecated_at.is_(None)
        )
    )
    criteria = (await db.execute(stmt)).scalars().all()

    output = []
    for c in criteria:
        sub_stmt = select(RubricSubCriterion).where(
            RubricSubCriterion.criterion_id == c.id,
            RubricSubCriterion.deprecated_at.is_(None)
        )
        sub_crits = (await db.execute(sub_stmt)).scalars().all()
        output.append({
            "id": c.id,
            "degree_level": c.degree_level,
            "name": c.name,
            "description": c.description,
            "max_marks": c.max_marks,
            "source": c.source,
            "sub_criteria": [
                {
                    "id": sc.id,
                    "name": sc.name,
                    "description": sc.description,
                    "max_marks": sc.max_marks,
                    "level_low_desc": sc.level_low_desc,
                    "level_mid_desc": sc.level_mid_desc,
                    "level_high_desc": sc.level_high_desc
                }
                for sc in sub_crits
            ]
        })
    return output


@router.patch("/rubric/sub-criteria/{id}")
async def update_sub_criterion(
    id: int,
    payload: SubCriterionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Supervisor edits a sub-criterion description or max marks."""
    stmt = select(RubricSubCriterion).where(RubricSubCriterion.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-criterion not found")

    if payload.name is not None:
        sub.name = payload.name
    if payload.description is not None:
        sub.description = payload.description
    if payload.max_marks is not None:
        sub.max_marks = payload.max_marks
    if payload.level_low_desc is not None:
        sub.level_low_desc = payload.level_low_desc
    if payload.level_mid_desc is not None:
        sub.level_mid_desc = payload.level_mid_desc
    if payload.level_high_desc is not None:
        sub.level_high_desc = payload.level_high_desc

    await db.commit()
    return {"message": "Sub-criterion updated successfully"}


@router.get("/rubric/chapters")
async def get_rubric_chapters(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """List the 8 chapter names and their mapped sub-criteria."""
    stmt = select(ChapterSubCriteriaMap)
    maps = (await db.execute(stmt)).scalars().all()
    chapters: Dict[str, List[int]] = {}
    for m in maps:
        chapters.setdefault(m.chapter_name, []).append(m.sub_criterion_id)
    return chapters


@router.get("/submissions")
async def list_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """List thesis submissions for the Supervisor Dashboard."""
    stmt = select(ThesisSubmission).order_by(ThesisSubmission.submitted_at.desc())
    submissions = (await db.execute(stmt)).scalars().all()

    # Filter submissions owned by current lecturer or unassigned legacy submissions
    submissions = [
        s for s in submissions
        if s.lecturer_id is None or s.lecturer_id == current_user.id
    ]

    # One query for every sub-criterion, rather than one per result row.
    sub_crit_marks = {
        sc_id: max_marks
        for sc_id, max_marks in (await db.execute(
            select(RubricSubCriterion.id, RubricSubCriterion.max_marks)
        )).all()
    }

    out = []
    for s in submissions:
        res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == s.id)
        results = (await db.execute(res_stmt)).scalars().all()

        total_score = 0.0
        max_possible = 0.0
        unscored = 0
        for r in results:
            max_marks = sub_crit_marks.get(r.sub_criterion_id)
            if max_marks is None:
                continue
            max_possible += max_marks
            score_val = r.supervisor_override_score if r.supervisor_override_score is not None else r.ai_score
            if score_val is None:
                unscored += 1
            else:
                total_score += score_val

        percentage = round((total_score / max_possible * 100), 1) if max_possible > 0 else None
        band = grade_for(percentage)

        out.append({
            "id": s.id,
            "student_name": s.student_name,
            "title": s.title,
            "programme": s.programme,
            "institution": s.institution,
            "degree_level": s.degree_level,
            "status": s.status,
            "submitted_at": s.submitted_at,
            "preliminary_check_passed": s.preliminary_check_passed,
            "plagiarism_score": s.plagiarism_score,
            "total_score": round(total_score, 1),
            "max_possible": round(max_possible, 1),
            "percentage": percentage,
            "grade": band["grade"],
            "grade_interpretation": band["interpretation"],
            "is_referred": band["is_referred"],
            "unscored_criteria": unscored,
            "error_detail": s.error_detail,
            "pipeline_step": s.pipeline_step,
            "pipeline_progress": s.pipeline_progress,
            "supervisor_recommendation": s.supervisor_recommendation or band.get("recommendation")
        })
    return out


@router.delete("/submissions/{id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/thesis-submissions/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_submission(

    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Delete a thesis submission and all associated assessment records."""
    res = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thesis submission with ID {id} not found."
        )

    check_submission_access(sub, current_user)

    if sub.file_path and os.path.exists(sub.file_path):
        try:
            os.remove(sub.file_path)
        except Exception as e:
            print(f"Warning: Could not remove uploaded file {sub.file_path}: {e}")

    await db.delete(sub)
    await db.commit()
    return None


@router.post("/submissions")

async def create_submission(
    student_name: str = Form(...),
    title: str = Form(...),
    degree_level: str = Form("mphil"),
    programme: str = Form("Computer Engineering"),
    institution: str = Form("KNUST"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Upload a thesis document (.docx / .pdf), parse text, and create submission."""
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF (.pdf) and Word (.docx) documents are allowed."
        )

    filename_base = Path(file.filename).name if file.filename else "thesis.docx"
    safe_filename = f"{uuid.uuid4().hex}_{filename_base}"
    os.makedirs("uploads", exist_ok=True)
    file_location = os.path.join("uploads", safe_filename)

    from app.services.storage_service import upload_thesis_file
    max_bytes = settings.THESIS_UPLOAD_MAX_MB * 1024 * 1024
    file_bytes = await file.read()
    if len(file_bytes) > max_bytes:

        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed upload size of {settings.THESIS_UPLOAD_MAX_MB}MB."
        )

    file_location, cloudinary_url = upload_thesis_file(file_bytes, filename_base)

    full_text = parse_thesis_document(file_location)
    if not full_text or len(full_text.strip()) == 0:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to extract text content from the uploaded file. Please ensure the PDF or DOCX file contains readable text."
        )

    sub = ThesisSubmission(
        lecturer_id=current_user.id,
        student_name=student_name,
        title=title,
        degree_level=degree_level,
        programme=programme,
        institution=institution,
        file_path=file_location,
        cloudinary_url=cloudinary_url,
        full_text=full_text,
        status="pending"
    )


    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    return {"id": sub.id, "message": "Thesis uploaded successfully", "status": sub.status}


@router.post("/submissions/{id}/assess")
async def trigger_assessment(
    id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Trigger the multi-agent thesis assessment pipeline in background."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    check_submission_access(sub, current_user)

    sub.status = "assessing"
    await db.commit()

    # Launch background pipeline execution
    background_tasks.add_task(execute_thesis_assessment_pipeline, id)
    return {"message": "Assessment pipeline triggered successfully", "submission_id": id}


@router.get("/submissions/{id}/preliminary-check")
async def get_preliminary_check(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)
    return {
        "status": sub.status,
        "pipeline_step": sub.pipeline_step or ("completed" if sub.status in ["completed", "reviewed"] else "preliminary_check"),
        "pipeline_progress": sub.pipeline_progress if sub.pipeline_progress is not None else (100 if sub.status in ["completed", "reviewed"] else 15),
        "ready_for_evaluation": sub.preliminary_check_passed,
        "notes": sub.preliminary_check_notes,
        "findings": sub.compliance_findings or [],
        "structure_option": sub.structure_option,
        "error_detail": sub.error_detail,
    }


@router.get("/submissions/{id}/flow-analysis")
async def get_flow_analysis(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)
    return {
        "status": sub.status,
        "flow_analysis_table": sub.flow_analysis_table
    }


@router.get("/submissions/{id}/plagiarism")
async def get_plagiarism_report(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    checks_stmt = select(PlagiarismCheck).where(PlagiarismCheck.submission_id == id)
    checks = (await db.execute(checks_stmt)).scalars().all()

    return {
        "status": sub.status,
        "overall_plagiarism_score": sub.plagiarism_score,
        "provider_description": PROVIDER_DESCRIPTION.format(count=len(ACADEMIC_CORPUS)),
        "section_checks": [
            {
                "section_name": c.section_name,
                "similarity_percentage": c.similarity_percentage,
                "matched_sources": c.matched_sources,
                "provider": c.provider
            }
            for c in checks
        ]
    }


@router.get("/submissions/{id}/results")
async def get_assessment_results(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """List sub-criteria results with dual-scores, citations, and verifier status."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == id)
    results = (await db.execute(res_stmt)).scalars().all()

    out = []
    total_score = 0.0
    max_possible = 0.0
    unscored = 0
    for r in results:
        sub_c = (await db.execute(select(RubricSubCriterion).where(RubricSubCriterion.id == r.sub_criterion_id))).scalars().first()
        criterion = None
        if sub_c:
            criterion = (await db.execute(select(RubricCriterion).where(RubricCriterion.id == sub_c.criterion_id))).scalars().first()

        chap_stmt = select(ChapterSubCriteriaMap).where(
            ChapterSubCriteriaMap.sub_criterion_id == r.sub_criterion_id,
            ChapterSubCriteriaMap.is_primary == True
        )
        chap_map = (await db.execute(chap_stmt)).scalars().first()
        if not chap_map:
            chap_stmt = select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.sub_criterion_id == r.sub_criterion_id)
            chap_map = (await db.execute(chap_stmt)).scalars().first()

        chapter_name = chap_map.chapter_name if chap_map else "introduction"

        effective = r.supervisor_override_score if r.supervisor_override_score is not None else r.ai_score
        if sub_c:
            max_possible += sub_c.max_marks
            if effective is None:
                unscored += 1
            else:
                total_score += effective

        out.append({
            "id": r.id,
            "sub_criterion_id": r.sub_criterion_id,
            "sub_criterion_name": sub_c.name if sub_c else "",
            "criterion_name": criterion.name if criterion else "",
            "max_marks": sub_c.max_marks if sub_c else 0.0,
            "ai_score": r.ai_score,
            "scoring_failed": bool(r.scoring_failed),
            "error_detail": r.error_detail,
            "ai_score_run_1": r.ai_score_run_1,
            "ai_score_run_2": r.ai_score_run_2,
            "score_consistency_flag": r.score_consistency_flag,
            "supervisor_override_score": r.supervisor_override_score,
            "supervisor_notes": r.supervisor_notes,
            "ai_justification": r.ai_justification,
            "cited_text": r.cited_text,
            "confidence_score": r.confidence_score,
            "verifier_passed": r.verifier_passed,
            "verifier_notes": r.verifier_notes,
            "chapter_name": chapter_name
        })

    percentage = round((total_score / max_possible * 100), 1) if max_possible > 0 else None
    band = grade_for(percentage)

    return {
        "status": sub.status,
        "submission_id": id,
        "student_name": sub.student_name,
        "degree_level": sub.degree_level,
        "total_score": round(total_score, 1),
        "max_possible": round(max_possible, 1),
        "percentage": percentage,
        "grade": band["grade"],
        "grade_interpretation": band["interpretation"],
        "is_referred": band["is_referred"],
        "reassessment_cap": band["reassessment_cap"],
        "unscored_criteria": unscored,
        "error_detail": sub.error_detail,
        "results": out
    }


@router.get("/submissions/{id}/chapter-text/{chapter_key}")
async def get_chapter_text(
    id: int,
    chapter_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Return extracted text for a specific chapter of a thesis submission."""
    res = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission with ID {id} not found."
        )
    check_submission_access(sub, current_user)
    if chapter_key in ("all", "full", "full_thesis"):
        return {
            "submission_id": id,
            "chapter_key": chapter_key,
            "text": sub.full_text
        }
    chunks = chunk_thesis_by_chapters(sub.full_text)
    return {
        "submission_id": id,
        "chapter_key": chapter_key,
        "text": chunks.get(chapter_key, "")
    }


@router.get("/submissions/{id}/figures")
async def get_submission_figures(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Return list of extracted figures and Vision AI metadata for a thesis submission."""
    res = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    doc_struct = extract_document_structure(sub.full_text, sub.file_path)
    return {"submission_id": id, "figures": doc_struct.get("figures", [])}


@router.get("/submissions/{id}/figures/{img_index}/image")
async def get_figure_image(
    id: int,
    img_index: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Serve raw image bytes for an extracted thesis figure."""
    res = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == id))
    sub = res.scalar_one_or_none()
    if not sub or not sub.file_path or not os.path.exists(sub.file_path):
        raise HTTPException(status_code=404, detail="Submission or file not found")
    check_submission_access(sub, current_user)

    if not sub.file_path.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Image extraction only supported for PDF submissions")

    try:
        import fitz
        doc = fitz.open(sub.file_path)
        extracted_count = 0
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images()
            for img_info in image_list:
                xref = img_info[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image.get("image")
                if image_bytes and len(image_bytes) > 5000:
                    if extracted_count == img_index:
                        ext = base_image.get("ext", "png")
                        mime_type = f"image/{ext}"
                        return Response(content=image_bytes, media_type=mime_type)
                    extracted_count += 1
    except Exception as e:
        print(f"Error serving figure image: {e}")

    raise HTTPException(status_code=404, detail=f"Figure image index {img_index} not found")


@router.get("/submissions/{id}/document")
async def serve_submission_document(
    id: int,
    token: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Serve the original uploaded PDF/DOCX file for in-browser viewing.
    Accepts optional ?token= query parameter for iframe-based authentication.
    """
    res = await db.execute(select(ThesisSubmission).where(ThesisSubmission.id == id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    if sub.file_path and os.path.exists(sub.file_path):
        ext = Path(sub.file_path).suffix.lower()
        media_type = "application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{sub.student_name}_{sub.title[:30]}{ext}".replace(" ", "_")

        def file_stream():
            with open(sub.file_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        return StreamingResponse(
            file_stream(),
            media_type=media_type,
            headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
        )

    # Cloudinary fallback: if local file is missing due to container restart, fetch stream from Cloudinary to bypass browser 401 restrictions
    target_cloudinary_url = sub.cloudinary_url or (sub.file_path if sub.file_path and sub.file_path.startswith("http") else None)
    if target_cloudinary_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(target_cloudinary_url, follow_redirects=True)
                if resp.status_code == 200:
                    ext = ".pdf" if "pdf" in target_cloudinary_url.lower() else ".docx"
                    media_type = "application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    filename = f"{sub.student_name}_{sub.title[:30]}{ext}".replace(" ", "_")
                    return Response(
                        content=resp.content,
                        media_type=media_type,
                        headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
                    )
        except Exception as e:
            print(f"Cloudinary fetch warning: {e}")
        return RedirectResponse(url=target_cloudinary_url)

    raise HTTPException(status_code=404, detail="Original document file not available on local server or Cloudinary storage.")






@router.get("/submissions/{id}/results/by-chapter/{chapter_name}")
async def get_results_by_chapter(
    id: int,
    chapter_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Fetch sub-criteria evaluation results mapped to a specific chapter."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    map_stmt = select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.chapter_name == chapter_name)
    ch_maps = (await db.execute(map_stmt)).scalars().all()
    mapped_sub_ids = [m.sub_criterion_id for m in ch_maps]

    res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == id)
    results = (await db.execute(res_stmt)).scalars().all()

    out = []
    for r in results:
        sub_c = (await db.execute(select(RubricSubCriterion).where(RubricSubCriterion.id == r.sub_criterion_id))).scalars().first()
        if not sub_c:
            continue
        criterion = (await db.execute(select(RubricCriterion).where(RubricCriterion.id == sub_c.criterion_id))).scalars().first()
        if not criterion:
            continue

        is_mapped = r.sub_criterion_id in mapped_sub_ids
        if chapter_name in ("all", "full", "full_thesis"):
            is_mapped = True
        elif not is_mapped:
            # Strict fallback: only match by chapter number prefix at start of criterion name
            crit_title = (criterion.name or "").strip().lower()
            if chapter_name == "introduction" and crit_title.startswith("1."):
                is_mapped = True
            elif chapter_name == "literature_review" and crit_title.startswith("2."):
                is_mapped = True
            elif chapter_name == "methodology" and crit_title.startswith("3."):
                is_mapped = True
            elif chapter_name in ["data_analysis", "results"] and crit_title.startswith("4."):
                is_mapped = True
            elif chapter_name == "discussion" and crit_title.startswith("5."):
                is_mapped = True
            elif chapter_name == "conclusion" and crit_title.startswith("6."):
                is_mapped = True
            elif chapter_name == "references" and crit_title.startswith("7."):
                is_mapped = True


        if is_mapped:
            out.append({
                "id": r.id,
                "sub_criterion_id": r.sub_criterion_id,
                "sub_criterion_name": sub_c.name,
                "criterion_name": criterion.name,
                "max_marks": sub_c.max_marks,
                "level_low_desc": sub_c.level_low_desc,
                "level_mid_desc": sub_c.level_mid_desc,
                "level_high_desc": sub_c.level_high_desc,
                "ai_score": r.ai_score,
                "scoring_failed": bool(r.scoring_failed),
                "error_detail": r.error_detail,
                "ai_score_run_1": r.ai_score_run_1,
                "ai_score_run_2": r.ai_score_run_2,
                "score_consistency_flag": r.score_consistency_flag,
                "supervisor_override_score": r.supervisor_override_score,
                "supervisor_notes": r.supervisor_notes,
                "ai_justification": r.ai_justification,
                "cited_text": r.cited_text,
                "confidence_score": r.confidence_score,
                "verifier_passed": r.verifier_passed,
                "verifier_notes": r.verifier_notes
            })

    return out


@router.patch("/submissions/{id}/results/{sub_criterion_id}")
async def override_sub_criterion_score(
    id: int,
    sub_criterion_id: int,
    payload: OverrideScoreRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Supervisor overrides the AI score for a specific sub-criterion."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    res_stmt = select(AssessmentResult).where(
        AssessmentResult.submission_id == id,
        AssessmentResult.sub_criterion_id == sub_criterion_id
    )
    result_rec = (await db.execute(res_stmt)).scalars().first()
    if not result_rec:
        raise HTTPException(status_code=404, detail="Assessment result not found")

    result_rec.supervisor_override_score = payload.supervisor_override_score
    if payload.supervisor_notes is not None:
        result_rec.supervisor_notes = payload.supervisor_notes

    await db.commit()
    return {"message": "Score override updated successfully", "sub_criterion_id": sub_criterion_id}


@router.get("/submissions/{id}/report")
async def get_narrative_report(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Fetch synthesized narrative report."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    report_text = sub.narrative_report_edited or sub.narrative_report
    rec = sub.supervisor_recommendation
    if not rec:
        scored = [r for r in sub.assessment_results if r.ai_score is not None]
        total_obtained = sum(r.ai_score for r in scored) if scored else 0
        total_max = sum(r.sub_criterion.max_marks for r in scored if r.sub_criterion) if scored else 0
        pct = (total_obtained / total_max * 100.0) if total_max > 0 else None
        band = grade_for(pct)
        rec = band.get("recommendation")

    return {
        "status": sub.status,
        "narrative_report": report_text,
        "supervisor_recommendation": rec
    }


@router.patch("/submissions/{id}/report")
async def update_narrative_report(
    id: int,
    payload: NarrativeReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Supervisor edits narrative report and saves final recommendation (Pass/Revise/Fail)."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    sub.narrative_report_edited = payload.narrative_report_edited
    if payload.supervisor_recommendation:
        sub.supervisor_recommendation = payload.supervisor_recommendation

    await db.commit()
    return {"message": "Narrative report updated successfully"}


@router.get("/submissions/{id}/export")
async def export_submission_report_docx(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Generates and downloads a Word (.docx) thesis assessment report."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    check_submission_access(sub, current_user)

    res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == id)
    results_recs = (await db.execute(res_stmt)).scalars().all()

    results_data = []
    total_score = 0.0
    max_possible = 0.0
    rubric_source = None
    for r in results_recs:
        sub_c = (await db.execute(select(RubricSubCriterion).where(RubricSubCriterion.id == r.sub_criterion_id))).scalars().first()
        criterion = None
        if sub_c:
            criterion = (await db.execute(select(RubricCriterion).where(RubricCriterion.id == sub_c.criterion_id))).scalars().first()
        if criterion and rubric_source is None:
            rubric_source = criterion.source

        effective = r.supervisor_override_score if r.supervisor_override_score is not None else r.ai_score
        if sub_c and effective is not None:
            total_score += effective
            max_possible += sub_c.max_marks

        results_data.append({
            "criterion_name": criterion.name if criterion else "",
            "sub_criterion_name": sub_c.name if sub_c else "",
            "max_marks": sub_c.max_marks if sub_c else 0.0,
            "ai_score": r.ai_score,
            "supervisor_override_score": r.supervisor_override_score,
            "effective_score": effective,
            "scoring_failed": bool(r.scoring_failed),
            "cited_text": r.cited_text
        })

    percentage = round((total_score / max_possible * 100), 1) if max_possible > 0 else None
    summary = {
        "total_score": round(total_score, 1),
        "max_possible": round(max_possible, 1),
        "percentage": percentage,
        **grade_for(percentage),
        "unscored_criteria": sum(1 for d in results_data if d["effective_score"] is None),
        "rubric_source": rubric_source,
    }

    narrative_text = sub.narrative_report_edited or sub.narrative_report or "No report generated yet."

    docx_stream = generate_thesis_docx_report(sub, results_data, summary, narrative_text)
    clean_title = (sub.title or "thesis_report").replace(" ", "_")

    return StreamingResponse(
        docx_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={clean_title}_assessment_report.docx"}
    )


@router.post("/graded-examples")
async def create_graded_example(
    payload: GradedExampleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_lecturer)
):
    """Create human-graded exemplar excerpt for few-shot scorer retrieval."""
    ex_vec = generate_embedding(payload.excerpt)

    ex = GradedExample(
        sub_criterion_id=payload.sub_criterion_id,
        excerpt=payload.excerpt,
        assigned_score=payload.assigned_score,
        justification=payload.justification,
        embedding=ex_vec
    )
    db.add(ex)
    await db.commit()
    return {"message": "Graded example created successfully"}


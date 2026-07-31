import os
import shutil
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.thesis_critique import (
    ThesisSubmission,
    RubricCriterion,
    RubricSubCriterion,
    ChapterSubCriteriaMap,
    AssessmentResult,
    PlagiarismCheck,
    GradedExample
)
from app.services.thesis_parser import parse_thesis_document
from app.services.agent_pipeline import execute_thesis_assessment_pipeline
from app.services.embeddings import generate_embedding
from app.services.docx_exporter import generate_thesis_docx_report

router = APIRouter(prefix="/api", tags=["Thesis Assessment"])


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
async def get_rubric_criteria(degree_level: str = "mphil", db: AsyncSession = Depends(get_db)):
    """List rubric criteria with nested sub-criteria."""
    stmt = (
        select(RubricCriterion)
        .where(RubricCriterion.degree_level == degree_level)
    )
    criteria = (await db.execute(stmt)).scalars().all()

    output = []
    for c in criteria:
        sub_stmt = select(RubricSubCriterion).where(RubricSubCriterion.criterion_id == c.id)
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
async def update_sub_criterion(id: int, payload: SubCriterionUpdate, db: AsyncSession = Depends(get_db)):
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
async def get_rubric_chapters(db: AsyncSession = Depends(get_db)):
    """List the 8 chapter names and their mapped sub-criteria."""
    stmt = select(ChapterSubCriteriaMap)
    maps = (await db.execute(stmt)).scalars().all()
    chapters: Dict[str, List[int]] = {}
    for m in maps:
        chapters.setdefault(m.chapter_name, []).append(m.sub_criterion_id)
    return chapters


@router.get("/submissions")
async def list_submissions(db: AsyncSession = Depends(get_db)):
    """List thesis submissions for the Supervisor Dashboard."""
    stmt = select(ThesisSubmission).order_by(ThesisSubmission.submitted_at.desc())
    submissions = (await db.execute(stmt)).scalars().all()
    out = []
    for s in submissions:
        # Compute aggregate score
        res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == s.id)
        results = (await db.execute(res_stmt)).scalars().all()

        total_score = 0.0
        max_possible = 0.0
        for r in results:
            sub_c = (await db.execute(select(RubricSubCriterion).where(RubricSubCriterion.id == r.sub_criterion_id))).scalars().first()
            if sub_c:
                score_val = r.supervisor_override_score if r.supervisor_override_score is not None else r.ai_score
                total_score += score_val
                max_possible += sub_c.max_marks

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
            "percentage": round((total_score / max_possible * 100), 1) if max_possible > 0 else 0.0,
            "supervisor_recommendation": s.supervisor_recommendation
        })
    return out


@router.post("/submissions")
async def create_submission(
    student_name: str = Form(...),
    title: str = Form(...),
    degree_level: str = Form("mphil"),
    programme: str = Form("Computer Engineering"),
    institution: str = Form("KNUST"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a thesis document (.docx / .pdf), parse text, and create submission."""
    os.makedirs("uploads", exist_ok=True)
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    full_text = parse_thesis_document(file_location)
    if not full_text:
        full_text = f"Sample Thesis Content for {title} submitted by {student_name}."

    sub = ThesisSubmission(
        student_name=student_name,
        title=title,
        degree_level=degree_level,
        programme=programme,
        institution=institution,
        file_path=file_location,
        full_text=full_text,
        status="pending"
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    return {"id": sub.id, "message": "Thesis uploaded successfully", "status": sub.status}


@router.post("/submissions/{id}/assess")
async def trigger_assessment(id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Trigger the multi-agent thesis assessment pipeline in background."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    sub.status = "assessing"
    await db.commit()

    # Launch background pipeline execution
    background_tasks.add_task(execute_thesis_assessment_pipeline, id)
    return {"message": "Assessment pipeline triggered successfully", "submission_id": id}


@router.get("/submissions/{id}/preliminary-check")
async def get_preliminary_check(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "status": sub.status,
        "pipeline_step": sub.pipeline_step or ("completed" if sub.status in ["completed", "reviewed"] else "preliminary_check"),
        "pipeline_progress": sub.pipeline_progress if sub.pipeline_progress is not None else (100 if sub.status in ["completed", "reviewed"] else 15),
        "ready_for_evaluation": sub.preliminary_check_passed,
        "notes": sub.preliminary_check_notes
    }


@router.get("/submissions/{id}/flow-analysis")
async def get_flow_analysis(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "status": sub.status,
        "flow_analysis_table": sub.flow_analysis_table
    }


@router.get("/submissions/{id}/plagiarism")
async def get_plagiarism_report(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    checks_stmt = select(PlagiarismCheck).where(PlagiarismCheck.submission_id == id)
    checks = (await db.execute(checks_stmt)).scalars().all()

    return {
        "status": sub.status,
        "overall_plagiarism_score": sub.plagiarism_score,
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
async def get_assessment_results(id: int, db: AsyncSession = Depends(get_db)):
    """List sub-criteria results with dual-scores, citations, and verifier status."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == id)
    results = (await db.execute(res_stmt)).scalars().all()

    out = []
    for r in results:
        sub_c = (await db.execute(select(RubricSubCriterion).where(RubricSubCriterion.id == r.sub_criterion_id))).scalars().first()
        criterion = None
        if sub_c:
            criterion = (await db.execute(select(RubricCriterion).where(RubricCriterion.id == sub_c.criterion_id))).scalars().first()

        # Retrieve chapter mapping
        chap_stmt = select(ChapterSubCriteriaMap).where(
            ChapterSubCriteriaMap.sub_criterion_id == r.sub_criterion_id,
            ChapterSubCriteriaMap.is_primary == True
        )
        chap_map = (await db.execute(chap_stmt)).scalars().first()
        if not chap_map:
            chap_stmt = select(ChapterSubCriteriaMap).where(ChapterSubCriteriaMap.sub_criterion_id == r.sub_criterion_id)
            chap_map = (await db.execute(chap_stmt)).scalars().first()
        
        chapter_name = chap_map.chapter_name if chap_map else "introduction"

        out.append({
            "id": r.id,
            "sub_criterion_id": r.sub_criterion_id,
            "sub_criterion_name": sub_c.name if sub_c else "",
            "criterion_name": criterion.name if criterion else "",
            "max_marks": sub_c.max_marks if sub_c else 0.0,
            "ai_score": r.ai_score,
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

    return {
        "status": sub.status,
        "submission_id": id,
        "student_name": sub.student_name,
        "degree_level": sub.degree_level,
        "results": out
    }



@router.get("/submissions/{id}/results/by-chapter/{chapter_name}")
async def get_results_by_chapter(id: int, chapter_name: str, db: AsyncSession = Depends(get_db)):
    """Fetch sub-criteria evaluation results mapped to a specific chapter."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

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
        if not is_mapped:
            crit_title = (criterion.name or "").lower()
            if chapter_name == "introduction" and ("1." in crit_title or "problem" in crit_title):
                is_mapped = True
            elif chapter_name == "literature_review" and ("2." in crit_title or "literature" in crit_title or "survey" in crit_title):
                is_mapped = True
            elif chapter_name == "methodology" and ("3." in crit_title or "method" in crit_title or "design" in crit_title):
                is_mapped = True
            elif chapter_name in ["data_analysis", "results"] and ("4." in crit_title or "analysis" in crit_title or "results" in crit_title or "testing" in crit_title):
                is_mapped = True
            elif chapter_name == "discussion" and ("5." in crit_title or "finding" in crit_title or "discussion" in crit_title):
                is_mapped = True
            elif chapter_name == "conclusion" and ("6." in crit_title or "conclusion" in crit_title):
                is_mapped = True
            elif chapter_name == "references" and ("7." in crit_title or "presentation" in crit_title):
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
    db: AsyncSession = Depends(get_db)
):
    """Supervisor overrides the AI score for a specific sub-criterion."""
    stmt = select(AssessmentResult).where(
        AssessmentResult.submission_id == id,
        AssessmentResult.sub_criterion_id == sub_criterion_id
    )
    result_rec = (await db.execute(stmt)).scalars().first()
    if not result_rec:
        raise HTTPException(status_code=404, detail="Assessment result not found")

    result_rec.supervisor_override_score = payload.supervisor_override_score
    if payload.supervisor_notes is not None:
        result_rec.supervisor_notes = payload.supervisor_notes

    await db.commit()
    return {"message": "Score override updated successfully", "sub_criterion_id": sub_criterion_id}


@router.get("/submissions/{id}/report")
async def get_narrative_report(id: int, db: AsyncSession = Depends(get_db)):
    """Fetch synthesized narrative report."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    report_text = sub.narrative_report_edited or sub.narrative_report
    return {
        "status": sub.status,
        "narrative_report": report_text,
        "supervisor_recommendation": sub.supervisor_recommendation
    }


@router.patch("/submissions/{id}/report")
async def update_narrative_report(id: int, payload: NarrativeReportUpdate, db: AsyncSession = Depends(get_db)):
    """Supervisor edits narrative report and saves final recommendation (Pass/Revise/Fail)."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    sub.narrative_report_edited = payload.narrative_report_edited
    if payload.supervisor_recommendation:
        sub.supervisor_recommendation = payload.supervisor_recommendation

    await db.commit()
    return {"message": "Narrative report updated successfully"}


@router.get("/submissions/{id}/export")
async def export_submission_report_docx(id: int, db: AsyncSession = Depends(get_db)):
    """Generates and downloads a Word (.docx) thesis assessment report."""
    stmt = select(ThesisSubmission).where(ThesisSubmission.id == id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == id)
    results_recs = (await db.execute(res_stmt)).scalars().all()

    results_data = []
    for r in results_recs:
        sub_c = (await db.execute(select(RubricSubCriterion).where(RubricSubCriterion.id == r.sub_criterion_id))).scalars().first()
        criterion = None
        if sub_c:
            criterion = (await db.execute(select(RubricCriterion).where(RubricCriterion.id == sub_c.criterion_id))).scalars().first()
        results_data.append({
            "criterion_name": criterion.name if criterion else "",
            "sub_criterion_name": sub_c.name if sub_c else "",
            "max_marks": sub_c.max_marks if sub_c else 0.0,
            "ai_score": r.ai_score,
            "supervisor_override_score": r.supervisor_override_score,
            "cited_text": r.cited_text
        })

    narrative_text = sub.narrative_report_edited or sub.narrative_report or "No report generated yet."

    docx_stream = generate_thesis_docx_report(sub, results_data, [], narrative_text)
    clean_title = (sub.title or "thesis_report").replace(" ", "_")

    return StreamingResponse(
        docx_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={clean_title}_assessment_report.docx"}
    )


@router.post("/graded-examples")
async def create_graded_example(payload: GradedExampleCreate, db: AsyncSession = Depends(get_db)):
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

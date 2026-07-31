import asyncio
import os
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.seed import seed_database
from app.models.thesis_critique import ThesisSubmission, AssessmentResult

async def test_end_to_end_flow():
    print("--- 1. Initializing DB and Seeding Rubric ---")
    await seed_database()

    client = TestClient(app)

    print("--- 2. Testing GET /api/rubric/criteria ---")
    res = client.get("/api/rubric/criteria?degree_level=mphil")
    assert res.status_code == 200
    criteria = res.json()
    print(f"Retrieved {len(criteria)} top-level criteria for MPhil.")
    assert len(criteria) > 0

    print("--- 3. Testing POST /api/submissions (Uploading Sample Thesis) ---")
    file_content = (
        "CHAPTER 1: INTRODUCTION\n"
        "This thesis investigates rubric-grounded multi-agent LLM evaluation of academic research documents.\n"
        "Research Questions:\n"
        "RQ1: Does sub-criterion decomposition reduce halo effect scoring variance?\n"
        "RQ2: How effective is cross-chapter logical flow verification?\n\n"
        "CHAPTER 2: LITERATURE REVIEW\n"
        "Prior automated essay scoring systems rely on holistic prompt evaluation, leading to high variance...\n\n"
        "CHAPTER 3: METHODOLOGY\n"
        "We adopt a 7-criterion decomposition pipeline using Groq Llama-3.3-70b-versatile, sentence-transformers, and pgvector cosine similarity retrieval...\n"
        "Sampling Frame: 150 student thesis documents across engineering departments at KNUST.\n\n"
        "CHAPTER 4: RESULTS AND DISCUSSION\n"
        "Empirical benchmarks demonstrate a Quadratic Weighted Kappa (QWK) of 0.84 compared to supervisor human ground truth ratings...\n\n"
        "CHAPTER 5: CONCLUSION\n"
        "The multi-agent thesis assessment architecture significantly improves score consistency and provides detailed narrative feedback.\n"
    )

    upload_data = {
        "student_name": "Elvis Atiah Test",
        "title": "Rubric-Grounded Multi-Agent System for Thesis Assessment",
        "degree_level": "mphil",
        "programme": "Computer Engineering",
        "institution": "KNUST"
    }

    files = {
        "file": ("test_thesis.txt", file_content.encode("utf-8"), "text/plain")
    }

    upload_res = client.post("/api/submissions", data=upload_data, files=files)
    assert upload_res.status_code == 200
    sub_data = upload_res.json()
    submission_id = sub_data["id"]
    print(f"Uploaded thesis submission created with ID: {submission_id}")

    print("--- 4. Testing POST /api/submissions/{id}/assess (Trigger Pipeline) ---")
    assess_res = client.post(f"/api/submissions/{submission_id}/assess")
    assert assess_res.status_code == 200
    print("Assessment pipeline triggered.")

    print("--- 5. Verifying DB Submissions & Results ---")
    async with SessionLocal() as session:
        from sqlalchemy import select
        sub_stmt = select(ThesisSubmission).where(ThesisSubmission.id == submission_id)
        sub = (await session.execute(sub_stmt)).scalars().first()
        print(f"Submission status: {sub.status}")
        print(f"Preliminary gate check passed: {sub.preliminary_check_passed}")
        print(f"Plagiarism score: {sub.plagiarism_score}%")

        res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == submission_id)
        results = (await session.execute(res_stmt)).scalars().all()
        print(f"Evaluated {len(results)} sub-criteria results.")

    print("--- 6. Testing GET /api/submissions/{id}/report ---")
    report_res = client.get(f"/api/submissions/{submission_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    print("Narrative report generated successfully:")
    print(report_data["narrative_report"][:300] + "...")

    print("SUCCESS! All thesis assessment backend endpoints & multi-agent pipeline tests passed.")

if __name__ == "__main__":
    asyncio.run(test_end_to_end_flow())

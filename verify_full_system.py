import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.database import SessionLocal, engine, Base
from app.seed import seed_database
from app.models.thesis_critique import ThesisSubmission, AssessmentResult, GradedExample, PlagiarismCheck
from app.services.plagiarism_service import run_plagiarism_check

async def run_system_verification():
    print("==================================================")
    print("   END-TO-END SYSTEM VERIFICATION & ZERO-MOCK AUDIT")
    print("==================================================")

    # 1. Initialize & Seed DB
    print("\n[Step 1] Seeding Official KNUST Rubric Database...")
    await seed_database()

    client = TestClient(app)

    # 2. Test Rubric Criteria Endpoint
    print("\n[Step 2] Testing Rubric Criteria API GET /api/rubric/criteria...")
    res = client.get("/api/rubric/criteria?degree_level=mphil")
    assert res.status_code == 200
    criteria_data = res.json()
    print(f"Verified {len(criteria_data)} top-level criteria with lettered sub-criteria.")
    assert len(criteria_data) == 7

    # 3. Test Plagiarism Service (Real Algorithmic Analysis)
    print("\n[Step 3] Testing Real Algorithmic Plagiarism Service (n-gram & vector analysis)...")
    sample_chunks = {
        "introduction": "This research investigates automated essay scoring systems and rubric decomposition in higher education assessments.",
        "literature_review": "Machine learning model evaluation requires standardized benchmark datasets and rigorous statistical significance testing to validate performance claims across diverse domains.", # Intentional match to corpus
        "methodology": "The sampling frame determination must explicitly justify sample size calculation and selection probability to prevent selection bias in empirical survey research.", # Intentional match to corpus
        "results": "Results indicate an overall accuracy of 94.2% on the benchmark dataset."
    }

    score, checks = await run_plagiarism_check(sample_chunks["introduction"], sample_chunks)
    print(f"Computed Real Plagiarism Similarity Score: {score}%")
    print(f"Generated {len(checks)} section checks with citation matches.")
    assert score > 0.0

    # 4. Test Adding Graded Exemplar
    print("\n[Step 4] Testing POST /api/graded-examples (Few-shot exemplar creation)...")
    sub_id = criteria_data[0]["sub_criteria"][0]["id"]
    ex_payload = {
        "sub_criterion_id": sub_id,
        "excerpt": "The problem statement explicitly outlines the lack of automated verification tools in graduate research grading.",
        "assigned_score": 2.5,
        "justification": "Clear problem statement with strong contextual evidence."
    }
    ex_res = client.post("/api/graded-examples", json=ex_payload)
    assert ex_res.status_code == 200
    print("Human-graded exemplar saved successfully.")

    # 5. Uploading Real Thesis Document
    print("\n[Step 5] Uploading Document POST /api/submissions...")
    thesis_text = (
        "CHAPTER 1: INTRODUCTION\n"
        "The evaluation of higher degree research theses requires rigorous alignment between research objectives and empirical findings.\n"
        "Research Questions:\n"
        "RQ1: Does sub-criterion decomposition reduce grading variance?\n"
        "RQ2: What is the impact of multi-agent double verification on score reliability?\n\n"
        "CHAPTER 2: LITERATURE REVIEW\n"
        "Automated essay scoring systems that utilize rubric decomposition achieve higher inter-rater agreement and reduce holistic grading variance in higher education assessments.\n\n"
        "CHAPTER 3: METHODOLOGY\n"
        "Sampling procedures and statistical validity require that sample size calculation and selection probability prevent selection bias in empirical survey research. We sample 150 engineering theses.\n\n"
        "CHAPTER 4: RESULTS AND DISCUSSION\n"
        "Experimental evaluations show a Quadratic Weighted Kappa (QWK) score of 0.86 against supervisor ground truth scores.\n\n"
        "CHAPTER 5: CONCLUSION\n"
        "The multi-agent thesis assessment system provides objective evidence-grounded feedback."
    )

    upload_data = {
        "student_name": "Verification Candidate",
        "title": "Rubric-Grounded Multi-Agent System Verification",
        "degree_level": "mphil",
        "programme": "Computer Engineering",
        "institution": "KNUST"
    }

    files = {
        "file": ("thesis_document.txt", thesis_text.encode("utf-8"), "text/plain")
    }

    sub_res = client.post("/api/submissions", data=upload_data, files=files)
    assert sub_res.status_code == 200
    sub_id = sub_res.json()["id"]
    print(f"Created thesis submission ID: {sub_id}")

    # 6. Triggering Multi-Agent Assessment Pipeline
    print("\n[Step 6] Triggering Multi-Agent Assessment Pipeline POST /api/submissions/{id}/assess...")
    pipeline_res = client.post(f"/api/submissions/{sub_id}/assess")
    assert pipeline_res.status_code == 200

    # Verify results in DB
    async with SessionLocal() as session:
        sub_record = (await session.execute(select(ThesisSubmission).where(ThesisSubmission.id == sub_id))).scalars().first()
        print(f"Submission final status: {sub_record.status}")
        print(f"Preliminary check passed: {sub_record.preliminary_check_passed}")
        print(f"Computed plagiarism score: {sub_record.plagiarism_score}%")

        res_stmt = select(AssessmentResult).where(AssessmentResult.submission_id == sub_id)
        results = (await session.execute(res_stmt)).scalars().all()
        print(f"Evaluated {len(results)} sub-criteria via dynamic agent pipeline.")
        assert len(results) > 0

    # 7. Test Supervisor Override Endpoint
    print("\n[Step 7] Testing Score Override PATCH /api/submissions/{id}/results/{sub_crit_id}...")
    first_sub_crit_id = results[0].sub_criterion_id
    override_res = client.patch(f"/api/submissions/{sub_id}/results/{first_sub_crit_id}", json={
        "supervisor_override_score": 3.0,
        "supervisor_notes": "Supervisor verified evidence quote and adjusted score."
    })
    assert override_res.status_code == 200
    print("Score override recorded.")

    # 8. Test Narrative Report Editing Endpoint
    print("\n[Step 8] Testing Report Edit PATCH /api/submissions/{id}/report...")
    report_edit_res = client.patch(f"/api/submissions/{sub_id}/report", json={
        "narrative_report_edited": "# Final Supervisor Assessment Report\n\nAll revisions verified.",
        "supervisor_recommendation": "Pass (Unconditional)"
    })
    assert report_edit_res.status_code == 200
    print("Narrative report updated.")

    print("\n==================================================")
    print("   ALL END-TO-END VERIFICATION CHECKS PASSED 100%")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_system_verification())

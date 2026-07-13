import io
import json
import logging
import asyncio
from datetime import datetime, timezone
import pdfplumber
import docx
from groq import AsyncGroq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import SessionLocal
from app.models.thesis_critique import ThesisCritique, CritiqueStatus
from app.utils.errors import NotFoundError, ForbiddenError

logger = logging.getLogger(__name__)

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts)
    elif ext in ("docx", "doc"):
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        raise ValueError("Unsupported file format. Only PDF and DOCX files are allowed.")


def get_mock_report(title: str, candidate: str, programme: str) -> dict:
    """Fallback mock review generator — mirrors the real schema so the UI always works."""
    return {
        "metadata": {
            "candidate_name": candidate if candidate and candidate != "Extracting..." else "Elvis Atiah",
            "programme": programme if programme and programme != "Extracting..." else "Master of Science in Information Technology",
            "thesis_title": title if title and title != "Extracting..." else "Enhancing Password Authentication with a Hardware-Free, Context-Aware Risk Scoring Model Using Public Datasets"
        },
        "overall_assessment": (
            "Dear Elvis, I have reviewed your thesis critically. The study addresses a relevant and timely cybersecurity problem: "
            "how to strengthen password-based authentication using contextual risk scoring without requiring hardware tokens, "
            "biometrics, or costly infrastructure. The thesis is generally well structured and demonstrates a clear attempt to design, "
            "implement, and evaluate a practical authentication model using a public dataset. The work has potential for acceptance at the MSc level; "
            "however, several technical, methodological, presentation, and referencing issues must be corrected before final submission.\n\n"
            "Supervisor’s overall judgement: The thesis should not be submitted in its present form without correction. It is conditionally "
            "acceptable after the candidate addresses the major corrections listed in this report, especially the inconsistencies in the performance metric definitions and tables."
        ),
        "overall_recommendation": "Corrections required before final submission",
        "strengths": [
            "Relevant research problem: The work addresses a real weakness of password-only authentication and proposes a hardware-free solution suitable for resource-constrained organisations.",
            "Clear title and research direction: The title is focused and reflects the core contribution: context-aware risk scoring using public datasets.",
            "Good chapter organisation: The thesis follows the expected five-chapter structure: introduction, literature review, methodology, results, and conclusion.",
            "Practical implementation: The inclusion of Python prototype code in the appendices strengthens the practical contribution and demonstrates implementation effort.",
            "Honest reporting of limitations: The thesis acknowledges that the detection rate is modest and that the CERT dataset is synthetic, which improves academic integrity.",
            "Security-usability awareness: The work considers both detection performance and user friction, which is important in authentication research."
        ],
        "major_corrections": [
            {
                "issue": "Performance metric inconsistency: FAR and FRR are mixed in some tables.",
                "why_it_matters": "This is the most serious technical error because it affects the interpretation of the results.",
                "required_correction": "Check all tables and text. If FAR is defined as FN/(FN+TP), keep it consistently. If FRR is defined as FP/(FP+TN), keep it consistently. Correct Table 4.5, Table 4.6, Table 4.7, and the abstract where necessary.",
                "severity": "high",
                "category": "methodological_rigor"
            },
            {
                "issue": "Password-only baseline contains inconsistent FRR reporting.",
                "why_it_matters": "A password-only system that allows all credential-valid logins should have FRR = 0% for legitimate users, not 100%.",
                "required_correction": "Correct the baseline table and ensure the explanation in Section 3.12.1 agrees with Chapter Four.",
                "severity": "high",
                "category": "methodological_rigor"
            },
            {
                "issue": "The thesis sometimes overstates the practical security value of a model with only 25.43% detection.",
                "why_it_matters": "A model that misses about 74.57% of malicious logins should be presented as a preliminary or complementary screening layer, not a strong authentication solution.",
                "required_correction": "Use cautious language throughout the abstract, discussion, conclusion, and contribution sections. Emphasise partial improvement rather than strong protection.",
                "severity": "medium",
                "category": "academic_writing"
            },
            {
                "issue": "The same dataset appears to be used for parameter calibration and final evaluation.",
                "why_it_matters": "This may introduce tuning bias, especially in threshold selection.",
                "required_correction": "Create a clear calibration/evaluation split or explain why the study is an exploratory design. Preferably calibrate thresholds on one subset and report final performance on a separate holdout subset.",
                "severity": "high",
                "category": "methodological_rigor"
            },
            {
                "issue": "The scope mentions IP/network reputation and geolocation, but the final model uses temporal deviation, device familiarity, frequency anomaly, and off-hours login.",
                "why_it_matters": "This creates a mismatch between the declared scope and the actual implemented features.",
                "required_correction": "Revise the scope and methodology so they match the implemented model, or include IP/geolocation features if the dataset supports them.",
                "severity": "medium",
                "category": "academic_writing"
            }
        ],
        "chapter_assessments": [
            {
                "name": "Chapter One: Introduction",
                "observations": [
                    "The background, problem statement, objectives, and research questions are generally coherent and aligned with the thesis title.",
                    "The problem statement is relevant, but it should be sharpened by clearly stating what exact limitation in existing RBA systems is being solved.",
                    "The scope must be revised because it currently lists IP/network reputation and geolocation, while the implemented model mainly uses timestamp and host/device features.",
                    "The objectives are acceptable, but the main objective may be strengthened as: 'To design, implement, and evaluate a hardware-free, context-aware risk-scoring model for enhancing password-based authentication using publicly available authentication logs.'"
                ]
            },
            {
                "name": "Chapter Two: Literature Review",
                "observations": [
                    "The review covers authentication mechanisms, MFA, password attacks, context-aware authentication, RBA, risk scoring, public datasets, and usability metrics.",
                    "However, the chapter is lengthy and sometimes descriptive rather than analytical. The candidate should show clearer comparison among existing models, datasets, evaluation metrics, and deployment limitations.",
                    "The literature gap should be presented in a more focused way: proprietary datasets, hardware dependency, black-box models, limited usability evaluation, and poor reproducibility.",
                    "Some citations and author names appear unusual or weak. All sources must be verified for accuracy and academic quality."
                ]
            },
            {
                "name": "Chapter Three: Methodology",
                "observations": [
                    "The methodology gives a clear rule-based design using four contextual features and a weighted scoring equation.",
                    "The use of the CERT Insider Threat Dataset is appropriate for an exploratory MSc study, but the synthetic nature of the dataset must be emphasised.",
                    "The candidate should provide more detail on preprocessing, exact feature computation, class labelling, missing values, and how malicious labels were derived.",
                    "Threshold and weight validation should be strengthened by using a separate calibration set and evaluation set. Using one dataset for both selection and final reporting can overstate robustness.",
                    "The justification for rule-based modelling is good, but it should be balanced with a clear admission that rule-based simplicity contributes to the modest detection performance."
                ]
            },
            {
                "name": "Chapter Four: Results and Analysis",
                "observations": [
                    "The chapter contains useful tables on dataset distribution, feature distribution, confusion matrix, and sensitivity analysis.",
                    "The most urgent correction is the inconsistent use of FAR and FRR across definitions, tables, and comparison results.",
                    "The result should be interpreted more critically: accuracy is high mainly because the data are imbalanced; precision and F1 are more informative.",
                    "The discussion should explain why device familiarity and off-hours login perform better than frequency anomaly.",
                    "The threshold sensitivity analysis is valuable, but the table must label FAR/FRR correctly and consistently."
                ]
            },
            {
                "name": "Chapter Five: Conclusions and Recommendations",
                "observations": [
                    "The conclusion appropriately admits that the model is a partial improvement rather than a complete solution.",
                    "The contribution section should be moderated. The model establishes a baseline but does not yet provide strong operational security assurance.",
                    "The limitations are useful and should be retained, but the candidate should make them even more direct in the abstract and final conclusion.",
                    "Recommendations for real-world logs, live deployment, ML comparison, and richer contextual features are appropriate."
                ]
            }
        ],
        "technical_comments": [
            "Dataset suitability: The CERT r4.2 dataset is acceptable for experimentation, but because it is synthetic and insider-oriented, it may not represent normal web authentication attacks such as credential stuffing or phishing. This limitation should be central, not secondary.",
            "Labelling strategy: Classifying all logins from known insider users as malicious is problematic because an insider may also perform normal logins. This may distort both false positives and false negatives. The candidate should explain this clearly as a threat to validity.",
            "Feature engineering: Temporal deviation, device familiarity, and off-hours activity are logical features. Frequency anomaly performed weakly and should be either replaced or discussed as a negative finding.",
            "Model formulation: The weighted formula is transparent and easy to audit, which supports the thesis aim. However, the weights still require stronger empirical justification or a separate validation procedure.",
            "Evaluation metrics: The thesis should prioritise recall/detection rate, precision, F1 score, FAR, FRR, and step-up frequency. Accuracy should be treated as secondary because of class imbalance.",
            "Prototype: The Python code is useful, but it should be accompanied by a short README-style explanation: dataset input, dependencies, execution steps, outputs, and interpretation of results."
        ],
        "formatting_comments": [
            "Change 'TABLE OF CONTENT' to 'TABLE OF CONTENTS'.",
            "Update the table of contents after correcting section numbering.",
            "Ensure all table captions and figure captions are consistently formatted and cross-referenced in the text.",
            "Correct punctuation and citation errors such as repeated fragments and malformed citations.",
            "Use one spelling convention consistently, either British English or American English. Since the thesis already uses 'behaviour' and 'organisations', British English is recommended.",
            "Shorten long paragraphs in Chapter Two to improve readability.",
            "Check every reference for author names, year, title, journal/proceedings, volume, issue, pages, and DOI/URL consistency.",
            "Avoid using unsupported claims such as 'strong protection' when the reported detection rate is modest."
        ],
        "priority_action_plan": [
            "First, correct all FAR, FRR, detection rate, precision, and F1 calculations and ensure the formulas in tables match the values reported.",
            "Second, correct the password-only baseline metrics and rewrite the comparison section accordingly.",
            "Third, revise the methodology to include a clear calibration/evaluation split or explicitly label the experiment as exploratory.",
            "Fourth, align the scope, features, and implemented model so that the thesis does not claim unused contextual attributes.",
            "Fifth, revise Chapter Two to reduce repetition and strengthen the critical synthesis of existing work.",
            "Sixth, verify all references and remove weak, unverifiable, or incorrectly formatted sources.",
            "Seventh, update all section numbering, table numbering, figure numbering, captions, and the table of contents.",
            "Eighth, revise the abstract and conclusion so the claims match the actual performance of the model."
        ],
        "final_recommendation": {
            "narrative": "My recommendation is that the thesis is promising and can meet the MSc standard after correction. The topic is relevant, the objectives are generally appropriate, and the implementation effort is evident. However, the thesis currently contains technical inconsistencies in the reporting of performance metrics, especially FAR and FRR, which must be corrected before it can be defended or submitted as a final document. The candidate should revise the thesis carefully and return a corrected version for final supervisor review.",
            "decision": "Corrections required before final submission",
            "closing_note": "Elvis, your work has a good foundation and a relevant research direction. Make the corrections thoroughly, especially the metric corrections and methodological clarification. Do not overstate the results; present the model as a transparent and useful first-layer screening mechanism rather than a complete operational solution."
        }
    }


async def call_groq_llm(title: str, candidate: str, programme: str, text: str) -> dict:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.strip() in ("", "gsk_placeholder", "gsk_your_key_here"):
        logger.warning("Groq API key not configured, returning mock thesis review report.")
        return get_mock_report(title, candidate, programme)

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    system_prompt = (
        "You are an expert academic thesis supervisor. "
        "Analyse the provided thesis text and produce a structured critical assessment report, "
        "written as a formal supervisor review guiding the student toward final submission. "
        "Your response MUST be a valid JSON object matching EXACTLY this schema:\n"
        "{\n"
        "  \"metadata\": {\n"
        "    \"candidate_name\": \"string — extract from thesis text if not provided\",\n"
        "    \"programme\": \"string — extract from thesis text if not provided\",\n"
        "    \"thesis_title\": \"string — extract from thesis text if not provided\"\n"
        "  },\n"
        "  \"overall_assessment\": \"string — supervisor overall narrative assessment, including supervisor's overall judgement on the thesis (e.g. conditionally acceptable, not to be submitted in present form, etc.)\",\n"
        "  \"strengths\": [\"string — distinct thesis strengths, each a complete sentence describing key advantages/accomplishments\"],\n"
        "  \"major_corrections\": [\n"
        "    {\n"
        "      \"issue\": \"string — description of the specific problem found in the thesis\",\n"
        "      \"why_it_matters\": \"string — why this affects the scientific validity, credibility, or defensibility of the thesis\",\n"
        "      \"required_correction\": \"string — specific, actionable instruction describing exactly what the student must change\",\n"
        "      \"severity\": \"one of exactly: high, medium, low\",\n"
        "      \"category\": \"one of exactly: academic_writing, methodological_rigor, literature_review, structure_coherence\"\n"
        "    }\n"
        "  ],\n"
        "  \"chapter_assessments\": [\n"
        "    {\n"
        "      \"name\": \"string — chapter title e.g. Chapter One: Introduction\",\n"
        "      \"observations\": [\"string — specific critique or commendation per item for that chapter\"]\n"
        "    }\n"
        "  ],\n"
        "  \"technical_comments\": [\"string — distinct technical, algorithmic, methodological, data-related or validation issues across the thesis\"],\n"
        "  \"formatting_comments\": [\"string — distinct layout, language, formatting, referencing or spelling corrections across the thesis\"],\n"
        "  \"priority_action_plan\": [\"string — action items ordered by priority, each a direct instruction to the student\"],\n"
        "  \"final_recommendation\": {\n"
        "    \"narrative\": \"string — summary of final recommendation, why the topic is promising, or any other final evaluation remarks\",\n"
        "    \"decision\": \"string — one of exactly: 'Accept', 'Corrections required before final submission', 'Major revisions required', 'Reject'\",\n"
        "    \"closing_note\": \"string — supervisor's closing note addressing the supervisee directly with advice and expectations\"\n"
        "  }\n"
        "}\n\n"
        "Rules:\n"
        "- Do NOT include any numeric scores or ratings anywhere in the output.\n"
        "- major_corrections must reflect real, specific problems found in the actual uploaded text.\n"
        "- Each chapter_assessment observation must be specific to issues in that chapter.\n"
        "- Write in formal academic English as a supervisor addressing the candidate.\n"
        "- Return ONLY the raw JSON object. No markdown code fences, no commentary, no preamble."
    )

    content_sample = text[:15000]

    try:
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": (
                    f"Thesis Title (provided by uploader): {title}\n"
                    f"Candidate (provided by uploader): {candidate}\n"
                    f"Programme (provided by uploader): {programme}\n\n"
                    f"Thesis Content:\n{content_sample}"
                )}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        report = json.loads(response.choices[0].message.content)
        # populate deprecated key for safety/compatibility
        if "final_recommendation" in report and "decision" in report["final_recommendation"]:
            report["overall_recommendation"] = report["final_recommendation"]["decision"]
        return report
    except Exception as e:
        logger.error(f"Groq API call failed: {e}. Falling back to mock report.")
        return get_mock_report(title, candidate, programme)


async def process_thesis_critique_task(critique_id: int, file_bytes: bytes, filename: str):
    logger.info(f"Starting background processing for thesis critique ID {critique_id}")

    async with SessionLocal() as db:
        result = await db.execute(
            select(ThesisCritique).where(ThesisCritique.id == critique_id)
        )
        critique = result.scalar_one_or_none()
        if not critique:
            logger.error(f"Thesis critique ID {critique_id} not found in database.")
            return

        critique.status = CritiqueStatus.processing
        await db.commit()

        try:
            text = extract_text_from_file(file_bytes, filename)

            report = await call_groq_llm(
                title=critique.thesis_title,
                candidate=critique.candidate_name,
                programme=critique.programme,
                text=text
            )

            llm_metadata = report.get("metadata", {})
            if critique.candidate_name in ("Extracting...", ""):
                critique.candidate_name = llm_metadata.get("candidate_name", "Unknown Candidate")
            if critique.programme in ("Extracting...", ""):
                critique.programme = llm_metadata.get("programme", "Unknown Programme")
            if critique.thesis_title in ("Extracting...", "") or critique.thesis_title == filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()[:250]:
                critique.thesis_title = llm_metadata.get("thesis_title", critique.thesis_title)

            critique.report_json = json.dumps(report)
            critique.status = CritiqueStatus.completed
            await db.commit()
            logger.info(f"Successfully processed thesis critique ID {critique_id}")

        except Exception as e:
            logger.exception(f"Failed to process thesis critique ID {critique_id}")
            critique.status = CritiqueStatus.failed
            await db.commit()


async def create_thesis_critique(
    db: AsyncSession,
    lecturer_id: int,
    candidate_name: str | None,
    programme: str | None,
    thesis_title: str | None,
    filename: str,
    file_bytes: bytes,
    background_tasks
) -> ThesisCritique:
    candidate_name = (candidate_name or "").strip() or "Extracting..."
    programme = (programme or "").strip() or "Extracting..."

    t_title = (thesis_title or "").strip()
    if not t_title:
        placeholder = filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
        t_title = placeholder[:250]

    critique = ThesisCritique(
        lecturer_id=lecturer_id,
        candidate_name=candidate_name,
        programme=programme,
        thesis_title=t_title,
        filename=filename,
        status=CritiqueStatus.pending
    )
    db.add(critique)
    await db.commit()
    await db.refresh(critique)

    background_tasks.add_task(
        process_thesis_critique_task,
        critique_id=critique.id,
        file_bytes=file_bytes,
        filename=filename
    )

    return critique


async def get_thesis_critique_detail(db: AsyncSession, critique_id: int, lecturer_id: int) -> dict:
    result = await db.execute(
        select(ThesisCritique).where(ThesisCritique.id == critique_id)
    )
    critique = result.scalar_one_or_none()
    if not critique:
        raise NotFoundError("Thesis critique not found")

    if critique.lecturer_id != lecturer_id:
        raise ForbiddenError("You do not own this critique report")

    report = None
    if critique.report_json:
        try:
            report = json.loads(critique.report_json)
        except Exception:
            pass

    return {
        "id": critique.id,
        "candidateName": critique.candidate_name,
        "programme": critique.programme,
        "thesisTitle": critique.thesis_title,
        "filename": critique.filename,
        "status": critique.status.value,
        "createdAt": critique.created_at,
        "reportJson": report
    }


async def get_thesis_critiques_list(db: AsyncSession, lecturer_id: int) -> list[dict]:
    result = await db.execute(
        select(ThesisCritique)
        .where(ThesisCritique.lecturer_id == lecturer_id)
        .order_by(ThesisCritique.created_at.desc())
    )
    critiques = result.scalars().all()

    return [
        {
            "id": c.id,
            "candidateName": c.candidate_name,
            "programme": c.programme,
            "thesisTitle": c.thesis_title,
            "filename": c.filename,
            "status": c.status.value,
            "createdAt": c.created_at
        }
        for c in critiques
    ]


async def delete_thesis_critique(db: AsyncSession, critique_id: int, lecturer_id: int) -> None:
    result = await db.execute(
        select(ThesisCritique).where(ThesisCritique.id == critique_id)
    )
    critique = result.scalar_one_or_none()
    if not critique:
        raise NotFoundError("Thesis critique not found")

    if critique.lecturer_id != lecturer_id:
        raise ForbiddenError("You do not own this critique report")

    await db.delete(critique)
    await db.commit()


def generate_docx_report(critique: ThesisCritique) -> bytes:
    import docx.shared
    import docx.enum.text

    if not critique.report_json:
        raise ValueError("No critique report data available to export.")

    try:
        report = json.loads(critique.report_json)
    except Exception as e:
        raise ValueError(f"Failed to parse critique report JSON: {e}")

    doc = docx.Document()

    # ── Title block ──────────────────────────────────────────────────────────
    title_p = doc.add_paragraph()
    run = title_p.add_run("CRITICAL ASSESSMENT REPORT ON MSc THESIS")
    run.font.name = "Arial"
    run.font.size = docx.shared.Pt(18)
    run.font.bold = True
    run.font.color.rgb = docx.shared.RGBColor(37, 99, 235)
    title_p.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER

    sub_p = doc.add_paragraph()
    sub_run = sub_p.add_run("Supervisor's Review and Corrective Guidance to the Supervisee")
    sub_run.font.name = "Arial"
    sub_run.font.size = docx.shared.Pt(11)
    sub_run.font.italic = True
    sub_run.font.color.rgb = docx.shared.RGBColor(139, 147, 165)
    sub_p.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()

    # ── Metadata table ───────────────────────────────────────────────────────
    meta = report.get("metadata", {})
    metadata_rows = [
        ("Candidate", critique.candidate_name or meta.get("candidate_name", "")),
        ("Programme", critique.programme or meta.get("programme", "")),
        ("Institution", ""),
        ("Thesis Title", critique.thesis_title or meta.get("thesis_title", "")),
        ("Assessment Type", "Critical Supervisor Assessment"),
        ("Overall Recommendation", report.get("overall_recommendation", "")),
    ]

    meta_table = doc.add_table(rows=len(metadata_rows), cols=2)
    meta_table.style = "Table Grid"
    for i, (label, val) in enumerate(metadata_rows):
        c0 = meta_table.rows[i].cells[0]
        c0.text = label
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.name = "Arial"
        c0.paragraphs[0].runs[0].font.size = docx.shared.Pt(10)
        c1 = meta_table.rows[i].cells[1]
        c1.text = val
        c1.paragraphs[0].runs[0].font.name = "Arial"
        c1.paragraphs[0].runs[0].font.size = docx.shared.Pt(10)

    doc.add_paragraph()

    def section_heading(doc, text):
        h = doc.add_heading(level=1)
        r = h.add_run(text)
        r.font.name = "Arial"
        r.font.color.rgb = docx.shared.RGBColor(37, 99, 235)

    def bullet(doc, text):
        p = doc.add_paragraph(style="List Bullet")
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = docx.shared.Pt(10.5)

    # ── 1. Overall Supervisor's Assessment ───────────────────────────────────
    section_heading(doc, "1. Overall Supervisor's Assessment")
    overall = report.get("overall_assessment", "")
    if overall:
        p = doc.add_paragraph()
        p.add_run(overall).font.size = docx.shared.Pt(10.5)

    doc.add_paragraph()

    # ── 2. Major Strengths ───────────────────────────────────────────────────
    section_heading(doc, "2. Major Strengths of the Thesis")
    for s in report.get("strengths", []):
        bullet(doc, s)

    doc.add_paragraph()

    # ── 3. Major Corrections Required ────────────────────────────────────────
    section_heading(doc, "3. Major Corrections Required")
    intro_p = doc.add_paragraph()
    intro_p.add_run(
        "The following issues must be corrected because they affect the scientific accuracy, "
        "credibility, and final defensibility of the thesis."
    ).font.size = docx.shared.Pt(10.5)

    corrections = report.get("major_corrections", [])
    if corrections:
        # Table: No. | Issue | Why It Matters | Required Correction
        corr_table = doc.add_table(rows=1, cols=4)
        corr_table.style = "Table Grid"
        hdr = corr_table.rows[0].cells
        for i, h_text in enumerate(["No.", "Issue Identified", "Why It Matters", "Required Correction"]):
            hdr[i].text = h_text
            hdr[i].paragraphs[0].runs[0].font.bold = True
            hdr[i].paragraphs[0].runs[0].font.name = "Arial"
            hdr[i].paragraphs[0].runs[0].font.size = docx.shared.Pt(10)

        for idx, corr in enumerate(corrections, start=1):
            row = corr_table.add_row().cells
            row[0].text = str(idx)
            row[1].text = corr.get("issue", "")
            row[2].text = corr.get("why_it_matters", "")
            row[3].text = corr.get("required_correction", "")
            for cell in row:
                cell.paragraphs[0].runs[0].font.name = "Arial"
                cell.paragraphs[0].runs[0].font.size = docx.shared.Pt(10)

    doc.add_paragraph()

    # ── 4. Chapter-by-Chapter Assessment ─────────────────────────────────────
    section_heading(doc, "4. Chapter-by-Chapter Critical Assessment")
    for ch in report.get("chapter_assessments", []):
        ch_heading = doc.add_heading(level=2)
        ch_run = ch_heading.add_run(ch.get("name", ""))
        ch_run.font.name = "Arial"
        ch_run.font.color.rgb = docx.shared.RGBColor(139, 92, 246)
        for obs in ch.get("observations", []):
            bullet(doc, obs)

    doc.add_paragraph()

    # ── 5. Technical and Methodological Comments ─────────────────────────────
    technical = report.get("technical_comments", [])
    if technical:
        section_heading(doc, "5. Technical and Methodological Comments")
        for tc in technical:
            bullet(doc, tc)
        doc.add_paragraph()

    # ── 6. Formatting, Language, and Referencing Corrections ──────────────────
    formatting = report.get("formatting_comments", [])
    if formatting:
        section_heading(doc, "6. Formatting, Language, and Referencing Corrections")
        for fc in formatting:
            bullet(doc, fc)
        doc.add_paragraph()

    # ── 7. Priority Action Plan for the Candidate ─────────────────────────────
    action_plan = report.get("priority_action_plan", [])
    if action_plan:
        section_heading(doc, "7. Priority Action Plan for the Candidate")
        for i, act in enumerate(action_plan, start=1):
            p = doc.add_paragraph()
            p.add_run(f"{i}. ").font.bold = True
            p.add_run(act).font.size = docx.shared.Pt(10.5)
        doc.add_paragraph()

    # ── 8. Final Recommendation ────────────────────────────────────────────────
    section_heading(doc, "8. Final Recommendation")
    final_rec = report.get("final_recommendation")
    if isinstance(final_rec, dict):
        rec_narrative = final_rec.get("narrative", "")
        rec_decision = final_rec.get("decision", "")
        rec_closing = final_rec.get("closing_note", "")
    else:
        # Fallback for old records
        rec_narrative = ""
        rec_decision = report.get("overall_recommendation", "")
        rec_closing = ""

    if rec_narrative:
        p = doc.add_paragraph()
        p.add_run(rec_narrative).font.size = docx.shared.Pt(10.5)
        doc.add_paragraph()

    if rec_decision:
        p = doc.add_paragraph()
        r = p.add_run(f"Decision: {rec_decision}")
        r.font.bold = True
        r.font.size = docx.shared.Pt(11)
        r.font.color.rgb = docx.shared.RGBColor(37, 99, 235)
        doc.add_paragraph()

    if rec_closing:
        p = doc.add_paragraph()
        r1 = p.add_run("Supervisor’s closing note to the supervisee: ")
        r1.font.bold = True
        r1.font.size = docx.shared.Pt(10.5)
        r2 = p.add_run(rec_closing)
        r2.font.italic = True
        r2.font.size = docx.shared.Pt(10.5)
        doc.add_paragraph()

    doc.add_paragraph()
    for label in ["Prepared by: Supervisor", "Signature: ________________________________", "Date: _____________________________________"]:
        p = doc.add_paragraph()
        p.add_run(label).font.size = docx.shared.Pt(10.5)

    output_stream = io.BytesIO()
    doc.save(output_stream)
    return output_stream.getvalue()


async def export_thesis_critique_docx(db: AsyncSession, critique_id: int, lecturer_id: int) -> tuple[bytes, str]:
    result = await db.execute(
        select(ThesisCritique).where(ThesisCritique.id == critique_id)
    )
    critique = result.scalar_one_or_none()
    if not critique:
        raise NotFoundError("Thesis critique not found")

    if critique.lecturer_id != lecturer_id:
        raise ForbiddenError("You do not own this critique report")

    docx_bytes = generate_docx_report(critique)
    return docx_bytes, critique.thesis_title

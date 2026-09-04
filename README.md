# Evidence-Based Thesis Assessor

An automated, LLM-powered academic thesis assessment and critique engine for universities. Aligned with official institutional rubrics (such as KNUST MPhil / MSc thesis assessment rubrics), the system provides structured evidence extraction, preliminary compliance verification, double-run scoring with verifier audits, and automated narrative critique report generation.


## Core Features

- **Thesis Document Ingestion & Parsing**: Parses `.docx` thesis manuscripts, extracts chapters, sub-sections, text embeddings, and visual elements.
- **Rubric-Driven Multi-Tier Assessment**: Evaluates submissions against customizable institutional rubrics with lettered sub-criteria.
- **Two-Pass Scoring with Verifier Auditing**: Dual AI scoring pass to verify score consistency, with automated verifier rationale and supervisor override controls.
- **Formatted DOCX Report Export**: Generates official formatted evaluation reports ready for academic committees.
- **Supervisor Dashboard**: Centralized dashboard for managing thesis submissions, reviewing verification checks, adjusting criterion scores, and approving narrative reports.

## Documentation & Specs

- **[Build Specification (thesis_assessment_build_spec.md)](thesis_assessment_build_spec.md)**: Details on the agent pipeline architecture, scoring algorithms, and database models.
- **[Fix Specification (thesis-assessor-fix-spec.md)](thesis-assessor-fix-spec.md)**: Technical spec for strict persona constraints, flow matrix synthesis, and report formatting rules.

## Quick Start

### Frontend (React + Vite)
```bash
npm install
npm run dev
```

### Backend (FastAPI + SQLAlchemy + Groq/Claude)
```bash
uvicorn app.main:app --reload --port 8000
```
### Backend (Docker Compose)
```bash
    docker compose up -d --build
```


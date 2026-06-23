# DevLab — AI-Powered Online Assessment System for Universities

DevLab is an interactive, curriculum-aligned online programming assessment and learning platform designed for universities. It provides two distinct learning/testing modes: **Guided Mode** (scenario-based inline coding walkthroughs) and **Challenge Mode** (competitive programming assessments).

This repository contains the high-fidelity frontend prototype built with React, Tailwind CSS, Monaco Editor, Zustand, and Framer Motion.

## Documentation & Guides

To understand the project and run a high-fidelity demonstration, please refer to the following documents:

*   **[Demo Guide (DEMO.md)](DEMO.md)**: Detailed step-by-step instructions for running the project, logging in as Lecturer/Student, and executing various workflows (course creation, timed assessments, challenge & guided mode editors, grading).
*   **[Project Scope Document (devlab_guide.md)](devlab_guide.md)**: Details on the target project architecture, database models, Docker sandboxing execution pipelines, and timelines.
*   **[Frontend Guides (frontend_guide/)](frontend_guide/devlab_frontend_index.md)**: Reference specifications for implementing or auditing the frontend components (e.g. Monaco wrapper, countdown timer, private routing).
*   **[Backend Guides (backend_guide/)](backend_guide/devlab_backend_index.md)**: Architecture documents detailing the submission pipeline, Docker containers, SQLite executor, and auth protocols.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173/` in your browser.


# DevLab — Project Scope Document

**DevLab**

*AI-Powered Online Assessment System for Universities*

**PROJECT SCOPE DOCUMENT**

| **Project** | DevLab |
| --- | --- |
| **Team** | Ankomah Kelvin (3371222) │ Mahfuz Abgor Seidu (33647222) |
| **Type** | Final Year Project (FYP) |
| **Timeline** | 4 months |
| **Stack** | FastAPI · PostgreSQL · React.js · Monaco Editor · Docker · SQLite |

---

## 1. Project Overview

DevLab is a curriculum-aligned coding environment built for universities. It combines an interactive learning platform with a formal assessment system — giving students a place to practice and learn, and giving lecturers the tools to set, run, and grade practical programming assessments automatically.

The platform is built around two core beliefs: that learning to code requires doing, not just reading; and that assessment should measure whether code actually works, not whether it looks right on paper.

---

## 2. Problem Statement

Practical programming courses at universities face a consistent set of problems:

- Lecturers manually grade code submissions — running files one by one, checking edge cases, spending hours on work that could be automated.
- Students receive feedback days after submission, long after the learning moment has passed.
- Practical exams are conducted on paper or via screenshots — testing whether code looks right, not whether it runs.
- Generic platforms like LeetCode or Codedex exist but are not tied to university courses, lecturers, or curriculum.
- No existing tool combines guided learning, scenario-based problems, and formal academic assessment in one place.

DevLab addresses all of these directly.

---

## 3. Project Goals

### 3.1 Primary Goals

- Build a platform where students write and run real code in the browser across multiple languages.
- Support two distinct problem modes — guided narrative and pure challenge — to serve both learning and assessment.
- Automate grading through deterministic test case execution, eliminating manual marking for code and SQL problems.
- Give lecturers tools to create courses, author problems, set timed assessments, and view results.
- Give students instant feedback on every submission — which test cases passed, which failed, and why.

### 3.2 Secondary Goals

- Make the platform engaging enough that students use it voluntarily for practice, not just for graded work.
- Support scenario-based problem framing so that problems feel connected to real-world contexts.
- Design the system so new languages can be added without architectural changes.

---

## 4. Scope

### 4.1 In Scope

#### Problem Modes

- **Guided mode** — scrollable narrative with inline embedded code editors. Story-driven, scenario-based. Next section unlocks when current code runs correctly. Inspired by SQL Murder Mystery and Codedex.
- **Challenge mode** — split-pane layout, problem description left, Monaco editor right. Run against sample test cases freely, submit for final grading. Inspired by LeetCode.
- Lecturers choose the mode per problem.

#### Supported Languages and Execution Environments

| **Language** | **Execution Environment** | **Notes** |
| --- | --- | --- |
| Python | Docker sandbox | Time + memory limits enforced |
| Java | Docker sandbox | Time + memory limits enforced |
| C++ | Docker sandbox | Time + memory limits enforced |
| SQL | SQLite (in-process) | Schema seeded per problem, result set comparison |
| HTML / CSS / JS | Browser iframe sandbox | Output rendered inline, no server round-trip |

#### Core Features

- **User authentication** — register, login, JWT-based sessions, role assignment (student / lecturer).
- **Course management** — create courses, enroll students, assign assessments to courses.
- **Problem authoring** — freeform markdown editor or structured template, both produce the same renderable content format.
- **Test case management** — define stdin/stdout pairs for code problems, seed schema + expected result sets for SQL problems.
- **Assessment engine** — timed windows, countdown timer, auto-lock on expiry, hidden test cases for final grading.
- **Submission pipeline** — accept submission, route to correct execution environment, store per-test-case results.
- **Instant feedback** — show students which test cases passed, actual vs expected output, execution time.
- **Lecturer dashboard** — gradebook per assessment, per-student results, submission history.
- **Student dashboard** — course view, problem list, submission history, practice mode outside exam windows.

### 4.2 Out of Scope

*The following are explicitly excluded from this version. They are noted as future work in the project report.*

- MCQ (multiple choice questions) — no automated grading for non-code question types.
- Essay / text response autograding — subjective assessment requires human review.
- Pseudocode autograding — no standard syntax, not deterministically gradeable.
- Assembly language — disproportionate complexity for FYP scope.
- Full-stack web assessment (Node.js, server-side) — execution complexity out of scope.
- Plagiarism detection — future enhancement.
- Mobile native app — responsive web only.
- Real-time collaboration — single-user editor per submission.

---

## 5. Problem Modes in Detail

### 5.1 Guided Mode

Guided mode delivers problems as scrollable, narrative-driven lessons. The student reads a scenario, encounters an inline code editor mid-narrative, writes and runs code, and the story continues when they get it right. This mirrors the experience of SQL Murder Mystery — the code is a tool for answering a question the student actually cares about.

A guided problem is stored as a structured content format — a sequence of blocks, each either a narrative paragraph or a runnable code editor with an expected output. The renderer reads this format and builds the page. The execution engine is identical to challenge mode — only the presentation differs.

Example scenario: a student plays the role of a data analyst at a fictional Ghanaian e-commerce company. The narrative sets the scene, reveals the schema, and asks questions. Each question is answered by writing a query in an inline editor. The answer unlocks the next part of the story.

### 5.2 Challenge Mode

Challenge mode presents a single problem in a split-pane layout. The left pane shows the problem description, constraints, and sample test cases. The right pane is a full Monaco editor. Students run against visible sample cases during practice, then submit for final grading against all test cases including hidden ones.

During a timed assessment, a countdown timer is visible. Submission is locked when the timer expires. Outside of assessment windows, challenge problems are open for unlimited practice attempts.

---

## 6. User Roles

| **Role** | **Can Do** | **Cannot Do** |
| --- | --- | --- |
| Lecturer | Create courses, enroll students, author problems, set assessments, view all results and gradebook | Attempt problems as a student, submit code for grading |
| Student | Enroll in courses, attempt problems, view own results and submission history, practice freely outside exam windows | Create problems, view other students' submissions, access gradebook |

---

## 7. Technical Architecture

### 7.1 Stack

| **Layer** | **Technology** | **Purpose** |
| --- | --- | --- |
| Frontend | React.js + TailwindCSS | Student and lecturer UI |
| Editor | Monaco Editor | In-browser code editor (VS Code engine) |
| Backend | FastAPI (Python) | REST API, auth, business logic |
| Database | PostgreSQL | Primary data store |
| Cache / sessions | Redis | JWT session management, submission queue |
| Code sandbox | Docker | Isolated execution for Python, Java, C++ |
| SQL runner | SQLite (in-process) | Fast isolated SQL execution |
| Browser sandbox | iframe | HTML/CSS/JS rendering, no server needed |
| Auth | JWT + bcrypt | Stateless authentication, role-based middleware |

### 7.2 Execution Pipelines

The submission router inspects the problem type and language, then dispatches to the correct execution environment. All three pipelines write results to the same Submission and TestResult tables, keeping the grading logic unified regardless of language.

- **Docker pipeline** — receives code + language, spins up a short-lived container with resource limits (CPU time, memory, no network), runs code against each test case, captures stdout/stderr, compares to expected output, destroys container.
- **SQLite pipeline** — receives SQL query, spins up a fresh in-memory SQLite instance, runs the seed script, executes the student's query, compares result set to expected result set as unordered sets (unless ORDER BY is part of the problem), destroys instance.
- **Browser pipeline** — HTML/CSS/JS problems are executed entirely client-side in a sandboxed iframe. No server round-trip. Output is rendered visually for the student.

---

## 8. Core Data Model

*Simplified — full ERD in system design documentation.*

| **Entity** | **Key Fields** | **Notes** |
| --- | --- | --- |
| User | id, name, email, role, password_hash | role: student │ lecturer |
| Course | id, title, lecturer_id, language | One lecturer owns a course |
| Enrollment | id, user_id, course_id | Many students per course |
| Assessment | id, course_id, title, duration_secs, starts_at, ends_at | Defines the exam window |
| Problem | id, assessment_id, title, type, language, content, time_limit_ms, memory_limit_mb | type: guided │ challenge |
| TestCase | id, problem_id, stdin, expected_stdout, is_hidden | Hidden cases not shown to student |
| Submission | id, user_id, problem_id, code, language, status, score, submitted_at | status: pending │ running │ completed │ error |
| TestResult | id, submission_id, test_case_id, passed, actual_stdout, exec_time_ms | One row per test case per submission |

---

## 9. Delivery Timeline

| **Month** | **Build** | **Report** |
| --- | --- | --- |
| Month 1 | Auth system, DB schema, FastAPI setup, course + enrollment CRUD | Introduction, problem statement, literature review |
| Month 2 | Problem + test case management, Docker sandbox, SQLite runner, submission pipeline | System design, architecture, data model |
| Month 3 | Monaco editor UI, guided mode renderer, assessment timer, lecturer dashboard, student dashboard | Implementation chapter |
| Month 4 | Testing, bug fixes, deployment, UI polish | Evaluation, conclusion, limitations, final submission |

---

## 10. Risks and Mitigations

| **Risk** | **Likelihood** | **Mitigation** |
| --- | --- | --- |
| Docker sandbox complexity (timeouts, escape, resource limits) | High | Use Judge0 open-source runner as fallback if custom sandbox takes too long |
| Guided mode content format design takes longer than expected | Medium | Build challenge mode first — guided mode is additive, not blocking |
| Scope creep (adding languages, features mid-build) | Medium | Freeze scope at Month 1. New ideas go in a future work list for the report |
| Partner coordination issues | Low | Clear ownership split decided before Month 1 begins |
| Deployment issues in Month 4 | Low | Deploy a staging version at end of Month 2 to catch infrastructure problems early |

---

## 11. Definition of Done

DevLab is considered complete for FYP submission when:

- A lecturer can create a course, author both a guided and a challenge problem, define test cases, and set a timed assessment.
- A student can enroll in a course, attempt a guided problem end-to-end, attempt a challenge problem, and receive instant feedback.
- Code submissions in Python, Java, and C++ are executed in isolated Docker containers and graded correctly.
- SQL submissions are executed against a seeded SQLite instance and graded by result set comparison.
- HTML/CSS/JS submissions render in a browser sandbox.
- The assessment timer enforces submission cutoff correctly.
- The lecturer gradebook shows accurate scores for all students.
- The system is deployed to a live URL accessible for demonstration and evaluation.
- The project report is complete including literature review, system design, implementation, evaluation, and conclusion chapters.

---

*DevLab — Final Year Project — Ankomah Kelvin & Mahfuz Abgor Seidu*

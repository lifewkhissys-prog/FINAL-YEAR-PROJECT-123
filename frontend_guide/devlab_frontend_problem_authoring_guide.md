# DevLab Frontend Guide — Problem Authoring

**Stack:** React.js + TailwindCSS + Monaco Editor  
**Feature scope:** Lecturer problem creation (guided + challenge), test case management, problem editing  
**Roles involved:** Lecturer only

---

## Overview

Problem authoring is where lecturers create the problems that appear in assessments. There are two problem types — guided and challenge — each with a different authoring interface. Both types require test cases to be defined.

Problems are attached to assessments, which are attached to courses.

---

## Entry Point

Lecturers reach problem authoring from an assessment's detail page. Each assessment has a **+ Add Problem** button.

Route: `/lecturer/assessments/:assessmentId/problems/new`  
Edit route: `/lecturer/assessments/:assessmentId/problems/:problemId/edit`

---

## Step 1 — Problem Setup

A short setup form before the main editor:

**Fields:**
- Problem title (required)
- Problem type — `Guided` or `Challenge` (radio or toggle, required)
- Language — dropdown limited to the parent course's language (required)
- Time limit (ms) — default `2000`
- Memory limit (MB) — default `256`

On continue, the page transitions to the type-specific editor.

---

## Challenge Mode Authoring

### Description editor
- A full-page Markdown editor (left pane: raw Markdown, right pane: live preview, side by side)
- The description should include: problem statement, input/output format, constraints, sample I/O
- Support all standard Markdown: headings, bold/italic, code fences, tables

### Starter code editor
- A Monaco editor where the lecturer writes the starter code template students will see
- Language is fixed (set in Step 1)
- This is what pre-populates the student's editor

### Test cases panel
Below the editors, a test case management section:

Each test case has:
- `stdin` — text area (may be empty for problems with no input)
- `expected_stdout` — text area
- `is_hidden` checkbox — hidden cases are used for final grading, not shown to students

Actions:
- **+ Add test case** — appends a new blank test case row
- **Delete** button per row
- Minimum 1 test case required to save

There is no limit on the number of test cases, but a practical note for the UI: cap visible rows and add a scroll container if there are more than 10.

---

## Guided Mode Authoring

Guided mode is authored as an ordered list of blocks — alternating narrative and editor blocks.

### Block editor
Each block in the list can be:
- **Narrative block** — a Markdown editor (same as description editor above, but scoped to one block)
- **Editor block** — contains:
  - Starter code (Monaco editor)
  - Expected output (text area) — this is the correct output for the inline check
  - Optional hint text

### Block management
- Blocks are displayed in order as cards in a vertical list
- Drag-to-reorder (drag handle per card)
- **+ Add Narrative** and **+ Add Editor** buttons at the bottom (or between any two blocks)
- Delete button per block (with confirm if the block has content)
- A block type label (`NARRATIVE` / `EDITOR`) on each card header

### Preview
A **Preview** button opens a full-page preview rendering the guided mode as the student would see it, with editors interactive. Useful for checking the narrative flow before saving.

---

## Saving

A persistent **Save** button (sticky at the bottom or top of the page).

Saving does not publish — problems are in draft state until the assessment is published (see Assessment Engine guide).

On save:
- POST `/problems` (new) or PATCH `/problems/:id` (edit)
- Test cases are saved in the same request or via a follow-up POST to `/problems/:id/test-cases`
- Show a success toast: "Problem saved."
- Validation errors appear inline next to the relevant field

---

## API Endpoints Used

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| POST | `/problems` | `{ assessmentId, title, type, language, content, starterCode, timeLimitMs, memoryLimitMb }` | Create |
| PATCH | `/problems/:id` | same fields, all optional | Update |
| DELETE | `/problems/:id` | — | Removes all test cases too |
| GET | `/problems/:id` | — | Load for editing |
| POST | `/problems/:id/test-cases` | `[{ stdin, expectedStdout, isHidden }]` | Replace all test cases |

---

## UI States

| State | Behaviour |
|-------|-----------|
| Loading existing problem | Skeleton for both panes |
| No test cases on save attempt | Inline error: "Add at least one test case." |
| Save success | Toast: "Problem saved." |
| Save error | Toast with error message |
| Delete problem | Confirm modal: "This will also delete all test cases. Continue?" |
| Guided block delete (with content) | Confirm: "This block has content. Delete anyway?" |

---

## Out of Scope

- MCQ / essay question types
- Problem bank / reuse across assessments
- AI-assisted problem generation
- Versioning / draft history
- Collaborative authoring

# DevLab Frontend Guide — Lecturer Dashboard

**Stack:** React.js + TailwindCSS  
**Feature scope:** Lecturer home, gradebook per assessment, per-student results, submission history  
**Roles involved:** Lecturer only

---

## Overview

The lecturer dashboard is the primary hub for a lecturer after login. It gives an at-a-glance view of their courses and assessments, and provides drill-down access to per-assessment gradebooks and individual student submission history.

---

## `/lecturer/dashboard` — Home

The landing page after login for a lecturer.

**Summary cards (top row):**
- Total courses
- Total active assessments (status: `active` right now)
- Total students enrolled (across all courses)

**Recent assessments panel:**
A list of the 5 most recently active or upcoming assessments, each showing:
- Assessment title
- Course name
- Status badge: `Scheduled` | `Active` | `Ended`
- Time window (start → end)
- Quick link: **View Gradebook**

**Courses panel:**
All courses the lecturer owns, as cards. Each card links to the course management page (see Course Management guide).

---

## `/lecturer/assessments/:assessmentId/gradebook` — Gradebook

The main grading view. Accessible from the assessment detail page and the dashboard.

### Header
- Assessment title, course name, time window
- Status badge
- Export button (CSV download of the gradebook — nice-to-have, not blocking)

### Gradebook table

Rows = students enrolled in the course  
Columns = one per problem in the assessment, plus a Total column

```
Student Name     | Problem 1 | Problem 2 | Problem 3 | Total
─────────────────|───────────|───────────|───────────|──────
Ama Owusu        | 5/5       | 3/5       | —         | 8/10
Kofi Mensah      | 4/5       | 5/5       | 5/5       | 14/15
Abena Asante     | —         | —         | —         | 0/15
```

- `—` means no submission made for that problem
- Scores show `actual / total test cases`
- Clicking a score cell opens the student's submission detail for that problem (see below)
- Clicking a student's name opens their full submission history page
- Rows are sortable by any column (name, individual problem scores, total)
- A search/filter input to find students by name

### Score calculation

The displayed score for each cell is from the student's **most recent submitted** (not run) submission for that problem. Only `/submissions/submit` calls count — `/submissions/run` calls do not appear in the gradebook.

---

## `/lecturer/assessments/:assessmentId/students/:userId` — Student Submission Detail

Reached by clicking a score cell in the gradebook.

Shows:
- Student name and email
- Assessment name
- Problem name and type
- The student's submission(s) for this specific problem, ordered newest first

For each submission:
- Timestamp
- Language used
- Score (e.g. `4 / 5`)
- Full feedback panel (same `<FeedbackPanel>` component used in student view) — expanded by default for the most recent submission, collapsed for older ones

The lecturer sees the same breakdown as the student, including hidden test case results (pass/fail only, no input/output revealed).

---

## `/lecturer/courses/:courseId/students/:userId` — Student History (Full)

A full view of all submissions a student has made across all assessments in a given course.

Groups submissions by assessment, then by problem:

```
Course: Introduction to Python

Assessment: Lab 1 (Ended)
  Problem 1 — Fizz Buzz         4/5  (submitted 3 times)
  Problem 2 — List Reversal     5/5  (submitted 1 time)

Assessment: Lab 2 (Ended)
  Problem 1 — Binary Search     2/5  (submitted 5 times)
```

Clicking any problem row expands to show all submissions for that problem with scores and timestamps.

---

## API Endpoints Used

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/lecturer/dashboard` | Summary stats + recent assessments |
| GET | `/assessments/:id/gradebook` | All students × all problems scores |
| GET | `/assessments/:id/students/:userId/submissions` | Submissions for one student, one assessment |
| GET | `/courses/:id/students/:userId/submissions` | Full submission history for a student in a course |

---

## UI States

| State | Behaviour |
|-------|-----------|
| No courses yet | Empty state with "Create your first course" CTA |
| Assessment with no submissions | Gradebook shows all `—` cells with a note: "No submissions yet." |
| Student with no submissions | Row shows all `—`, name still listed |
| Loading gradebook | Skeleton table |
| Export CSV | Triggers a file download — no page navigation |

---

## Out of Scope

- Manual score override by lecturer
- Comments or annotations on student submissions
- Plagiarism view
- Per-question analytics (difficulty, average score across cohort)
- Email students from the dashboard

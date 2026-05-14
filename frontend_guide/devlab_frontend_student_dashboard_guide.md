# DevLab Frontend Guide — Student Dashboard

**Stack:** React.js + TailwindCSS  
**Feature scope:** Student home, course view, problem list, submission history, practice mode  
**Roles involved:** Student only

---

## Overview

The student dashboard is the hub a student lands on after login. It shows enrolled courses, active and upcoming assessments, and provides access to practice problems outside of exam windows. Students can also review their own submission history here.

---

## `/student/dashboard` — Home

The landing page after login for a student.

**Active assessments panel (top):**
A highlighted section showing any assessments currently in progress across all enrolled courses:
- Assessment title
- Course name
- Time remaining (countdown — same logic as in the assessment engine)
- **Enter Assessment** button → goes to `/student/assessments/:id`

If no assessments are currently active, this section is hidden or shows "No active assessments right now."

**Upcoming assessments:**
A list of assessments starting within the next 7 days:
- Assessment title
- Course name
- Starts in: relative time (e.g. "Starts in 2 days")
- Status badge: `Scheduled`

**Enrolled courses:**
All courses as cards, each showing:
- Course title
- Lecturer name
- Language
- Link: **Open Course**

---

## `/student/courses/:courseId` — Course Home

What the student sees when they open a specific course.

**Assessments section:**
All assessments in this course, grouped by status:

- **Active** → **Enter Assessment** button, time remaining shown
- **Upcoming** → date/time shown, button disabled
- **Ended** → **View Results** button → goes to their results for that assessment

**Practice section:**
All problems in the course that are available for practice (outside of any active assessment window):
- Organised by problem type (Guided / Challenge)
- Each problem shows: title, language, type badge
- A personal best score (if they've attempted it before): e.g. `Best: 4/5`
- **Practice** button → opens problem in guided or challenge mode, no timer, submissions not graded

---

## `/student/assessments/:assessmentId` — Assessment Hub

The student's view during an active assessment (described in detail in the Assessment Engine guide, but summarised here for completeness):

- Assessment title and course
- Countdown timer (prominent)
- Problem list with per-problem status: `Not started` | `In progress` | `Submitted`
- **Attempt** button per problem

The student navigates between this hub and individual problems. Returning to this page from a problem does not lose their code (code persists in `localStorage` per problem + language).

---

## `/student/assessments/:assessmentId/results` — Assessment Results

After an assessment ends, the student can view their results.

Shows:
- Assessment title, course, time window (ended)
- Total score: e.g. `12 / 15 test cases passed`
- Per-problem breakdown:
  | Problem | Score | Status |
  |---------|-------|--------|
  | Problem 1 | 5/5 | Accepted |
  | Problem 2 | 4/5 | Wrong Answer |
  | Problem 3 | 3/5 | Wrong Answer |

Clicking a problem row expands the full `<FeedbackPanel>` for their most recent submission for that problem.

---

## `/student/submissions` — Submission History

A full history of all the student's submissions across all courses and assessments.

Filter controls:
- By course (dropdown)
- By problem type (`Guided` / `Challenge`)
- By status (`Accepted` / `Wrong Answer` / `Error`)
- Date range picker

Table view:

| Date | Course | Problem | Language | Score | Status |
|------|--------|---------|----------|-------|--------|
| Today, 14:22 | Intro Python | Fizz Buzz | Python | 5/5 | Accepted |
| Yesterday | Intro Python | Binary Search | Python | 2/5 | Wrong Answer |

Clicking a row expands the full feedback panel for that submission.

---

## Practice Mode Distinction

When a student opens a problem outside an active assessment window, it opens in **practice mode**:
- No timer
- Run and Submit both available
- Submit records a `Submission` row but `is_graded: false` — it appears in submission history and the student's personal best score, but does not appear in the lecturer gradebook
- Personal best is calculated from practice submissions as well as graded ones (for the student's own view)

---

## API Endpoints Used

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/student/dashboard` | Active assessments, upcoming, enrolled courses |
| GET | `/courses/:id` | Course detail for student |
| GET | `/courses/:id/problems` | Practice problems list |
| GET | `/assessments/:id` | Assessment detail + problem list |
| GET | `/assessments/:id/results` | Student's own results for a completed assessment |
| GET | `/student/submissions` | Full submission history with filters |

---

## UI States

| State | Behaviour |
|-------|-----------|
| No active assessments | Active section hidden or soft empty state |
| No enrolled courses | Empty state: "You haven't been enrolled in any courses yet. Ask your lecturer." |
| No submissions yet | Empty history state with "Start practicing" CTA |
| Assessment ended (entering old link) | Redirect to results page |
| Loading dashboard | Skeleton cards |

---

## Out of Scope

- Student-initiated enrollment
- Notifications for upcoming assessments
- Progress tracking across the course (% of practice problems attempted)
- Leaderboard or peer comparison

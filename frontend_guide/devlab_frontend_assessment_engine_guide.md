# DevLab Frontend Guide — Assessment Engine

**Stack:** React.js + TailwindCSS  
**Feature scope:** Assessment creation, timed windows, countdown timer, submission lock on expiry  
**Roles involved:** Lecturer (create/manage), Student (enter/attempt)

---

## Overview

An assessment is a timed window during which students attempt a set of problems for grading. Lecturers create assessments, attach problems to them, and set start/end times. Students enter assessments, see a countdown timer, and are locked out when time expires.

---

## Lecturer: Creating an Assessment

Route: `/lecturer/courses/:courseId/assessments/new`

**Form fields:**
- Title (required)
- Start date + time (required) — use a datetime-local input or date picker
- End date + time (required) — must be after start
- Duration note (auto-calculated and displayed: e.g. "2 hours 30 minutes")

On submit, POST to `/assessments`. On success, redirect to the assessment detail page where problems can be added.

**Validation:**
- End time must be after start time — show inline error if not
- Start time can be in the past (for retroactive setups), but show a warning toast if so

---

## Lecturer: Assessment Detail Page

Route: `/lecturer/assessments/:assessmentId`

Shows:
- Assessment title, course name, time window
- Status badge: `Scheduled` | `Active` | `Ended`
- Duration
- Problems list (title, type, language) — with **+ Add Problem** button (links to problem authoring)
- **Edit Assessment** button (opens edit form with same fields as creation)
- **Delete Assessment** button (with confirm dialog)

Once an assessment has ended, it becomes read-only. Problems cannot be added or removed.

---

## Student: Assessment Entry

When a student visits a course page and sees an active assessment, clicking **Enter Assessment** takes them to:

Route: `/student/assessments/:assessmentId`

This page shows:
- Assessment title and course name
- Time remaining (countdown timer — see Timer section)
- List of problems in the assessment — each as a card with:
  - Problem title
  - Language badge
  - Type badge (`Guided` / `Challenge`)
  - Status: `Not started` | `In progress` | `Submitted`
  - **Attempt** button → opens the problem in guided or challenge mode

This page is the student's hub for the assessment. They navigate back here between problems.

---

## Timer

The countdown timer is derived from `assessment.ends_at`:

```ts
const remaining = new Date(assessment.ends_at).getTime() - Date.now();
```

Display format:
- More than 1 hour remaining: `H:MM:SS`
- Under 1 hour: `MM:SS`
- Under 5 minutes: highlight red, add a pulse animation

Tick every second using `setInterval`. Clear the interval when the component unmounts.

**On expiry (`remaining <= 0`):**
- Timer displays `00:00`
- All **Attempt** buttons on the assessment hub become disabled
- A banner replaces the timer area: "Time's up. This assessment has ended."
- If the student is currently inside a problem editor, they are not forcibly redirected — but the Run and Submit buttons in that editor disable (see Challenge Mode guide)
- The student may still view their previous submissions

The timer must be robust to tab switching. Recalculate `remaining` from `ends_at` on each tick (not by decrementing a counter) so it stays accurate if the tab is backgrounded.

---

## Assessment Status Logic (Frontend)

Derive status from `starts_at` and `ends_at` on the client:

```ts
function getAssessmentStatus(assessment) {
  const now = Date.now();
  const start = new Date(assessment.starts_at).getTime();
  const end = new Date(assessment.ends_at).getTime();

  if (now < start) return "scheduled";
  if (now >= start && now <= end) return "active";
  return "ended";
}
```

| Status | Student CTA | Timer |
|--------|-------------|-------|
| `scheduled` | "Starts [date]" (disabled button) | No |
| `active` | "Enter Assessment" | Yes, once inside |
| `ended` | "View Results" | No |

---

## API Endpoints Used

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| POST | `/assessments` | `{ courseId, title, startsAt, endsAt }` | Lecturer only |
| GET | `/assessments/:id` | — | Returns assessment + problems list |
| PATCH | `/assessments/:id` | `{ title?, startsAt?, endsAt? }` | Lecturer only, before end |
| DELETE | `/assessments/:id` | — | Lecturer only |
| GET | `/courses/:id/assessments` | — | All assessments for a course |

---

## UI States

| State | Behaviour |
|-------|-----------|
| Assessment not yet started (student) | CTA disabled, countdown to start shown |
| Assessment active (student) | Enter button visible, timer active inside |
| Assessment ended (student) | View Results CTA, no timer |
| Timer under 5 minutes | Red highlight, pulse |
| Timer expired | Banner, all attempt buttons disabled |
| Delete assessment | Confirm modal: "All problems in this assessment will also be removed." |
| Edit after ended | Form read-only with notice: "This assessment has ended and cannot be edited." |

---

## Out of Scope

- Per-student time extensions
- Pausing an assessment
- Manual early lock of an assessment
- Assessment password / access codes

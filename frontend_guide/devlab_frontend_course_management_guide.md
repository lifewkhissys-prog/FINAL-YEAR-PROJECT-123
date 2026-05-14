# DevLab Frontend Guide — Course Management

**Stack:** React.js + TailwindCSS  
**Feature scope:** Course creation, student enrollment, assessment assignment to courses  
**Roles involved:** Lecturer (create/manage), Student (view enrolled courses)

---

## Overview

Courses are the top-level container that groups students, problems, and assessments together. A lecturer creates courses, students enroll in them, and assessments are attached to a course. Both roles have different views of the same course.

---

## Lecturer Views

### `/lecturer/courses` — Course List

Displays all courses owned by the logged-in lecturer.

Each course card shows:
- Course title
- Language (e.g. Python, SQL)
- Number of enrolled students
- Number of assessments
- Links: **Manage Students** | **Assessments** | **Edit**

A **+ New Course** button at the top opens the creation form.

### `/lecturer/courses/new` — Create Course

Form fields:
- Course title (required)
- Language — dropdown: `Python`, `Java`, `C++`, `SQL`, `HTML/CSS/JS` (required)
- Description (optional, Markdown supported)

On submit, POST to `/courses`. On success, redirect to the new course's management page.

### `/lecturer/courses/:courseId` — Course Management

Tabs or sections on this page:

**Students tab:**
- List of enrolled students (name, email, enrolment date)
- Search/filter by name
- **Enroll Student** button → opens a modal with an email input to add a student by email
- **Remove** button per student (with confirm dialog)

**Assessments tab:**
- List of assessments assigned to this course (title, window start/end, number of problems)
- **+ New Assessment** button → redirects to assessment creation (see Assessment Engine guide)
- Click an assessment row → go to that assessment's detail page

**Edit tab:**
- Same form as creation, pre-populated
- **Delete Course** button at the bottom (with confirm dialog)

---

## Student Views

### `/student/courses` — Enrolled Course List

Displays all courses the logged-in student is enrolled in.

Each course card shows:
- Course title
- Language
- Lecturer name
- Number of assessments available
- Link: **Open Course**

No enrollment UI here — enrollment is managed by lecturers.

### `/student/courses/:courseId` — Course Home

What the student sees when they open a course:

- Course title and description
- Lecturer name
- List of assessments in this course:
  - Assessment title
  - Window: start and end date/time
  - Status badge: `Upcoming` | `Active` | `Ended`
  - If active: **Enter Assessment** button
  - If ended: **View Results** button
- Link to practice problems (problems from the course available outside assessment windows)

---

## API Endpoints Used

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| GET | `/courses` | — | Lecturer: their courses. Student: enrolled courses. |
| POST | `/courses` | `{ title, language, description? }` | Lecturer only |
| GET | `/courses/:id` | — | Course detail |
| PATCH | `/courses/:id` | `{ title?, language?, description? }` | Lecturer only |
| DELETE | `/courses/:id` | — | Lecturer only |
| GET | `/courses/:id/students` | — | Enrollment list |
| POST | `/courses/:id/students` | `{ email }` | Enroll by email |
| DELETE | `/courses/:id/students/:userId` | — | Remove student |
| GET | `/courses/:id/assessments` | — | Assessments in course |

---

## UI States

| State | Behaviour |
|-------|-----------|
| No courses (lecturer) | Empty state with "Create your first course" CTA |
| No courses (student) | Empty state: "You haven't been enrolled in any courses yet." |
| Loading | Skeleton card grid |
| Enroll student — email not found | Inline error: "No student found with that email." |
| Enroll student — already enrolled | Inline error: "This student is already enrolled." |
| Delete course — confirm | Modal: "This will remove all associated assessments. Are you sure?" |

---

## Out of Scope

- Student self-enrollment via a join code or link
- Course duplication / templates
- Multiple lecturers per course
- Course archiving

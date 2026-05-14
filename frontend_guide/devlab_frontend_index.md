# DevLab Frontend Guides — Index

**Stack:** React.js + TailwindCSS + Monaco Editor  
**Auth:** JWT (stored in `localStorage` as `devlab_token`)  
**Roles:** `student` | `lecturer`

---

## Guide Files

| Feature | File | Roles |
|---------|------|-------|
| Authentication | `devlab_frontend_auth_guide.md` | Both |
| Guided Mode Editor | `devlab_frontend_guided_mode_guide.md` | Student |
| Challenge Mode Editor | `devlab_frontend_challenge_mode_guide.md` | Student |
| Course Management | `devlab_frontend_course_management_guide.md` | Both |
| Problem Authoring | `devlab_frontend_problem_authoring_guide.md` | Lecturer |
| Assessment Engine | `devlab_frontend_assessment_engine_guide.md` | Both |
| Submission Feedback | `devlab_frontend_submission_feedback_guide.md` | Student (view), Lecturer (read-only) |
| Lecturer Dashboard | `devlab_frontend_lecturer_dashboard_guide.md` | Lecturer |
| Student Dashboard | `devlab_frontend_student_dashboard_guide.md` | Student |

---

## Route Map

```
/                          → redirect based on role
/register                  → auth guide
/login                     → auth guide
/logout                    → auth guide (action, no page)

/lecturer/dashboard                                          → lecturer dashboard guide
/lecturer/courses                                            → course management guide
/lecturer/courses/new                                        → course management guide
/lecturer/courses/:courseId                                  → course management guide
/lecturer/courses/:courseId/assessments/new                  → assessment engine guide
/lecturer/assessments/:assessmentId                          → assessment engine guide
/lecturer/assessments/:assessmentId/gradebook                → lecturer dashboard guide
/lecturer/assessments/:assessmentId/problems/new             → problem authoring guide
/lecturer/assessments/:assessmentId/problems/:problemId/edit → problem authoring guide
/lecturer/assessments/:assessmentId/students/:userId         → lecturer dashboard guide
/lecturer/courses/:courseId/students/:userId                 → lecturer dashboard guide

/student/dashboard                                           → student dashboard guide
/student/courses/:courseId                                   → student dashboard guide
/student/assessments/:assessmentId                           → assessment engine guide + student dashboard guide
/student/assessments/:assessmentId/results                   → student dashboard guide
/student/problems/:problemId  (guided)                       → guided mode guide
/student/problems/:problemId  (challenge)                    → challenge mode guide + submission feedback guide
/student/submissions                                         → student dashboard guide
```

---

## Shared Components

These components are referenced across multiple guides and should be built once:

| Component | Used in |
|-----------|---------|
| `<FeedbackPanel>` | Challenge mode, submission feedback, lecturer gradebook, student results |
| `<CountdownTimer>` | Assessment engine, student dashboard (active assessments) |
| `<PrivateRoute>` | Auth guide — wraps all `/lecturer/*` and `/student/*` routes |
| Markdown renderer | Guided mode, problem authoring preview, course descriptions |
| Monaco Editor wrapper | Challenge mode, guided mode (inline), problem authoring |

---

## Global Conventions

- All authenticated requests: `Authorization: Bearer <token>` header
- Token decode (client-side, no verification): read `sub` (user_id), `role`, `name`, `exp`
- Token expiry check: if `exp < Date.now() / 1000`, treat as logged out
- `localStorage` keys: `devlab_token` (JWT), `devlab_guided_<problemId>` (guided mode progress), `devlab_code_<problemId>_<language>` (editor draft)
- Toast notifications: used for success/error feedback on all form submissions
- All dates/times from the API are ISO 8601 strings in UTC; display in the user's local timezone

# DevLab Backend Guide — Course Management & Enrollment

**Routers:** `app/routers/courses.py`, `app/routers/enrollments.py`  
**Service:** `app/services/course_service.py`  
**Models:** `Course`, `Enrollment`, `User`

---

## Course Endpoints

### `GET /courses`

Returns the caller's relevant courses.

- **Lecturer** → all courses where `lecturer_id == current_user.id`
- **Student** → all courses where the student has an `Enrollment` row

**Response `200`:**
```json
[
  {
    "id": 1,
    "title": "Introduction to Python",
    "language": "python",
    "description": "...",
    "lecturer_id": 5,
    "lecturer_name": "Ankomah Kelvin",
    "student_count": 34,
    "assessment_count": 3,
    "created_at": "2026-01-15T10:00:00Z"
  }
]
```

---

### `POST /courses`

Create a new course. **Lecturer only.**

**Request body:**
```json
{
  "title": "Introduction to Python",
  "language": "python",
  "description": "Optional course description."
}
```

**Logic:**
1. Validate `language` is a valid `CourseLanguage` enum value
2. Insert `Course` with `lecturer_id = current_user.id`
3. Return `201` with the created course

**Response `201`:** Full course object.

**Errors:**
- `422` — invalid language value

---

### `GET /courses/:courseId`

Fetch a single course.

**Access rules:**
- Lecturer: must own the course
- Student: must be enrolled

Raise `404` if the course doesn't exist. Raise `403` if the caller has no access.

**Response `200`:** Full course object including lecturer name.

---

### `PATCH /courses/:courseId`

Update a course. **Lecturer only, must own the course.**

**Request body** (all fields optional):
```json
{
  "title": "New Title",
  "language": "java",
  "description": "Updated description."
}
```

**Logic:**
1. Fetch course, verify ownership → `403` if not owner
2. Apply only the provided fields (partial update)
3. Commit and return updated course

---

### `DELETE /courses/:courseId`

Delete a course. **Lecturer only, must own the course.**

**Logic:**
- Cascade delete: all assessments, problems, test cases, enrollments, and submissions under this course are also deleted
- This is handled by the database cascade if `ondelete="CASCADE"` is set on FK constraints, or handled explicitly in the service

**Response `204` No Content.**

---

## Enrollment Endpoints

### `GET /courses/:courseId/students`

List all students enrolled in a course. **Lecturer only, must own the course.**

**Response `200`:**
```json
[
  {
    "user_id": 12,
    "name": "Ama Owusu",
    "email": "ama@knust.edu.gh",
    "enrolled_at": "2026-02-01T08:00:00Z"
  }
]
```

---

### `POST /courses/:courseId/students`

Enroll a student by email. **Lecturer only, must own the course.**

**Request body:**
```json
{ "email": "ama@knust.edu.gh" }
```

**Logic:**
1. Look up user by email → `404` with message "No student found with that email" if not found
2. Verify the user's role is `student` → `400` if they are a lecturer
3. Check for existing enrollment → `409` if already enrolled
4. Insert `Enrollment` row
5. Return `201` with enrollment details

**Response `201`:**
```json
{
  "user_id": 12,
  "name": "Ama Owusu",
  "email": "ama@knust.edu.gh",
  "enrolled_at": "2026-02-01T08:00:00Z"
}
```

**Errors:**
- `404` — email not found
- `400` — target user is not a student
- `409` — already enrolled

---

### `DELETE /courses/:courseId/students/:userId`

Remove a student from a course. **Lecturer only, must own the course.**

**Logic:**
1. Verify course ownership
2. Find the `Enrollment` row → `404` if not found
3. Delete the row

**Response `204` No Content.**

---

## Service (`app/services/course_service.py`)

Key queries to implement:

```python
# Get courses for a lecturer
select(Course).where(Course.lecturer_id == user_id)

# Get courses for a student (via enrollments)
select(Course).join(Enrollment).where(Enrollment.user_id == student_id)

# Verify course ownership
course = await db.get(Course, course_id)
if not course:
    raise NotFoundError("Course")
if course.lecturer_id != current_user.id:
    raise ForbiddenError()

# Enrollment lookup
select(Enrollment).where(
    Enrollment.user_id == user_id,
    Enrollment.course_id == course_id
)
```

---

## Access Guard Pattern

Both courses and enrollment endpoints need two checks:

1. **Does the resource exist?** → `404`
2. **Does the caller have rights to it?** → `403`

For lecturers this means `course.lecturer_id == current_user.id`.  
For students this means an `Enrollment` row exists linking them to the course.

This logic should live in a reusable helper in `course_service.py`:

```python
async def assert_lecturer_owns_course(db, course_id, lecturer_id) -> Course:
    course = await db.get(Course, course_id)
    if not course:
        raise NotFoundError("Course")
    if course.lecturer_id != lecturer_id:
        raise ForbiddenError()
    return course

async def assert_student_enrolled(db, course_id, student_id) -> Course:
    course = await db.get(Course, course_id)
    if not course:
        raise NotFoundError("Course")
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id,
            Enrollment.user_id == student_id,
        )
    )
    if not result.scalar_one_or_none():
        raise ForbiddenError()
    return course
```

---

## Schemas (`app/schemas/course.py`)

```python
class CourseCreate(BaseModel):
    title:       str
    language:    CourseLanguage
    description: str | None = None

class CourseUpdate(BaseModel):
    title:       str | None = None
    language:    CourseLanguage | None = None
    description: str | None = None

class CourseResponse(BaseModel):
    id:               int
    title:            str
    language:         str
    description:      str | None
    lecturer_id:      int
    lecturer_name:    str
    student_count:    int
    assessment_count: int
    created_at:       datetime

    model_config = ConfigDict(from_attributes=True)

class EnrollRequest(BaseModel):
    email: EmailStr

class EnrollmentResponse(BaseModel):
    user_id:     int
    name:        str
    email:       str
    enrolled_at: datetime
```

---

## Out of Scope

- Student self-enrollment via join codes
- Multiple lecturers per course
- Course archiving / soft-delete
- Bulk enrollment via CSV upload

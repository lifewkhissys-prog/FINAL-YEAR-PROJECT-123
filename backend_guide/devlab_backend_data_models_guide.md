# DevLab Backend Guide — Data Models

**ORM:** SQLAlchemy (async)  
**Database:** PostgreSQL  
**All models live in:** `app/models/`

---

## Overview

Every model inherits from `Base` (defined in `app/database.py`). Use `Mapped` and `mapped_column` (SQLAlchemy 2.x style) throughout. Primary keys are integers. All timestamps are UTC.

```python
# Common imports used across all models
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
```

---

## `User` (`app/models/user.py`)

```python
class UserRole(str, enum.Enum):
    student  = "student"
    lecturer = "lecturer"

class User(Base):
    __tablename__ = "users"

    id:            Mapped[int]      = mapped_column(Integer, primary_key=True)
    name:          Mapped[str]      = mapped_column(String(255), nullable=False)
    email:         Mapped[str]      = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str]      = mapped_column(String(255), nullable=False)
    role:          Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    courses:     Mapped[list["Course"]]     = relationship("Course", back_populates="lecturer")
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="student")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="student")
```

---

## `Course` (`app/models/course.py`)

```python
class CourseLanguage(str, enum.Enum):
    python   = "python"
    java     = "java"
    cpp      = "cpp"
    sql      = "sql"
    html     = "html"

class Course(Base):
    __tablename__ = "courses"

    id:          Mapped[int]            = mapped_column(Integer, primary_key=True)
    title:       Mapped[str]            = mapped_column(String(255), nullable=False)
    language:    Mapped[CourseLanguage] = mapped_column(SAEnum(CourseLanguage), nullable=False)
    description: Mapped[str | None]     = mapped_column(Text, nullable=True)
    lecturer_id: Mapped[int]            = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lecturer:     Mapped["User"]          = relationship("User", back_populates="courses")
    enrollments:  Mapped[list["Enrollment"]]  = relationship("Enrollment", back_populates="course")
    assessments:  Mapped[list["Assessment"]]  = relationship("Assessment", back_populates="course")
```

---

## `Enrollment` (`app/models/enrollment.py`)

```python
class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id"),)

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    user_id:     Mapped[int]      = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id:   Mapped[int]      = mapped_column(ForeignKey("courses.id"), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student: Mapped["User"]   = relationship("User", back_populates="enrollments")
    course:  Mapped["Course"] = relationship("Course", back_populates="enrollments")
```

---

## `Assessment` (`app/models/assessment.py`)

```python
class Assessment(Base):
    __tablename__ = "assessments"

    id:            Mapped[int]      = mapped_column(Integer, primary_key=True)
    course_id:     Mapped[int]      = mapped_column(ForeignKey("courses.id"), nullable=False)
    title:         Mapped[str]      = mapped_column(String(255), nullable=False)
    duration_secs: Mapped[int]      = mapped_column(Integer, nullable=False)  # derived, stored for convenience
    starts_at:     Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at:       Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    course:   Mapped["Course"]        = relationship("Course", back_populates="assessments")
    problems: Mapped[list["Problem"]] = relationship("Problem", back_populates="assessment")
```

---

## `Problem` (`app/models/problem.py`)

```python
class ProblemType(str, enum.Enum):
    guided    = "guided"
    challenge = "challenge"

class ProblemLanguage(str, enum.Enum):
    python = "python"
    java   = "java"
    cpp    = "cpp"
    sql    = "sql"
    html   = "html"

class Problem(Base):
    __tablename__ = "problems"

    id:               Mapped[int]             = mapped_column(Integer, primary_key=True)
    assessment_id:    Mapped[int]             = mapped_column(ForeignKey("assessments.id"), nullable=False)
    title:            Mapped[str]             = mapped_column(String(255), nullable=False)
    type:             Mapped[ProblemType]     = mapped_column(SAEnum(ProblemType), nullable=False)
    language:         Mapped[ProblemLanguage] = mapped_column(SAEnum(ProblemLanguage), nullable=False)
    content:          Mapped[str]             = mapped_column(Text, nullable=False)
    # content is a JSON string:
    #   challenge → { description: str, starterCode: str }
    #   guided    → { blocks: [{ type, content, starterCode?, expectedOutput?, hint? }] }
    time_limit_ms:    Mapped[int]             = mapped_column(Integer, default=2000)
    memory_limit_mb:  Mapped[int]             = mapped_column(Integer, default=256)
    created_at:       Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assessment:  Mapped["Assessment"]      = relationship("Assessment", back_populates="problems")
    test_cases:  Mapped[list["TestCase"]]  = relationship("TestCase",  back_populates="problem", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="problem")
```

---

## `TestCase` (`app/models/test_case.py`)

```python
class TestCase(Base):
    __tablename__ = "test_cases"

    id:              Mapped[int]       = mapped_column(Integer, primary_key=True)
    problem_id:      Mapped[int]       = mapped_column(ForeignKey("problems.id"), nullable=False)
    stdin:           Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_stdout: Mapped[str]       = mapped_column(Text, nullable=False)
    is_hidden:       Mapped[bool]      = mapped_column(Boolean, default=False)
    position:        Mapped[int]       = mapped_column(Integer, default=0)  # display order

    # Relationships
    problem: Mapped["Problem"] = relationship("Problem", back_populates="test_cases")
    results: Mapped[list["TestResult"]] = relationship("TestResult", back_populates="test_case")
```

---

## `Submission` (`app/models/submission.py`)

```python
class SubmissionStatus(str, enum.Enum):
    pending   = "pending"
    running   = "running"
    completed = "completed"
    error     = "error"

class Submission(Base):
    __tablename__ = "submissions"

    id:           Mapped[int]              = mapped_column(Integer, primary_key=True)
    user_id:      Mapped[int]              = mapped_column(ForeignKey("users.id"), nullable=False)
    problem_id:   Mapped[int]              = mapped_column(ForeignKey("problems.id"), nullable=False)
    code:         Mapped[str]             = mapped_column(Text, nullable=False)
    language:     Mapped[str]             = mapped_column(String(20), nullable=False)
    status:       Mapped[SubmissionStatus] = mapped_column(SAEnum(SubmissionStatus), default="pending")
    score:        Mapped[int]             = mapped_column(Integer, default=0)
    is_graded:    Mapped[bool]            = mapped_column(Boolean, default=False)
    # is_graded = True → submitted during an active assessment window (counts in gradebook)
    # is_graded = False → practice run or /submissions/run call
    submitted_at: Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student:  Mapped["User"]            = relationship("User", back_populates="submissions")
    problem:  Mapped["Problem"]         = relationship("Problem", back_populates="submissions")
    results:  Mapped[list["TestResult"]] = relationship("TestResult", back_populates="submission", cascade="all, delete-orphan")
```

---

## `TestResult` (`app/models/test_result.py`)

```python
class TestResult(Base):
    __tablename__ = "test_results"

    id:             Mapped[int]      = mapped_column(Integer, primary_key=True)
    submission_id:  Mapped[int]      = mapped_column(ForeignKey("submissions.id"), nullable=False)
    test_case_id:   Mapped[int]      = mapped_column(ForeignKey("test_cases.id"), nullable=False)
    passed:         Mapped[bool]     = mapped_column(Boolean, nullable=False)
    actual_stdout:  Mapped[str]      = mapped_column(Text, nullable=False)
    exec_time_ms:   Mapped[int]      = mapped_column(Integer, nullable=False)
    stderr:         Mapped[str|None] = mapped_column(Text, nullable=True)

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="results")
    test_case:  Mapped["TestCase"]   = relationship("TestCase", back_populates="results")
```

---

## Relationships Summary

```
User ──< Course (lecturer_id)
User ──< Enrollment >── Course
User ──< Submission
Course ──< Assessment
Assessment ──< Problem
Problem ──< TestCase
Problem ──< Submission
Submission ──< TestResult >── TestCase
```

---

## Notes on the `content` Field

`Problem.content` stores a JSON string. Deserialise it in the service layer, never in the ORM model.

**Challenge format:**
```json
{
  "description": "# Fizz Buzz\n\nWrite a function...",
  "starterCode": "def solution(n):\n    pass"
}
```

**Guided format:**
```json
{
  "blocks": [
    { "type": "narrative", "content": "## The Setup\n\nYou are a data analyst..." },
    { "type": "editor", "id": "block_1", "starterCode": "SELECT ...", "expectedOutput": "42", "hint": "Try GROUP BY" },
    { "type": "narrative", "content": "Good work. Now let's go further..." }
  ]
}
```

`expectedOutput` in guided blocks is stored here (not as a `TestCase` row) because guided blocks have a single inline check, not a test suite.

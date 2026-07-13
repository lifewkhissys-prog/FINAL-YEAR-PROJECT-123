from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from app.models.course import CourseLanguage

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

    model_config = ConfigDict(from_attributes=True)

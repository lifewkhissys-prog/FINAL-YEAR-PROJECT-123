import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

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
    lecturer_id: Mapped[int]            = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    join_code:   Mapped[str | None]     = mapped_column(String(50), unique=True, nullable=True)
    created_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lecturer:     Mapped["User"]          = relationship("User", back_populates="courses")
    enrollments:  Mapped[list["Enrollment"]]  = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    assessments:  Mapped[list["Assessment"]]  = relationship("Assessment", back_populates="course", cascade="all, delete-orphan")

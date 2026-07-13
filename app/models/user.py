import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

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

import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class SubmissionStatus(str, enum.Enum):
    pending   = "pending"
    running   = "running"
    completed = "completed"
    error     = "error"

class Submission(Base):
    __tablename__ = "submissions"

    id:           Mapped[int]              = mapped_column(Integer, primary_key=True)
    user_id:      Mapped[int]              = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id:   Mapped[int]              = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    code:         Mapped[str]             = mapped_column(Text, nullable=False)
    language:     Mapped[str]             = mapped_column(String(20), nullable=False)
    status:       Mapped[SubmissionStatus] = mapped_column(SAEnum(SubmissionStatus), default="pending")
    score:        Mapped[int]             = mapped_column(Integer, default=0)
    is_graded:    Mapped[bool]            = mapped_column(Boolean, default=False)
    # is_graded = True -> submitted during an active assessment window (counts in gradebook)
    # is_graded = False -> practice run or /submissions/run call
    submitted_at: Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student:  Mapped["User"]            = relationship("User", back_populates="submissions")
    problem:  Mapped["Problem"]         = relationship("Problem", back_populates="submissions")
    results:  Mapped[list["TestResult"]] = relationship("TestResult", back_populates="submission", cascade="all, delete-orphan")

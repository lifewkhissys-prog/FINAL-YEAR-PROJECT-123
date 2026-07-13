from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class Assessment(Base):
    __tablename__ = "assessments"

    id:            Mapped[int]      = mapped_column(Integer, primary_key=True)
    course_id:     Mapped[int]      = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title:         Mapped[str]      = mapped_column(String(255), nullable=False)
    duration_secs: Mapped[int]      = mapped_column(Integer, nullable=False)  # derived, stored for convenience
    starts_at:     Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at:       Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    course:   Mapped["Course"]        = relationship("Course", back_populates="assessments")
    problems: Mapped[list["Problem"]] = relationship("Problem", back_populates="assessment", cascade="all, delete-orphan")

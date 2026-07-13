from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id"),)

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    user_id:     Mapped[int]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id:   Mapped[int]      = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student: Mapped["User"]   = relationship("User", back_populates="enrollments")
    course:  Mapped["Course"] = relationship("Course", back_populates="enrollments")

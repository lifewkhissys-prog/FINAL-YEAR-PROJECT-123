import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class CritiqueStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class ThesisCritique(Base):
    __tablename__ = "thesis_critiques"

    id:             Mapped[int]            = mapped_column(Integer, primary_key=True)
    lecturer_id:    Mapped[int]            = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    candidate_name: Mapped[str]            = mapped_column(String(255), nullable=False)
    programme:      Mapped[str]            = mapped_column(String(255), nullable=False)
    thesis_title:   Mapped[str]            = mapped_column(String(255), nullable=False)
    filename:       Mapped[str]            = mapped_column(String(255), nullable=False)
    status:         Mapped[CritiqueStatus] = mapped_column(SAEnum(CritiqueStatus), default="pending")
    report_json:    Mapped[str | None]     = mapped_column(Text, nullable=True) # JSON representation of the final review report
    created_at:     Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship to User (Lecturer)
    lecturer: Mapped["User"] = relationship("User")

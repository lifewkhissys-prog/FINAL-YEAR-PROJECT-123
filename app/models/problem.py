import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

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
    assessment_id:    Mapped[int]             = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    title:            Mapped[str]             = mapped_column(String(255), nullable=False)
    type:             Mapped[ProblemType]     = mapped_column(SAEnum(ProblemType), nullable=False)
    language:         Mapped[ProblemLanguage] = mapped_column(SAEnum(ProblemLanguage), nullable=False)
    content:          Mapped[str]             = mapped_column(Text, nullable=False)
    # content is a JSON string:
    #   challenge -> { description: str, starterCode: str }
    #   guided    -> { blocks: [{ type, content, starterCode?, expectedOutput?, hint? }] }
    time_limit_ms:    Mapped[int]             = mapped_column(Integer, default=2000)
    memory_limit_mb:  Mapped[int]             = mapped_column(Integer, default=256)
    created_at:       Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assessment:  Mapped["Assessment"]      = relationship("Assessment", back_populates="problems")
    test_cases:  Mapped[list["TestCase"]]  = relationship("TestCase",  back_populates="problem", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="problem", cascade="all, delete-orphan")

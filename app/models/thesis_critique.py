import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base


class SubmissionStatus(str, enum.Enum):
    pending = "pending"
    assessing = "assessing"
    completed = "completed"
    reviewed = "reviewed"


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True)
    name:        Mapped[str]      = mapped_column(String(255), nullable=False)
    description: Mapped[str]      = mapped_column(Text, nullable=False)
    weight:      Mapped[float]    = mapped_column(Float, nullable=False)
    level_1_desc: Mapped[str]     = mapped_column(Text, nullable=False)
    level_3_desc: Mapped[str]     = mapped_column(Text, nullable=False)
    level_5_desc: Mapped[str]     = mapped_column(Text, nullable=False)
    embedding                     = mapped_column(Vector(384), nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    graded_examples:    Mapped[list["GradedExample"]]    = relationship("GradedExample", back_populates="criterion", cascade="all, delete-orphan")
    assessment_results: Mapped[list["AssessmentResult"]]  = relationship("AssessmentResult", back_populates="criterion")


class GradedExample(Base):
    __tablename__ = "graded_examples"

    id:             Mapped[int]           = mapped_column(Integer, primary_key=True)
    criterion_id:   Mapped[int]           = mapped_column(ForeignKey("rubric_criteria.id"), nullable=False)
    excerpt:        Mapped[str]           = mapped_column(Text, nullable=False)
    assigned_score: Mapped[int]           = mapped_column(Integer, nullable=False)
    justification:  Mapped[str | None]    = mapped_column(Text, nullable=True)
    embedding                             = mapped_column(Vector(384), nullable=True)
    created_at:     Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())

    criterion: Mapped["RubricCriterion"] = relationship("RubricCriterion", back_populates="graded_examples")


class ThesisSubmission(Base):
    __tablename__ = "thesis_submissions"

    id:                      Mapped[int]        = mapped_column(Integer, primary_key=True)
    lecturer_id:             Mapped[int]        = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_name:            Mapped[str | None] = mapped_column(String(255), nullable=True)
    title:                   Mapped[str | None] = mapped_column(String(500), nullable=True)
    programme:               Mapped[str | None] = mapped_column(String(255), nullable=True)
    institution:             Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path:               Mapped[str]        = mapped_column(String(500), nullable=False)
    full_text:               Mapped[str]        = mapped_column(Text, nullable=False)
    narrative_report:        Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative_report_edited: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at:            Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())
    status:                  Mapped[SubmissionStatus] = mapped_column(SAEnum(SubmissionStatus, name="thesis_submission_status"), default=SubmissionStatus.pending)

    lecturer:           Mapped["User"]                  = relationship("User")
    assessment_results: Mapped[list["AssessmentResult"]] = relationship("AssessmentResult", back_populates="submission", cascade="all, delete-orphan")


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id:                       Mapped[int]        = mapped_column(Integer, primary_key=True)
    submission_id:            Mapped[int]        = mapped_column(ForeignKey("thesis_submissions.id", ondelete="CASCADE"), nullable=False)
    criterion_id:             Mapped[int]        = mapped_column(ForeignKey("rubric_criteria.id"), nullable=False)
    ai_score:                 Mapped[int]        = mapped_column(Integer, nullable=False)
    ai_justification:         Mapped[str]        = mapped_column(Text, nullable=False)
    cited_text:               Mapped[str | None] = mapped_column(Text, nullable=True)
    verifier_passed:          Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    verifier_notes:           Mapped[str | None] = mapped_column(Text, nullable=True)
    supervisor_override_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    supervisor_notes:         Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at:               Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())

    submission: Mapped["ThesisSubmission"] = relationship("ThesisSubmission", back_populates="assessment_results")
    criterion:  Mapped["RubricCriterion"]  = relationship("RubricCriterion", back_populates="assessment_results")

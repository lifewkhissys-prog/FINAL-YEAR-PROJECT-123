import enum
from datetime import datetime
from typing import Optional, List, Any
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

try:
    from pgvector.sqlalchemy import Vector
    VectorType = Vector(384)
except ImportError:
    VectorType = JSON


class SubmissionStatus(str, enum.Enum):
    pending = "pending"
    preliminary_check_failed = "preliminary_check_failed"
    assessing = "assessing"
    failed = "failed"
    completed = "completed"
    reviewed = "reviewed"


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id:              Mapped[int]          = mapped_column(Integer, primary_key=True)
    degree_level:    Mapped[str]          = mapped_column(String(50), default="mphil")  # undergraduate | msc | mphil | phd
    assessment_type: Mapped[str]          = mapped_column(String(20), default="thesis") # thesis | oral
    name:            Mapped[str]          = mapped_column(String(255), nullable=False)
    description:     Mapped[str]          = mapped_column(Text, nullable=False)
    max_marks:       Mapped[float]        = mapped_column(Float, nullable=False)
    source:          Mapped[str | None]   = mapped_column(String(255), nullable=True)
    embedding                             = mapped_column(VectorType, nullable=True)
    created_at:      Mapped[datetime]     = mapped_column(DateTime(timezone=True), server_default=func.now())

    sub_criteria: Mapped[List["RubricSubCriterion"]] = relationship("RubricSubCriterion", back_populates="criterion", cascade="all, delete-orphan")



class RubricSubCriterion(Base):
    __tablename__ = "rubric_sub_criteria"

    id:              Mapped[int]        = mapped_column(Integer, primary_key=True)
    criterion_id:    Mapped[int]        = mapped_column(ForeignKey("rubric_criteria.id", ondelete="CASCADE"), nullable=False)
    name:            Mapped[str]        = mapped_column(String(255), nullable=False)
    description:     Mapped[str]        = mapped_column(Text, nullable=False)
    max_marks:       Mapped[float]      = mapped_column(Float, nullable=False)
    level_low_desc:  Mapped[str]        = mapped_column(Text, nullable=False)
    level_mid_desc:  Mapped[str]        = mapped_column(Text, nullable=False)
    level_high_desc: Mapped[str]        = mapped_column(Text, nullable=False)
    embedding                           = mapped_column(VectorType, nullable=True)
    created_at:      Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())

    criterion:          Mapped["RubricCriterion"]         = relationship("RubricCriterion", back_populates="sub_criteria")
    graded_examples:    Mapped[List["GradedExample"]]    = relationship("GradedExample", back_populates="sub_criterion", cascade="all, delete-orphan")
    assessment_results: Mapped[List["AssessmentResult"]] = relationship("AssessmentResult", back_populates="sub_criterion")
    chapter_mappings:   Mapped[List["ChapterSubCriteriaMap"]] = relationship("ChapterSubCriteriaMap", back_populates="sub_criterion", cascade="all, delete-orphan")


class ChapterSubCriteriaMap(Base):
    __tablename__ = "chapter_sub_criteria_map"

    id:               Mapped[int]  = mapped_column(Integer, primary_key=True)
    chapter_name:     Mapped[str]  = mapped_column(String(100), nullable=False) # introduction | literature_review | methodology | data_analysis | results | discussion | conclusion | references
    sub_criterion_id: Mapped[int]  = mapped_column(ForeignKey("rubric_sub_criteria.id", ondelete="CASCADE"), nullable=False)
    is_primary:       Mapped[bool] = mapped_column(Boolean, default=True)

    sub_criterion: Mapped["RubricSubCriterion"] = relationship("RubricSubCriterion", back_populates="chapter_mappings")


class GradedExample(Base):
    __tablename__ = "graded_examples"

    id:               Mapped[int]        = mapped_column(Integer, primary_key=True)
    sub_criterion_id: Mapped[int]        = mapped_column(ForeignKey("rubric_sub_criteria.id", ondelete="CASCADE"), nullable=False)
    excerpt:          Mapped[str]        = mapped_column(Text, nullable=False)
    assigned_score:   Mapped[float]      = mapped_column(Float, nullable=False)
    justification:    Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding                            = mapped_column(VectorType, nullable=True)
    created_at:       Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())

    sub_criterion: Mapped["RubricSubCriterion"] = relationship("RubricSubCriterion", back_populates="graded_examples")


class ThesisSubmission(Base):
    __tablename__ = "thesis_submissions"

    id:                         Mapped[int]        = mapped_column(Integer, primary_key=True)
    lecturer_id:                Mapped[int | None] = mapped_column(Integer, nullable=True)
    student_name:               Mapped[str | None] = mapped_column(String(255), nullable=True)
    title:                      Mapped[str | None] = mapped_column(String(500), nullable=True)
    programme:                  Mapped[str | None] = mapped_column(String(255), nullable=True)
    institution:                Mapped[str | None] = mapped_column(String(255), nullable=True)
    degree_level:               Mapped[str]        = mapped_column(String(50), default="mphil")
    file_path:                  Mapped[str | None] = mapped_column(String(500), nullable=True)
    full_text:                  Mapped[str]        = mapped_column(Text, nullable=False)
    preliminary_check_passed:   Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    preliminary_check_notes:    Mapped[str | None] = mapped_column(Text, nullable=True)
    # Structured, reproducible findings from app.services.compliance_check (Guide Sections A/B/C/G).
    compliance_findings:        Mapped[Any | None] = mapped_column(JSON, nullable=True)
    # "monograph" (Guide Option 1) or "manuscript" (Option 2), detected from the chapter headings.
    structure_option:           Mapped[str | None] = mapped_column(String(20), nullable=True)
    error_detail:               Mapped[str | None] = mapped_column(Text, nullable=True)
    flow_analysis_table:        Mapped[str | None] = mapped_column(Text, nullable=True)
    plagiarism_score:           Mapped[float | None] = mapped_column(Float, nullable=True)
    plagiarism_report_url:      Mapped[str | None] = mapped_column(String(500), nullable=True)
    plagiarism_checked_at:      Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    narrative_report:           Mapped[str | None] = mapped_column(Text, nullable=True)
    narrative_report_edited:    Mapped[str | None] = mapped_column(Text, nullable=True)
    supervisor_recommendation:  Mapped[str | None] = mapped_column(String(100), nullable=True)
    submitted_at:               Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())
    status:                     Mapped[str]        = mapped_column(String(50), default="pending")
    pipeline_step:              Mapped[str | None] = mapped_column(String(100), nullable=True)
    pipeline_progress:          Mapped[int | None] = mapped_column(Integer, nullable=True)

    assessment_results: Mapped[List["AssessmentResult"]] = relationship("AssessmentResult", back_populates="submission", cascade="all, delete-orphan")
    plagiarism_checks:  Mapped[List["PlagiarismCheck"]]  = relationship("PlagiarismCheck", back_populates="submission", cascade="all, delete-orphan")


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id:                        Mapped[int]        = mapped_column(Integer, primary_key=True)
    submission_id:             Mapped[int]        = mapped_column(ForeignKey("thesis_submissions.id", ondelete="CASCADE"), nullable=False)
    sub_criterion_id:          Mapped[int]        = mapped_column(ForeignKey("rubric_sub_criteria.id", ondelete="CASCADE"), nullable=False)
    # Null when the evaluation did not complete. A missing mark must stay missing: substituting a
    # default here would put a mark on a supervisor's screen that no model ever produced.
    ai_score:                  Mapped[float | None] = mapped_column(Float, nullable=True)
    scoring_failed:            Mapped[bool | None]  = mapped_column(Boolean, default=False)
    error_detail:              Mapped[str | None]   = mapped_column(Text, nullable=True)
    ai_score_run_1:            Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_score_run_2:            Mapped[float | None] = mapped_column(Float, nullable=True)
    score_consistency_flag:    Mapped[bool | None]  = mapped_column(Boolean, default=False)
    ai_justification:          Mapped[str | None] = mapped_column(Text, nullable=True)
    cited_text:                Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score:          Mapped[float | None] = mapped_column(Float, nullable=True)
    verifier_passed:           Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    verifier_notes:            Mapped[str | None] = mapped_column(Text, nullable=True)
    supervisor_override_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    supervisor_notes:          Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at:                Mapped[datetime]   = mapped_column(DateTime(timezone=True), server_default=func.now())

    submission:    Mapped["ThesisSubmission"]   = relationship("ThesisSubmission", back_populates="assessment_results")
    sub_criterion: Mapped["RubricSubCriterion"] = relationship("RubricSubCriterion", back_populates="assessment_results")


class PlagiarismCheck(Base):
    __tablename__ = "plagiarism_checks"

    id:                    Mapped[int]          = mapped_column(Integer, primary_key=True)
    submission_id:         Mapped[int]          = mapped_column(ForeignKey("thesis_submissions.id", ondelete="CASCADE"), nullable=False)
    section_name:          Mapped[str | None]   = mapped_column(String(100), nullable=True)
    similarity_percentage: Mapped[float]        = mapped_column(Float, nullable=False)
    matched_sources:       Mapped[Any | None]   = mapped_column(JSON, nullable=True)
    provider:              Mapped[str]          = mapped_column(String(50), default="copyleaks")
    checked_at:            Mapped[datetime]     = mapped_column(DateTime(timezone=True), server_default=func.now())

    submission: Mapped["ThesisSubmission"] = relationship("ThesisSubmission", back_populates="plagiarism_checks")

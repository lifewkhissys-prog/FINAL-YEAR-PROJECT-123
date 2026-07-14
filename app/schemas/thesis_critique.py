from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


# ── Rubric Criteria ──────────────────────────────────────────────────────────

class RubricCriterionCreate(CamelModel):
    name: str
    description: str
    weight: float = Field(ge=0, le=1)
    level_1_desc: str
    level_3_desc: str
    level_5_desc: str

class RubricCriterionUpdate(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight: Optional[float] = Field(default=None, ge=0, le=1)
    level_1_desc: Optional[str] = None
    level_3_desc: Optional[str] = None
    level_5_desc: Optional[str] = None

class RubricCriterionResponse(CamelModel):
    id: int
    name: str
    description: str
    weight: float
    level_1_desc: str
    level_3_desc: str
    level_5_desc: str
    created_at: datetime


# ── Graded Examples ──────────────────────────────────────────────────────────

class GradedExampleCreate(CamelModel):
    criterion_id: int
    excerpt: str
    assigned_score: int = Field(ge=1, le=5)
    justification: Optional[str] = None

class GradedExampleResponse(CamelModel):
    id: int
    criterion_id: int
    excerpt: str
    assigned_score: int
    justification: Optional[str] = None
    created_at: datetime


# ── Thesis Submissions ───────────────────────────────────────────────────────

class ThesisSubmissionResponse(CamelModel):
    id: int
    student_name: Optional[str] = None
    title: Optional[str] = None
    programme: Optional[str] = None
    institution: Optional[str] = None
    file_path: str
    status: str
    submitted_at: datetime
    narrative_report: Optional[str] = None
    narrative_report_edited: Optional[str] = None


# ── Assessment Results ────────────────────────────────────────────────────────

class AssessmentResultResponse(CamelModel):
    id: int
    submission_id: int
    criterion_id: int
    criterion_name: Optional[str] = None
    criterion_weight: Optional[float] = None
    ai_score: int
    ai_justification: str
    cited_text: Optional[str] = None
    verifier_passed: Optional[bool] = None
    verifier_notes: Optional[str] = None
    supervisor_override_score: Optional[int] = None
    supervisor_notes: Optional[str] = None
    created_at: datetime


class SupervisorOverrideRequest(CamelModel):
    supervisor_override_score: int = Field(ge=1, le=5)
    supervisor_notes: Optional[str] = None


class NarrativeReportUpdate(CamelModel):
    narrative_report_edited: str


# ── Aggregated submission detail (results + report) ──────────────────────────

class SubmissionDetailResponse(CamelModel):
    submission: ThesisSubmissionResponse
    results: list[AssessmentResultResponse] = []
    weighted_score: Optional[float] = None
    scaled_score: Optional[float] = None

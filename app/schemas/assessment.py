from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from datetime import datetime

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class AssessmentCreate(CamelModel):
    course_id: int
    title:     str
    starts_at: datetime
    ends_at:   datetime

    @model_validator(mode="after")
    def ends_after_starts(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("endsAt must be after startsAt")
        return self

class AssessmentUpdate(CamelModel):
    title:     str | None = None
    starts_at: datetime | None = None
    ends_at:   datetime | None = None

class AssessmentProblemSummary(CamelModel):
    id:       int
    title:    str
    type:     str
    language: str

class AssessmentResponse(CamelModel):
    id:            int
    course_id:     int
    course_name:   str
    title:         str
    starts_at:     datetime
    ends_at:       datetime
    duration_secs: int
    status:        str        # "scheduled" | "active" | "ended" — computed
    problems:      list[AssessmentProblemSummary] = []
    created_at:    datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from app.models.problem import ProblemType, ProblemLanguage
from app.schemas.test_case import TestCaseResponse

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class ProblemCreate(CamelModel):
    assessment_id:   int
    title:           str
    type:            ProblemType
    language:        ProblemLanguage
    content:         dict          # Description, starterCode, blocks, etc.
    time_limit_ms:   int = 2000
    memory_limit_mb: int = 256

class ProblemUpdate(CamelModel):
    title:           str | None = None
    content:         dict | None = None
    time_limit_ms:   int | None = None
    memory_limit_mb: int | None = None

class AssessmentContext(CamelModel):
    is_assessment:      bool
    assessment_ends_at: str | None = None

class PersonalBestScore(CamelModel):
    score: int
    total: int

class PracticeProblemResponse(CamelModel):
    id:               int
    title:            str
    type:             ProblemType
    language:         ProblemLanguage
    assessment_title: str
    personal_best:    PersonalBestScore | None = None

class ProblemResponse(CamelModel):
    id:                 int
    assessment_id:      int
    title:              str
    type:               ProblemType
    language:           ProblemLanguage
    content:            dict
    time_limit_ms:      int
    memory_limit_mb:    int
    test_cases:         list[TestCaseResponse] = []
    assessment_context: AssessmentContext | None = None

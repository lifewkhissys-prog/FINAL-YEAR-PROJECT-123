from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class RunRequest(CamelModel):
    problem_id: int
    code:       str
    language:   str
    block_id:   str | None = None

class SubmitRequest(CamelModel):
    problem_id: int
    code:       str
    language:   str

class TestCaseResultResponse(CamelModel):
    test_case_id:    int | None
    passed:          bool
    stdin:           str | None
    expected_stdout: str | None    # Stripped for hidden test cases for student view
    actual_stdout:   str
    exec_time_ms:    int
    is_hidden:       bool
    stderr:          str | None = None

class SubmissionResultResponse(CamelModel):
    submission_id: int | None
    status:        str           # "completed" | "error"
    score:         int
    total_cases:   int
    results:       list[TestCaseResultResponse]

class SubmissionSummary(CamelModel):
    id:           int
    problem_id:   int
    language:     str
    score:        int
    total_cases:  int
    status:       str
    is_graded:    bool
    submitted_at: datetime
    problem_title: str | None = None
    course_id:    int | None = None
    course_name:  str | None = None

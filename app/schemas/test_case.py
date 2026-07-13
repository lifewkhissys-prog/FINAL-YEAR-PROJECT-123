from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class TestCaseIn(CamelModel):
    stdin:           str | None = None
    expected_stdout: str
    is_hidden:       bool = False
    position:        int  = 0

class TestCaseResponse(CamelModel):
    id:              int
    stdin:           str | None
    expected_stdout: str | None  # May be stripped (None) for student hidden cases
    is_hidden:       bool
    position:        int

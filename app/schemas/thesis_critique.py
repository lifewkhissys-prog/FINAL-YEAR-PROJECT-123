from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from app.models.thesis_critique import CritiqueStatus

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class ThesisCritiqueResponse(CamelModel):
    id:             int
    candidate_name: str
    programme:      str
    thesis_title:   str
    filename:       str
    status:         CritiqueStatus
    created_at:     datetime
    report_json:    dict | None = None

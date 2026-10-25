from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from ..schemas import RequestCreate
class AnalysisResult(BaseModel):
    model_config=ConfigDict(extra='forbid')
    classification:Literal['request','update','uncertain','irrelevant']
    events:list[RequestCreate]=Field(default_factory=list,max_length=20)
    review_reasons:list[str]=Field(default_factory=list)
    source_excerpts:list[str]=Field(default_factory=list)
    # Explicitly supplied fields keep a follow-up email from replacing omitted data.
    event_fields:list[list[str]]=Field(default_factory=list, max_length=20)
    schedule_parts:list[dict[str,str]]=Field(default_factory=list, max_length=20)
    update_review_reasons:list[str]=Field(default_factory=list)

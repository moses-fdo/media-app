from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from ..schemas import RequestCreate
class AnalysisResult(BaseModel):
    model_config=ConfigDict(extra='forbid')
    classification:Literal['request','update','uncertain','irrelevant']
    events:list[RequestCreate]=Field(default_factory=list,max_length=20)
    review_reasons:list[str]=Field(default_factory=list)
    source_excerpts:list[str]=Field(default_factory=list)

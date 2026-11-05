from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator, ConfigDict


class TextModerationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Text content to moderate")


class DecisionUpdateRequest(BaseModel):
    decision: str = Field(..., description="Moderator decision: 'approved' or 'rejected'")

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("approved", "rejected"):
            raise ValueError("Decision must be either 'approved' or 'rejected'")
        return clean


class ModerationResultResponse(BaseModel):
    id: int
    content_type: str
    content: str
    preview_url: Optional[str] = None
    risk_score: float
    status: str
    confidence_score: float
    categories: List[str]
    details: Dict[str, Any] = Field(default_factory=dict)
    moderator_decision: Optional[str] = None
    created_at: datetime
    educational_disclaimer: str = (
        "SafeCheck is an educational automated moderation tool. "
        "Automated scores can produce false positives or negatives; human review is required for high-risk decisions."
    )

    model_config = ConfigDict(from_attributes=True)


class HistoryStats(BaseModel):
    total: int = 0
    safe_count: int = 0
    flagged_count: int = 0
    blocked_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0


class HistoryResponse(BaseModel):
    items: List[ModerationResultResponse]
    stats: HistoryStats

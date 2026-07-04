from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class ChipType(str, Enum):
    PASS = "pass"
    ATTEMPT = "attempt"
    DOWNGRADE = "downgrade"


class ItemParamsSchema(BaseModel):
    item_id: str
    competency: str
    difficulty: float = Field(ge=-3.5, le=3.5)
    discrimination: float = Field(default=1.0, ge=0.1, le=3.0)
    level: int = Field(default=1, ge=1, le=5)


class CompetencyStateSchema(BaseModel):
    competency: str
    theta: float = 0.0
    standard_error: float = 1.0
    current_level: int = 2
    response_count: int = 0


class SessionInitRequest(BaseModel):
    session_id: str
    competencies: list[str]
    item_pool: list[ItemParamsSchema]
    prior_theta: dict[str, float] = Field(default_factory=dict)
    focus_competency: str | None = None
    mode: Literal["competency", "full"] = "competency"
    min_items: int = Field(default=2, ge=1, le=10)
    max_items: int = Field(default=3, ge=1, le=20)


class SessionInitResponse(BaseModel):
    session_id: str
    competency_states: dict[str, CompetencyStateSchema]
    next_item: NextItemResponse | None = None


class SubmitResponseRequest(BaseModel):
    session_id: str
    item_id: str
    competency: str
    rubric_score: float = Field(ge=0.0, le=1.0)
    item_pool: list[ItemParamsSchema]
    administered_ids: list[str]
    competency_states: dict[str, CompetencyStateSchema]
    focus_competency: str | None = None
    mode: Literal["competency", "full"] = "competency"
    min_items: int = Field(default=2, ge=1, le=10)
    max_items: int = Field(default=3, ge=1, le=20)


class ChipEvent(BaseModel):
    competency: str
    level: int
    chip_type: ChipType
    rubric_score: float
    brief_feedback: str = ""


class NextItemResponse(BaseModel):
    item_id: str
    competency: str
    level: int
    target_level: int
    difficulty: float
    expected_information: float


class SubmitResponseResult(BaseModel):
    competency_states: dict[str, CompetencyStateSchema]
    chip_event: ChipEvent
    next_item: NextItemResponse | None = None
    should_terminate: bool = False
    total_items: int = 0


class SessionSummaryRequest(BaseModel):
    session_id: str
    competency_states: dict[str, CompetencyStateSchema]


class CompetencySummary(BaseModel):
    competency: str
    theta: float
    standard_error: float
    level_estimate: int
    percentile: float


class SessionSummaryResponse(BaseModel):
    session_id: str
    competencies: list[CompetencySummary]
    overall_theta: float


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str = "irt-engine"
    version: str = "0.1.0"

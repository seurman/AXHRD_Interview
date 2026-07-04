"""IRT Engine API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.irt_2pl import (
    CompetencyState,
    ItemParams,
    adjust_level_after_response,
    level_from_difficulty,
    score_to_binary,
    update_theta_eap,
)
from app.core.selector import (
    select_next_item,
    should_terminate_competency_session,
    should_terminate_session,
)
from app.models.schemas import (
    ChipEvent,
    ChipType,
    CompetencyStateSchema,
    CompetencySummary,
    HealthResponse,
    ItemParamsSchema,
    NextItemResponse,
    SessionInitRequest,
    SessionInitResponse,
    SessionSummaryRequest,
    SessionSummaryResponse,
    SubmitResponseRequest,
    SubmitResponseResult,
)

router = APIRouter()

# In-memory session store (production: Redis or DB)
_sessions: dict[str, dict] = {}


def _item_from_schema(s: ItemParamsSchema) -> ItemParams:
    return ItemParams(
        item_id=s.item_id,
        competency=s.competency,
        difficulty=s.difficulty,
        discrimination=s.discrimination,
        level=s.level,
    )


def _state_from_schema(s: CompetencyStateSchema) -> CompetencyState:
    return CompetencyState(
        competency=s.competency,
        theta=s.theta,
        standard_error=s.standard_error,
        current_level=s.current_level,
    )


def _state_to_schema(state: CompetencyState) -> CompetencyStateSchema:
    return CompetencyStateSchema(
        competency=state.competency,
        theta=round(state.theta, 4),
        standard_error=round(state.standard_error, 4),
        current_level=state.current_level,
        response_count=len(state.responses),
    )


def _theta_to_percentile(theta: float) -> float:
    """Approximate percentile from standard normal CDF."""
    import math

    return round(50.0 * (1.0 + math.erf(theta / math.sqrt(2.0))), 1)


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/session/init", response_model=SessionInitResponse)
async def init_session(req: SessionInitRequest) -> SessionInitResponse:
    states: dict[str, CompetencyState] = {}
    for comp in req.competencies:
        prior = req.prior_theta.get(comp, 0.0)
        states[comp] = CompetencyState(
            competency=comp,
            theta=prior,
            standard_error=1.0,
            current_level=2,
        )

    item_pool = [_item_from_schema(i) for i in req.item_pool]
    administered: set[str] = set()

    focus = req.focus_competency if req.mode == "competency" else None
    next_item = select_next_item(
        states,
        item_pool,
        administered,
        target_competency=focus,
        max_items_per_competency=req.max_items if req.mode == "competency" else 4,
        lock_competency=req.mode == "competency",
    )

    _sessions[req.session_id] = {
        "states": states,
        "item_pool": item_pool,
        "administered": administered,
        "responses": [],
        "mode": req.mode,
        "focus_competency": focus,
        "min_items": req.min_items,
        "max_items": req.max_items,
    }

    return SessionInitResponse(
        session_id=req.session_id,
        competency_states={k: _state_to_schema(v) for k, v in states.items()},
        next_item=next_item,
    )


@router.post("/session/respond", response_model=SubmitResponseResult)
async def submit_response(req: SubmitResponseRequest) -> SubmitResponseResult:
    session = _sessions.get(req.session_id)
    item_pool = [_item_from_schema(i) for i in req.item_pool]
    administered = set(req.administered_ids)

    # Rebuild states from request (stateless-friendly)
    states: dict[str, CompetencyState] = {}
    for comp, schema in req.competency_states.items():
        state = _state_from_schema(schema)
        states[comp] = state

    item_map = {i.item_id: i for i in item_pool}
    item = item_map.get(req.item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {req.item_id} not found")

    state = states.get(req.competency)
    if state is None:
        raise HTTPException(status_code=400, detail=f"Unknown competency {req.competency}")

    binary = score_to_binary(req.rubric_score)
    state.responses.append((item, binary))
    administered.add(req.item_id)

    theta, se = update_theta_eap(state)
    state.theta = theta
    state.standard_error = se

    new_level, chip_type_str = adjust_level_after_response(
        state.current_level, req.rubric_score
    )
    state.current_level = new_level

    chip_type = ChipType(chip_type_str)
    chip = ChipEvent(
        competency=req.competency,
        level=level_from_difficulty(item.difficulty),
        chip_type=chip_type,
        rubric_score=req.rubric_score,
        brief_feedback=_brief_feedback(req.rubric_score, chip_type),
    )

    total_items = len(administered)

    focus = req.focus_competency
    if req.mode == "competency" and focus:
        terminate = should_terminate_competency_session(
            states,
            focus,
            total_items,
            min_items=req.min_items,
            max_items=req.max_items,
        )
        next_item = (
            None
            if terminate
            else select_next_item(
                states,
                item_pool,
                administered,
                target_competency=focus,
                max_items_per_competency=req.max_items,
                lock_competency=True,
            )
        )
    else:
        terminate = should_terminate_session(states, total_items)
        next_item = None if terminate else select_next_item(states, item_pool, administered)

    if session is not None:
        session["states"] = states
        session["administered"] = administered
        session["responses"].append(
            {"item_id": req.item_id, "score": req.rubric_score, "chip": chip.model_dump()}
        )

    return SubmitResponseResult(
        competency_states={k: _state_to_schema(v) for k, v in states.items()},
        chip_event=chip,
        next_item=next_item,
        should_terminate=terminate,
        total_items=total_items,
    )


@router.post("/session/summary", response_model=SessionSummaryResponse)
async def session_summary(req: SessionSummaryRequest) -> SessionSummaryResponse:
    summaries: list[CompetencySummary] = []
    thetas: list[float] = []

    for comp, schema in req.competency_states.items():
        summaries.append(
            CompetencySummary(
                competency=comp,
                theta=schema.theta,
                standard_error=schema.standard_error,
                level_estimate=level_from_difficulty(schema.theta),
                percentile=_theta_to_percentile(schema.theta),
            )
        )
        thetas.append(schema.theta)

    overall = sum(thetas) / len(thetas) if thetas else 0.0

    return SessionSummaryResponse(
        session_id=req.session_id,
        competencies=summaries,
        overall_theta=round(overall, 4),
    )


def _brief_feedback(score: float, chip_type: ChipType) -> str:
    if chip_type == ChipType.PASS:
        return "좋습니다. 다음 난이도로 올라갑니다."
    if chip_type == ChipType.DOWNGRADE:
        if score < 0.3:
            return "구체적 사례와 본인 역할을 보강해 주세요."
        return "핵심을 먼저 말하고 STAR 구조를 맞춰 보세요."
    return "기본은 갖췄습니다. 구체성을 더하면 좋겠습니다."

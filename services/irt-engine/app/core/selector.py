"""Next-item selection using Maximum Information (standard CAT)."""

from __future__ import annotations

from app.core.irt_2pl import (
    CompetencyState,
    ItemParams,
    difficulty_from_level,
    fisher_information,
    level_from_difficulty,
)
from app.models.schemas import ChipEvent, NextItemResponse


def select_next_item(
    competency_states: dict[str, CompetencyState],
    item_pool: list[ItemParams],
    administered_ids: set[str],
    target_competency: str | None = None,
    target_level: int | None = None,
    max_items_per_competency: int = 4,
    lock_competency: bool = False,
) -> NextItemResponse | None:
    """
    Select the next item maximizing Fisher information at current theta,
    with competency rotation and level targeting.
    """
    if not item_pool:
        return None

    locked = target_competency if lock_competency else None

    # Determine which competency to assess next (least items administered)
    competency_counts: dict[str, int] = {}
    for comp, state in competency_states.items():
        competency_counts[comp] = len(state.responses)

    if target_competency is None:
        eligible = [
            c
            for c, count in competency_counts.items()
            if count < max_items_per_competency
        ]
        if not eligible:
            return None
        target_competency = min(eligible, key=lambda c: competency_counts[c])

    state = competency_states.get(target_competency)
    if state is None:
        return None

    if len(state.responses) >= max_items_per_competency:
        if lock_competency:
            return None
        return select_next_item(
            competency_states,
            item_pool,
            administered_ids,
            target_competency=None,
            target_level=target_level,
            max_items_per_competency=max_items_per_competency,
            lock_competency=False,
        )

    level = target_level or state.current_level
    target_b = difficulty_from_level(level)

    candidates = [
        item
        for item in item_pool
        if item.competency == target_competency
        and item.item_id not in administered_ids
    ]

    if not candidates:
        # 역량 고정 모드: 남은 문항 없으면 종료 (무한 재귀 방지)
        return None

    def score_item(item: ItemParams) -> float:
        info = fisher_information(state.theta, item)
        level_penalty = abs(item.difficulty - target_b) * 0.3
        return info - level_penalty

    best = max(candidates, key=score_item)

    return NextItemResponse(
        item_id=best.item_id,
        competency=best.competency,
        level=level_from_difficulty(best.difficulty),
        target_level=level,
        difficulty=best.difficulty,
        expected_information=fisher_information(state.theta, best),
    )


def should_terminate_session(
    competency_states: dict[str, CompetencyState],
    total_items: int,
    min_items: int = 8,
    max_items: int = 18,
    se_threshold: float = 0.35,
) -> bool:
    """Check CAT termination criteria (full session — all competencies)."""
    if total_items >= max_items:
        return True
    if total_items < min_items:
        return False

    all_converged = all(
        state.standard_error <= se_threshold and len(state.responses) >= 2
        for state in competency_states.values()
        if len(state.responses) > 0
    )
    return all_converged


def should_terminate_competency_session(
    competency_states: dict[str, CompetencyState],
    focus_competency: str,
    total_items: int,
    min_items: int = 2,
    max_items: int = 3,
    se_threshold: float = 0.45,
) -> bool:
    """Single-competency block: 2–3 questions then stop."""
    if total_items >= max_items:
        return True
    if total_items < min_items:
        return False

    state = competency_states.get(focus_competency)
    if state is None:
        return total_items >= min_items

    return total_items >= min_items and state.standard_error <= se_threshold

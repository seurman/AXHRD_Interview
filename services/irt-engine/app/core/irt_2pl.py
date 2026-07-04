"""2-Parameter Logistic (2PL) Item Response Theory engine."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from scipy import optimize


@dataclass
class ItemParams:
    """Calibrated item parameters."""

    item_id: str
    competency: str
    difficulty: float  # b parameter (-3 ~ +3)
    discrimination: float = 1.0  # a parameter
    level: int = 1  # UX level 1-5


@dataclass
class CompetencyState:
    """Per-competency ability estimate during a session."""

    competency: str
    theta: float = 0.0
    standard_error: float = 1.0
    responses: list[tuple[ItemParams, float]] = field(default_factory=list)
    current_level: int = 2


def probability_correct(theta: float, item: ItemParams) -> float:
    """P(correct | theta) for 2PL model."""
    z = item.discrimination * (theta - item.difficulty)
    z = max(min(z, 35.0), -35.0)  # numerical stability
    return 1.0 / (1.0 + math.exp(-z))


def fisher_information(theta: float, item: ItemParams) -> float:
    """Item information at ability theta."""
    p = probability_correct(theta, item)
    q = 1.0 - p
    return (item.discrimination**2) * p * q


def score_to_binary(score: float, threshold: float = 0.55) -> float:
    """Convert rubric score [0,1] to pseudo-binary for IRT update."""
    return 1.0 if score >= threshold else 0.0


def update_theta_eap(
    state: CompetencyState,
    prior_mean: float = 0.0,
    prior_sd: float = 1.0,
) -> tuple[float, float]:
    """
    Expected A Posteriori (EAP) estimate of theta given response history.
    Returns (theta, standard_error).
    """
    if not state.responses:
        return prior_mean, prior_sd

    grid = np.linspace(-3.5, 3.5, 141)
    log_posterior = np.zeros_like(grid)

    # Prior: N(prior_mean, prior_sd)
    log_posterior += -0.5 * ((grid - prior_mean) / prior_sd) ** 2

    for item, u in state.responses:
        p = np.array([probability_correct(t, item) for t in grid])
        p = np.clip(p, 1e-9, 1.0 - 1e-9)
        if u >= 0.5:
            log_posterior += np.log(p)
        else:
            log_posterior += np.log(1.0 - p)

    log_posterior -= log_posterior.max()
    posterior = np.exp(log_posterior)
    posterior /= posterior.sum()

    theta_hat = float(np.sum(grid * posterior))
    variance = float(np.sum((grid - theta_hat) ** 2 * posterior))
    se = math.sqrt(max(variance, 1e-6))

    return theta_hat, se


def update_theta_mle(state: CompetencyState) -> tuple[float, float]:
    """Maximum Likelihood Estimate with fallback to EAP for edge cases."""

    if not state.responses:
        return 0.0, 1.0

    def neg_log_likelihood(theta: float) -> float:
        ll = 0.0
        for item, u in state.responses:
            p = probability_correct(theta, item)
            p = max(min(p, 1.0 - 1e-9), 1e-9)
            if u >= 0.5:
                ll += math.log(p)
            else:
                ll += math.log(1.0 - p)
        return -ll

    result = optimize.minimize_scalar(
        neg_log_likelihood,
        bounds=(-3.5, 3.5),
        method="bounded",
    )
    theta_hat = float(result.x) if result.success else 0.0

    info_sum = sum(
        fisher_information(theta_hat, item) for item, _ in state.responses
    )
    se = 1.0 / math.sqrt(info_sum) if info_sum > 0 else 1.0

    return theta_hat, se


def level_from_difficulty(difficulty: float) -> int:
    """Map IRT difficulty b to UX level 1-5."""
    if difficulty <= -1.5:
        return 1
    if difficulty <= -0.5:
        return 2
    if difficulty <= 0.5:
        return 3
    if difficulty <= 1.5:
        return 4
    return 5


def difficulty_from_level(level: int) -> float:
    """Map UX level to target difficulty b."""
    mapping = {1: -2.0, 2: -1.0, 3: 0.0, 4: 1.0, 5: 2.0}
    return mapping.get(level, 0.0)


def adjust_level_after_response(
    current_level: int,
    rubric_score: float,
    pass_threshold: float = 0.55,
    strong_threshold: float = 0.75,
) -> tuple[int, str]:
    """
    Adaptive level adjustment for UX.
    Returns (new_level, chip_type: 'pass' | 'attempt' | 'downgrade').
    """
    if rubric_score >= strong_threshold:
        new_level = min(current_level + 1, 5)
        return new_level, "pass"
    if rubric_score >= pass_threshold:
        return current_level, "attempt"
    new_level = max(current_level - 1, 1)
    return new_level, "downgrade"

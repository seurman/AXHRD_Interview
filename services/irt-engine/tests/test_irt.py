import pytest
from app.core.irt_2pl import (
    CompetencyState,
    ItemParams,
    adjust_level_after_response,
    probability_correct,
    update_theta_eap,
)
from app.core.selector import select_next_item, should_terminate_session


def test_probability_correct():
    item = ItemParams("q1", "COMMUNICATION", difficulty=0.0, discrimination=1.0)
    assert abs(probability_correct(0.0, item) - 0.5) < 0.01
    assert probability_correct(2.0, item) > 0.8
    assert probability_correct(-2.0, item) < 0.2


def test_level_adjustment():
    level, chip = adjust_level_after_response(2, 0.8)
    assert level == 3
    assert chip == "pass"

    level, chip = adjust_level_after_response(2, 0.4)
    assert level == 1
    assert chip == "downgrade"


def test_theta_update():
    state = CompetencyState(competency="COMMUNICATION")
    item_easy = ItemParams("e1", "COMMUNICATION", difficulty=-1.0)
    item_hard = ItemParams("h1", "COMMUNICATION", difficulty=1.0)

    state.responses.append((item_easy, 1.0))
    theta, se = update_theta_eap(state)
    assert theta > 0

    state.responses.append((item_hard, 0.0))
    theta2, _ = update_theta_eap(state)
    assert theta2 < theta


def test_select_next_item():
    states = {
        "COMMUNICATION": CompetencyState(competency="COMMUNICATION", current_level=2),
        "PROBLEM_SOLVING": CompetencyState(competency="PROBLEM_SOLVING", current_level=2),
    }
    pool = [
        ItemParams("c1", "COMMUNICATION", difficulty=-1.0, level=2),
        ItemParams("p1", "PROBLEM_SOLVING", difficulty=-1.0, level=2),
    ]
    result = select_next_item(states, pool, set())
    assert result is not None
    assert result.item_id in ("c1", "p1")


def test_termination():
    states = {
        "COMMUNICATION": CompetencyState(
            competency="COMMUNICATION", standard_error=0.3, responses=[(ItemParams("x", "COMMUNICATION", 0), 1)] * 2
        ),
    }
    assert not should_terminate_session(states, total_items=5)
    assert should_terminate_session(states, total_items=18)

#!/usr/bin/env python3
"""Apply scripts/sjt-choices.json into pack TS files."""
from __future__ import annotations

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
PACKS = ROOT.parent / "src/lib/competency-game/catalog/packs"
SJT = json.loads((ROOT / "sjt-choices.json").read_text(encoding="utf-8"))

MAPPING = {
    "leadership.ts": ("leadership", "ld-boss-1"),
    "job-fit.ts": ("job-fit", "jf-boss-1"),
    "communication.ts": ("communication", "comm-boss-1"),
    "problem-solving.ts": ("problem-solving", "ps-boss-1"),
    "org-fit.ts": ("org-fit", "of-boss-1"),
    "growth.ts": ("growth", "gr-boss-1"),
}


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def validate(item: dict, label: str) -> None:
    ch = item["choices"]
    ai = item["answerIndex"]
    assert 0 <= ai < len(ch), label
    lens = [len(c) for c in ch]
    mx = max(lens)
    if lens[ai] == mx and lens.count(mx) == 1:
        raise SystemExit(f"{label}: uniquely longest correct {lens} {ch}")
    if mx - min(lens) > 18:
        raise SystemExit(f"{label}: spread {mx - min(lens)} too large {lens}")
    digit = [bool(re.search(r"\d", c)) for c in ch]
    if digit[ai] and sum(digit) == 1:
        raise SystemExit(f"{label}: digit cue only on answer {ch}")


def render_item(item: dict, indent: str = "    ") -> str:
    lines = [f"{indent}{{"]
    if item.get("scenario"):
        lines.append(f"{indent}  scenario: {ts_str(item['scenario'])},")
    lines.append(f"{indent}  prompt: {ts_str(item['prompt'])},")
    lines.append(f"{indent}  choices: [")
    for c in item["choices"]:
        lines.append(f"{indent}    {ts_str(c)},")
    lines.append(f"{indent}  ],")
    lines.append(f"{indent}  answerIndex: {item['answerIndex']},")
    if item.get("skillRule"):
        lines.append(f"{indent}  skillRule: {ts_str(item['skillRule'])},")
    lines.append(f"{indent}  explain: {ts_str(item['explain'])},")
    lines.append(f"{indent}}},")
    return "\n".join(lines)


def replace_array(text: str, key: str, items: list[dict]) -> str:
    pattern = rf"(  {key}: \[)(.*?)(\n  \],)"
    m = re.search(pattern, text, re.S)
    if not m:
        raise SystemExit(f"cannot find {key}")
    body = "\n".join(render_item(i) for i in items)
    return text[: m.start(2)] + "\n" + body + text[m.start(3) :]


def replace_boss_choice(text: str, item: dict, boss_id: str) -> str:
    marker = f'      id: "{boss_id}",\n      gameType: "choice",\n'
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"cannot find boss {boss_id}")
    after = start + len(marker)
    end = text.find("\n    },\n    {\n      id: ", after)
    if end < 0:
        raise SystemExit(f"cannot find end of boss {boss_id}")
    skill = item.get("skillRule", "question_intent")
    block = (
        f'      skillRule: "{skill}",\n'
        f"      scenario: {ts_str(item['scenario'])},\n"
        f"      prompt: {ts_str(item['prompt'])},\n"
        f"      choices: [\n"
        + "".join(f"        {ts_str(c)},\n" for c in item["choices"])
        + "      ],\n"
        f"      answerIndex: {item['answerIndex']},\n"
        f"      explain: {ts_str(item['explain'])},"
    )
    return text[:after] + block + text[end:]


def main() -> None:
    for fname, (key, boss_id) in MAPPING.items():
        data = SJT[key]
        for i, item in enumerate(data["openers"]):
            validate(item, f"{key}.openers[{i}]")
        for i, item in enumerate(data["traps"]):
            validate(item, f"{key}.traps[{i}]")
        validate(data["boss"], f"{key}.boss")
        path = PACKS / fname
        text = path.read_text(encoding="utf-8")
        text = replace_array(text, "openers", data["openers"])
        text = replace_array(text, "traps", data["traps"])
        text = replace_boss_choice(text, data["boss"], boss_id)
        path.write_text(text, encoding="utf-8")
        print("updated", fname)


if __name__ == "__main__":
    main()

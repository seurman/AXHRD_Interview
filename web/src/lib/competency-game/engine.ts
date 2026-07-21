/**
 * 역량게임 채점·해금 엔진 (정답 키 기반, LLM 없음)
 */

import type { GameAnswerPayload, GameItem, GameLevel } from "./types";

export type GradeResult = {
  correct: boolean;
  explain: string;
  xpEarned: number;
};

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function gradeItem(item: GameItem, answer: GameAnswerPayload): GradeResult {
  if (item.id !== answer.itemId || item.gameType !== answer.gameType) {
    return { correct: false, explain: "문항이 일치하지 않습니다.", xpEarned: 0 };
  }

  switch (item.gameType) {
    case "choice": {
      const ok =
        answer.gameType === "choice" && answer.answerIndex === item.answerIndex;
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? 10 : 0,
      };
    }
    case "order": {
      const ok =
        answer.gameType === "order" && arraysEqual(answer.order, item.answerOrder);
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? 12 : 0,
      };
    }
    case "fill_blank": {
      if (answer.gameType !== "fill_blank") {
        return { correct: false, explain: item.explain, xpEarned: 0 };
      }
      const ok =
        answer.blankIndexes.length === item.blanks.length &&
        answer.blankIndexes.every((v, i) => v === item.blanks[i].answerIndex);
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? 12 : 0,
      };
    }
    case "swipe_judge": {
      const ok =
        answer.gameType === "swipe_judge" && answer.judgedGood === item.isGood;
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? 10 : 0,
      };
    }
    case "speak_along": {
      const ok = answer.gameType === "speak_along" && answer.completed;
      return {
        correct: ok,
        explain: item.tip,
        xpEarned: ok ? 15 : 0,
      };
    }
  }
}

export function gradeLevel(
  level: GameLevel,
  answers: GameAnswerPayload[],
): {
  allCorrect: boolean;
  results: GradeResult[];
  xpTotal: number;
  wrongCount: number;
} {
  const byId = new Map(answers.map((a) => [a.itemId, a]));
  const results: GradeResult[] = [];
  let xpTotal = 0;
  let wrongCount = 0;

  for (const item of level.items) {
    const ans = byId.get(item.id);
    if (!ans) {
      results.push({ correct: false, explain: "응답이 없습니다.", xpEarned: 0 });
      wrongCount += 1;
      continue;
    }
    const r = gradeItem(item, ans);
    results.push(r);
    xpTotal += r.xpEarned;
    if (!r.correct) wrongCount += 1;
  }

  const allCorrect = wrongCount === 0;
  if (allCorrect) xpTotal += level.xpReward;

  return { allCorrect, results, xpTotal, wrongCount };
}

/** 유닛 내 다음 도전 가능 레벨 인덱스 (cleared = 완료한 level id 집합) */
export function nextPlayableLevelIndex(
  levelIds: string[],
  cleared: Set<string>,
): number {
  for (let i = 0; i < levelIds.length; i++) {
    if (!cleared.has(levelIds[i])) return i;
  }
  return levelIds.length;
}

export function isLevelUnlocked(
  levelIndex: number,
  levelIds: string[],
  cleared: Set<string>,
): boolean {
  if (levelIndex <= 0) return true;
  const prev = levelIds[levelIndex - 1];
  return cleared.has(prev);
}

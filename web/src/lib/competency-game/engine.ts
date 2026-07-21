/**
 * 역량게임 채점·해금 엔진 (정답 키 기반, LLM 없음)
 */

import type {
  Difficulty,
  GameAnswerPayload,
  GameCourse,
  GameItem,
  GameLevel,
} from "./types";

export type GradeResult = {
  correct: boolean;
  explain: string;
  xpEarned: number;
};

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** 난이도↑ → 문항 XP 배수 */
export function difficultyXpMultiplier(difficulty: Difficulty): number {
  return 1 + (difficulty - 1) * 0.25;
}

function baseItemXp(item: GameItem): number {
  switch (item.gameType) {
    case "choice":
    case "swipe_judge":
      return 10;
    case "order":
    case "fill_blank":
      return 12;
    case "speak_along":
      return 15;
  }
}

export function gradeItem(
  item: GameItem,
  answer: GameAnswerPayload,
  difficulty: Difficulty = 1,
): GradeResult {
  if (item.id !== answer.itemId || item.gameType !== answer.gameType) {
    return { correct: false, explain: "문항이 일치하지 않습니다.", xpEarned: 0 };
  }

  const xp = Math.round(baseItemXp(item) * difficultyXpMultiplier(difficulty));

  switch (item.gameType) {
    case "choice": {
      const ok =
        answer.gameType === "choice" && answer.answerIndex === item.answerIndex;
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? xp : 0,
      };
    }
    case "order": {
      const ok =
        answer.gameType === "order" && arraysEqual(answer.order, item.answerOrder);
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? xp : 0,
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
        xpEarned: ok ? xp : 0,
      };
    }
    case "swipe_judge": {
      const ok =
        answer.gameType === "swipe_judge" && answer.judgedGood === item.isGood;
      return {
        correct: ok,
        explain: item.explain,
        xpEarned: ok ? xp : 0,
      };
    }
    case "speak_along": {
      const ok = answer.gameType === "speak_along" && answer.completed;
      return {
        correct: ok,
        explain: item.tip,
        xpEarned: ok ? xp : 0,
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
    const r = gradeItem(item, ans, level.difficulty);
    results.push(r);
    xpTotal += r.xpEarned;
    if (!r.correct) wrongCount += 1;
  }

  const allCorrect = wrongCount === 0;
  if (allCorrect) xpTotal += level.xpReward;

  return { allCorrect, results, xpTotal, wrongCount };
}

/** 코스 전체 레벨을 유닛 순서대로 평탄화 */
export function flattenCourseLevels(course: GameCourse): GameLevel[] {
  return course.units.flatMap((u) => u.levels);
}

export function nextPlayableLevelIndex(
  levelIds: string[],
  cleared: Set<string>,
): number {
  for (let i = 0; i < levelIds.length; i++) {
    if (!cleared.has(levelIds[i])) return i;
  }
  return levelIds.length;
}

/** @deprecated 유닛 내 인덱스용 — 코스는 isCourseLevelUnlocked 사용 */
export function isLevelUnlocked(
  levelIndex: number,
  levelIds: string[],
  cleared: Set<string>,
): boolean {
  if (levelIndex <= 0) return true;
  const prev = levelIds[levelIndex - 1];
  return cleared.has(prev);
}

/** 코스 전체에서 이전 레벨 클리어 시에만 해금 */
export function isCourseLevelUnlocked(
  course: GameCourse,
  levelId: string,
  cleared: Set<string>,
): boolean {
  const ids = flattenCourseLevels(course).map((l) => l.id);
  const idx = ids.indexOf(levelId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return cleared.has(ids[idx - 1]);
}

export function coursePathIndex(course: GameCourse, levelId: string): number {
  return flattenCourseLevels(course).findIndex((l) => l.id === levelId);
}

/**
 * 역량게임용 2PL IRT (로컬 EAP) — 면접 엔진과 동일 수식
 */

import type { ItemParams } from "@/types";
import type { Difficulty, GameItem, GameLevel } from "./types";
import { DIFFICULTY_TO_B } from "./types";

const GRID: number[] = Array.from({ length: 141 }, (_, i) => -3.5 + i * (7 / 140));

export function probabilityCorrect(theta: number, item: ItemParams): number {
  const z = Math.max(-35, Math.min(35, item.discrimination * (theta - item.difficulty)));
  return 1 / (1 + Math.exp(-z));
}

export function fisherInformation(theta: number, item: ItemParams): number {
  const p = probabilityCorrect(theta, item);
  return item.discrimination ** 2 * p * (1 - p);
}

export function gameItemParams(
  item: GameItem,
  competency: string,
  difficulty: Difficulty,
  indexInLevel: number,
): ItemParams {
  const base = DIFFICULTY_TO_B[difficulty];
  const b = base + (indexInLevel - 1) * 0.12;
  return {
    item_id: item.id,
    competency,
    difficulty: Math.max(-3, Math.min(3, b)),
    discrimination: 1,
    level: difficulty,
  };
}

export function updateThetaEap(
  responses: Array<{ item: ItemParams; u: 0 | 1 }>,
  priorMean = 0,
  priorSd = 1,
): { theta: number; se: number } {
  if (responses.length === 0) return { theta: priorMean, se: priorSd };

  const logPost = GRID.map((t) => {
    let lp = -0.5 * ((t - priorMean) / priorSd) ** 2;
    for (const { item, u } of responses) {
      const p = Math.min(1 - 1e-9, Math.max(1e-9, probabilityCorrect(t, item)));
      lp += Math.log(u >= 1 ? p : 1 - p);
    }
    return lp;
  });

  const maxLp = Math.max(...logPost);
  const post = logPost.map((lp) => Math.exp(lp - maxLp));
  const sum = post.reduce((a, b) => a + b, 0);
  const norm = post.map((p) => p / sum);
  const theta = norm.reduce((acc, p, i) => acc + p * GRID[i], 0);
  const variance = norm.reduce((acc, p, i) => acc + p * (GRID[i] - theta) ** 2, 0);
  return { theta, se: Math.sqrt(Math.max(variance, 1e-6)) };
}

/** 현재 θ에서 정보량 최대 문항을 N개 (중복 없이) */
export function selectAdaptiveItems(
  level: GameLevel,
  competency: string,
  theta: number,
  count = 3,
): GameItem[] {
  const pool = level.items.map((item, i) => ({
    item,
    params: gameItemParams(item, competency, level.difficulty, i),
  }));
  if (pool.length <= count) return level.items.slice();

  const picked: GameItem[] = [];
  const remaining = [...pool];
  let th = theta;

  while (picked.length < count && remaining.length > 0) {
    remaining.sort(
      (a, b) => fisherInformation(th, b.params) - fisherInformation(th, a.params),
    );
    const next = remaining.shift()!;
    picked.push(next.item);
    // 예상 정답으로 약하게 θ 이동 (선택 다양성)
    const p = probabilityCorrect(th, next.params);
    th = Math.max(-3.5, Math.min(3.5, th + (p - 0.5) * 0.15));
  }
  return picked;
}

export function thetaToLevelEst(theta: number): number {
  if (theta < -1.5) return 1;
  if (theta < -0.5) return 2;
  if (theta < 0.5) return 3;
  if (theta < 1.5) return 4;
  return 5;
}

export function thetaToPercentile(theta: number): number {
  // 표준정규 근사 (Abramowitz & Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(theta));
  const d = 0.3989423 * Math.exp((-theta * theta) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = theta >= 0 ? 1 - p : p;
  return Math.round(Math.min(99, Math.max(1, cdf * 100)));
}

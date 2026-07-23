/**
 * 역량게임 진행도 저장
 */

import { prisma } from "@/lib/prisma";
import type { CompetencyCode } from "@/types";
import {
  flattenCourseLevels,
  isCourseLevelUnlocked,
  nextPlayableLevelIndex,
} from "./engine";
import { getEnabledGameCourse } from "./runtime-config";
import type { Difficulty, LevelGameType } from "./types";

export type CourseProgressView = {
  competency: CompetencyCode;
  titleKo: string;
  blurbKo: string;
  xp: number;
  hearts: number;
  streakDays: number;
  theta: number;
  se: number;
  units: Array<{
    id: string;
    titleKo: string;
    subtitleKo: string;
    levels: Array<{
      id: string;
      titleKo: string;
      gameType: LevelGameType;
      difficulty: Difficulty;
      itemCount: number;
      pathIndex: number;
      index: number;
      cleared: boolean;
      unlocked: boolean;
      xpReward: number;
    }>;
  }>;
};

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export async function getOrCreateGameProgress(
  userId: string,
  competency: CompetencyCode,
) {
  return prisma.competencyGameProgress.upsert({
    where: { userId_competency: { userId, competency } },
    create: {
      userId,
      competency,
      clearedLevelIds: [],
      xp: 0,
      hearts: 5,
    },
    update: {},
  });
}

export async function getCourseProgressView(
  userId: string,
  competency: CompetencyCode,
): Promise<CourseProgressView> {
  const course = await getEnabledGameCourse(competency);
  const progress = await getOrCreateGameProgress(userId, competency);
  const cleared = new Set(asStringArray(progress.clearedLevelIds));
  const flat = flattenCourseLevels(course);
  const pathIndexById = new Map(flat.map((l, i) => [l.id, i]));

  return {
    competency,
    titleKo: course.titleKo,
    blurbKo: course.blurbKo,
    xp: progress.xp,
    hearts: progress.hearts,
    streakDays: progress.streakDays,
    theta: progress.theta ?? 0,
    se: progress.se ?? 1,
    units: course.units.map((unit) => ({
      id: unit.id,
      titleKo: unit.titleKo,
      subtitleKo: unit.subtitleKo,
      levels: unit.levels.map((level) => ({
        id: level.id,
        titleKo: level.titleKo,
        gameType: level.gameType,
        difficulty: level.difficulty,
        itemCount: level.items.length,
        pathIndex: pathIndexById.get(level.id) ?? level.index,
        index: level.index,
        cleared: cleared.has(level.id),
        unlocked: isCourseLevelUnlocked(course, level.id, cleared),
        xpReward: level.xpReward,
      })),
    })),
  };
}

export async function listCourseSummaries(userId: string) {
  const { COMPETENCY_CODES } = await import("@/types");
  const { competencyLabel } = await import("@/lib/labels");
  const { getGameRuntimeConfig, filterCourseByRuntimeConfig } = await import(
    "./runtime-config"
  );
  const { getGameCourse } = await import("./catalog");

  const [rows, config] = await Promise.all([
    prisma.competencyGameProgress.findMany({ where: { userId } }),
    getGameRuntimeConfig(),
  ]);
  const byComp = new Map(rows.map((r) => [r.competency, r]));

  return COMPETENCY_CODES.map((code) => {
    const course = filterCourseByRuntimeConfig(getGameCourse(code), config);
    const progress = byComp.get(code);
    const cleared = asStringArray(progress?.clearedLevelIds);
    const flat = flattenCourseLevels(course);
    const levelIds = flat.map((l) => l.id);
    const totalLevels = levelIds.length;
    const nextIdx = nextPlayableLevelIndex(levelIds, new Set(cleared));
    const nextLevel = flat[nextIdx] ?? null;
    const pct =
      totalLevels === 0
        ? 0
        : Math.round((Math.min(cleared.length, totalLevels) / totalLevels) * 100);
    return {
      competency: code,
      titleKo: competencyLabel(code),
      blurbKo: course.blurbKo,
      xp: progress?.xp ?? 0,
      hearts: progress?.hearts ?? 5,
      clearedCount: cleared.filter((id) => levelIds.includes(id)).length,
      totalLevels,
      progressPct: pct,
      hasContent: totalLevels > 0,
      nextLevelId: nextLevel?.id ?? null,
      nextLevelTitle: nextLevel?.titleKo ?? null,
      continueHref: nextLevel
        ? `/practice/game/${code.toLowerCase()}/${nextLevel.id}`
        : `/practice/game/${code.toLowerCase()}`,
      completed:
        totalLevels > 0 &&
        cleared.filter((id) => levelIds.includes(id)).length >= totalLevels,
    };
  });
}

function bumpStreak(lastPlayAt: Date | null, streakDays: number): number {
  if (!lastPlayAt) return 1;
  const last = new Date(lastPlayAt);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startLast = new Date(last);
  startLast.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (startToday.getTime() - startLast.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return Math.max(1, streakDays);
  if (diffDays === 1) return streakDays + 1;
  return 1;
}

export async function applyLevelClear(params: {
  userId: string;
  competency: CompetencyCode;
  levelId: string;
  xpGained: number;
  heartsLost: number;
  alreadyCleared: boolean;
}) {
  const progress = await getOrCreateGameProgress(params.userId, params.competency);
  const cleared = new Set(asStringArray(progress.clearedLevelIds));
  if (!params.alreadyCleared) cleared.add(params.levelId);

  const hearts = Math.max(0, progress.hearts - params.heartsLost);
  const streakDays = bumpStreak(progress.lastPlayAt, progress.streakDays);

  const updated = await prisma.competencyGameProgress.update({
    where: { id: progress.id },
    data: {
      clearedLevelIds: [...cleared],
      xp: progress.xp + params.xpGained,
      hearts,
      streakDays,
      lastPlayAt: new Date(),
    },
  });

  await prisma.drillAttempt.create({
    data: {
      userId: params.userId,
      competency: params.competency,
      kind: "game",
      unscored: true,
      score: params.alreadyCleared ? undefined : 1,
    },
  });

  return updated;
}

export async function loseHeart(userId: string, competency: CompetencyCode) {
  const progress = await getOrCreateGameProgress(userId, competency);
  if (progress.hearts <= 0) return progress;
  return prisma.competencyGameProgress.update({
    where: { id: progress.id },
    data: { hearts: progress.hearts - 1, lastPlayAt: new Date() },
  });
}

export async function updateGameTheta(
  userId: string,
  competency: CompetencyCode,
  theta: number,
  se: number,
) {
  const progress = await getOrCreateGameProgress(userId, competency);
  return prisma.competencyGameProgress.update({
    where: { id: progress.id },
    data: { theta, se, lastPlayAt: new Date() },
  });
}

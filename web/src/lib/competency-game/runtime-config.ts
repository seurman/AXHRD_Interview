/**
 * 역량게임 운영 설정 — 타입/레벨 on·off (관리자)
 */

import { prisma } from "@/lib/prisma";
import type { GameCourse, GameLevel, GameType, LevelGameType } from "./types";
import { GAME_TYPES } from "./types";
import { listGameCourses, getGameCourse } from "./catalog";
import type { CompetencyCode } from "@/types";

export type GameRuntimeConfig = {
  disabledGameTypes: GameType[];
  disabledLevelIds: string[];
  updatedAt: string | null;
  updatedByUserId: string | null;
};

const CONFIG_ID = "default";

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function normalizeGameTypes(raw: unknown): GameType[] {
  const allowed = new Set<string>(GAME_TYPES);
  return asStringArray(raw).filter((t): t is GameType => allowed.has(t));
}

export async function getGameRuntimeConfig(): Promise<GameRuntimeConfig> {
  const row = await prisma.competencyGameRuntimeConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      disabledGameTypes: [],
      disabledLevelIds: [],
    },
    update: {},
  });
  return {
    disabledGameTypes: normalizeGameTypes(row.disabledGameTypes),
    disabledLevelIds: asStringArray(row.disabledLevelIds),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedByUserId: row.updatedByUserId ?? null,
  };
}

export async function saveGameRuntimeConfig(input: {
  disabledGameTypes: string[];
  disabledLevelIds: string[];
  updatedByUserId?: string | null;
}): Promise<GameRuntimeConfig> {
  const disabledGameTypes = normalizeGameTypes(input.disabledGameTypes);
  const knownLevelIds = new Set(
    listGameCourses().flatMap((c) => c.units.flatMap((u) => u.levels.map((l) => l.id))),
  );
  const disabledLevelIds = asStringArray(input.disabledLevelIds).filter((id) =>
    knownLevelIds.has(id),
  );

  const row = await prisma.competencyGameRuntimeConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      disabledGameTypes,
      disabledLevelIds,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    update: {
      disabledGameTypes,
      disabledLevelIds,
      updatedByUserId: input.updatedByUserId ?? null,
    },
  });

  return {
    disabledGameTypes: normalizeGameTypes(row.disabledGameTypes),
    disabledLevelIds: asStringArray(row.disabledLevelIds),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedByUserId: row.updatedByUserId ?? null,
  };
}

export function isLevelEnabledByConfig(
  level: Pick<GameLevel, "id" | "gameType">,
  config: Pick<GameRuntimeConfig, "disabledGameTypes" | "disabledLevelIds">,
): boolean {
  if (config.disabledLevelIds.includes(level.id)) return false;
  const gt = level.gameType as LevelGameType;
  if (gt !== "mixed" && config.disabledGameTypes.includes(gt as GameType)) {
    return false;
  }
  return true;
}

/** 비활성 레벨을 뺀 코스 (해금 순서는 남은 레벨 기준) */
export function filterCourseByRuntimeConfig(
  course: GameCourse,
  config: Pick<GameRuntimeConfig, "disabledGameTypes" | "disabledLevelIds">,
): GameCourse {
  return {
    ...course,
    units: course.units
      .map((unit) => ({
        ...unit,
        levels: unit.levels
          .filter((l) => isLevelEnabledByConfig(l, config))
          .map((l, index) => ({ ...l, index })),
      }))
      .filter((u) => u.levels.length > 0),
  };
}

export async function getEnabledGameCourse(
  competency: CompetencyCode,
): Promise<GameCourse> {
  const config = await getGameRuntimeConfig();
  return filterCourseByRuntimeConfig(getGameCourse(competency), config);
}

export async function isGameLevelEnabled(levelId: string): Promise<boolean> {
  const config = await getGameRuntimeConfig();
  for (const course of listGameCourses()) {
    for (const unit of course.units) {
      const level = unit.levels.find((l) => l.id === levelId);
      if (level) return isLevelEnabledByConfig(level, config);
    }
  }
  return false;
}

/** 관리자 UI용 레벨 카탈로그 스냅샷 */
export function buildGameLevelCatalog() {
  return listGameCourses().map((course) => ({
    competency: course.competency,
    titleKo: course.titleKo,
    levels: course.units.flatMap((unit) =>
      unit.levels.map((level) => ({
        id: level.id,
        unitId: unit.id,
        unitTitleKo: unit.titleKo,
        titleKo: level.titleKo,
        gameType: level.gameType,
        difficulty: level.difficulty,
        itemCount: level.items.length,
        xpReward: level.xpReward,
      })),
    ),
  }));
}

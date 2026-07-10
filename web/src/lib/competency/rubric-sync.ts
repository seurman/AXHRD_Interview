import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  detailsFromRubricByLevel,
  rubricByLevelFromDetails,
} from "@/lib/competency/rubric-ssot";
import { parseRubricByLevel, type RubricByLevel } from "@/lib/competency/rubric";
import { upsertRubricSet } from "@/lib/repository/service";

/** rubricByLevel JSON → 플랫폼 기본 RubricSet (SSoT 쓰기) */
export async function syncDefaultRubricSetFromLegacy(
  competencyId: string,
  rubricByLevel: unknown,
  meta?: { nameKo?: string; code?: string },
) {
  const details = detailsFromRubricByLevel(rubricByLevel);
  if (details.length === 0) return null;

  const competency =
    meta?.nameKo && meta?.code
      ? { nameKo: meta.nameKo, code: meta.code }
      : await prisma.competency.findUnique({
          where: { id: competencyId },
          select: { nameKo: true, code: true },
        });
  if (!competency) return null;

  const existing = await prisma.rubricSet.findFirst({
    where: {
      competencyId,
      organizationId: null,
      isDefault: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return upsertRubricSet({
    id: existing?.id,
    competencyId,
    organizationId: null,
    rubricName: existing?.rubricName ?? `${competency.nameKo} 플랫폼 표준`,
    scoringSystem: "FIVE_SCALE",
    isDefault: true,
    details,
  });
}

/** 플랫폼 기본 RubricSet → rubricByLevel JSON (킷·레거시 UI 호환) */
export async function syncRubricByLevelFromDefaultSet(competencyId: string) {
  const defaultSet = await prisma.rubricSet.findFirst({
    where: { competencyId, organizationId: null, isDefault: true },
    include: { details: { orderBy: { scoreLevel: "desc" } } },
  });
  if (!defaultSet?.details.length) return null;

  const rubricByLevel = rubricByLevelFromDetails(
    defaultSet.details.map((d) => ({
      scoreLevel: d.scoreLevel,
      levelName: d.levelName,
      behavioralIndicator: d.behavioralIndicator,
    })),
  );

  await prisma.competency.update({
    where: { id: competencyId },
    data: { rubricByLevel: rubricByLevel as Prisma.InputJsonValue },
  });

  return rubricByLevel;
}

/** RubricSet SSoT 우선, 없으면 legacy JSON */
export function effectiveRubricByLevel(
  legacy: unknown,
  fromSet?: RubricByLevel | null,
): RubricByLevel {
  if (fromSet && Object.keys(fromSet).length > 0) return fromSet;
  return parseRubricByLevel(legacy);
}

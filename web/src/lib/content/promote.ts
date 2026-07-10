import { prisma } from "@/lib/prisma";
import type { ContentOwnerScope, Prisma } from "@prisma/client";
import { assertPlatformCompetencyCodeAvailable } from "@/lib/content/ownership";

export type PromoteMode = "merge_into_base" | "promote_as_new_base";

export class PromoteError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

async function nextPlatformCode(baseCode: string): Promise<string> {
  let candidate = baseCode.trim().toUpperCase();
  let n = 0;
  while (true) {
    const code = n === 0 ? candidate : `${candidate}_V${n}`;
    const hit = await prisma.competency.findFirst({
      where: { code, ownerScope: "PLATFORM", organizationId: null },
      select: { id: true },
    });
    if (!hit) return code;
    n++;
    if (n > 50) throw new PromoteError("사용 가능한 PLATFORM 코드를 찾지 못했습니다.", 500);
  }
}

export async function promoteCompetency(
  orgCompetencyId: string,
  mode: PromoteMode
): Promise<{ id: string; code: string; mode: PromoteMode }> {
  const orgRow = await prisma.competency.findUnique({
    where: { id: orgCompetencyId },
    include: { questions: { where: { isActive: true } } },
  });
  if (!orgRow || orgRow.ownerScope !== "ORG") {
    throw new PromoteError("기관 소유 역량만 승격할 수 있습니다.");
  }

  if (mode === "merge_into_base") {
    if (!orgRow.forkedFromId) {
      throw new PromoteError("포크가 아닌 역량은 기존 기본에 병합할 수 없습니다.");
    }
    const base = await prisma.competency.findUnique({ where: { id: orgRow.forkedFromId } });
    if (!base || base.ownerScope !== "PLATFORM" || base.organizationId !== null) {
      throw new PromoteError("병합 대상 기본 역량을 찾을 수 없습니다.");
    }

    await prisma.competency.update({
      where: { id: base.id },
      data: {
        nameKo: orgRow.nameKo,
        nameEn: orgRow.nameEn,
        description: orgRow.description,
        rubricByLevel: orgRow.rubricByLevel ?? undefined,
      },
    });

    return { id: base.id, code: base.code, mode };
  }

  const code =
    orgRow.forkedFromId != null
      ? await nextPlatformCode(
          (
            await prisma.competency.findUnique({
              where: { id: orgRow.forkedFromId },
              select: { code: true },
            })
          )?.code ?? orgRow.code
        )
      : await nextPlatformCode(orgRow.code);

  await assertPlatformCompetencyCodeAvailable(code);

  const created = await prisma.competency.create({
    data: {
      code,
      nameKo: orgRow.nameKo,
      nameEn: orgRow.nameEn,
      description: orgRow.description,
      clusterId: orgRow.clusterId,
      source: orgRow.source,
      sortOrder: orgRow.sortOrder,
      isActive: true,
      rubricByLevel: orgRow.rubricByLevel ?? undefined,
      ownerScope: "PLATFORM",
      organizationId: null,
      forkedFromId: orgRow.forkedFromId ?? orgRow.id,
      createdByUserId: orgRow.createdByUserId,
    },
  });

  for (const q of orgRow.questions) {
    const externalId = `PROMO-${created.code}-${q.externalId}`.slice(0, 120);
    await prisma.question.create({
      data: {
        externalId,
        competencyId: created.id,
        level: q.level,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        template: q.template,
        followUpHints: q.followUpHints ?? undefined,
        rubricCriteria: q.rubricCriteria ?? undefined,
        sortOrder: q.sortOrder,
        isActive: true,
        ownerScope: "PLATFORM",
        organizationId: null,
        forkedFromId: q.id,
        createdByUserId: q.createdByUserId,
      },
    });
  }

  return { id: created.id, code: created.code, mode };
}

export async function promoteQuestion(
  orgQuestionId: string,
  mode: PromoteMode
): Promise<{ id: string; externalId: string; mode: PromoteMode }> {
  const orgQ = await prisma.question.findUnique({
    where: { id: orgQuestionId },
    include: { competency: true },
  });
  if (!orgQ || orgQ.ownerScope !== "ORG") {
    throw new PromoteError("기관 소유 문항만 승격할 수 있습니다.");
  }

  if (mode === "merge_into_base") {
    if (!orgQ.forkedFromId) {
      throw new PromoteError("포크가 아닌 문항은 기존 기본에 병합할 수 없습니다.");
    }
    const baseQ = await prisma.question.findUnique({ where: { id: orgQ.forkedFromId } });
    if (!baseQ || baseQ.ownerScope !== "PLATFORM") {
      throw new PromoteError("병합 대상 기본 문항을 찾을 수 없습니다.");
    }

    await prisma.question.update({
      where: { id: baseQ.id },
      data: {
        level: orgQ.level,
        difficulty: orgQ.difficulty,
        discrimination: orgQ.discrimination,
        template: orgQ.template,
        followUpHints: orgQ.followUpHints ?? undefined,
        rubricCriteria: orgQ.rubricCriteria ?? undefined,
        sortOrder: orgQ.sortOrder,
        isActive: orgQ.isActive,
      },
    });

    return { id: baseQ.id, externalId: baseQ.externalId, mode };
  }

  let targetCompetencyId = orgQ.competency.forkedFromId;
  if (!targetCompetencyId) {
    const promoted = await promoteCompetency(orgQ.competencyId, "promote_as_new_base");
    targetCompetencyId = promoted.id;
  } else {
    const platformComp = await prisma.competency.findFirst({
      where: { id: targetCompetencyId, ownerScope: "PLATFORM", organizationId: null },
    });
    if (!platformComp) {
      const promoted = await promoteCompetency(orgQ.competencyId, "promote_as_new_base");
      targetCompetencyId = promoted.id;
    }
  }

  const externalId = `PROMO-${orgQ.externalId}`.slice(0, 120);
  const created = await prisma.question.create({
    data: {
      externalId,
      competencyId: targetCompetencyId!,
      level: orgQ.level,
      difficulty: orgQ.difficulty,
      discrimination: orgQ.discrimination,
      template: orgQ.template,
      followUpHints: orgQ.followUpHints ?? undefined,
      rubricCriteria: orgQ.rubricCriteria ?? undefined,
      sortOrder: orgQ.sortOrder,
      isActive: true,
      ownerScope: "PLATFORM",
      organizationId: null,
      forkedFromId: orgQ.forkedFromId ?? orgQ.id,
      createdByUserId: orgQ.createdByUserId,
    },
  });

  return { id: created.id, externalId: created.externalId, mode };
}

export function serializeCompetencyRow(row: {
  id: string;
  code: string;
  nameKo: string;
  nameEn: string | null;
  description: string | null;
  rubricByLevel: unknown;
  ownerScope: ContentOwnerScope;
  organizationId: string | null;
  forkedFromId: string | null;
  isActive: boolean;
  organization?: { name: string } | null;
  forkedFrom?: { code: string; nameKo: string; rubricByLevel: unknown } | null;
  _count?: { questions: number };
}) {
  return {
    id: row.id,
    code: row.code,
    nameKo: row.nameKo,
    nameEn: row.nameEn,
    description: row.description,
    rubricByLevel: row.rubricByLevel,
    ownerScope: row.ownerScope,
    organizationId: row.organizationId,
    organizationName: row.organization?.name ?? null,
    forkedFromId: row.forkedFromId,
    forkedFrom: row.forkedFrom
      ? {
          code: row.forkedFrom.code,
          nameKo: row.forkedFrom.nameKo,
          rubricByLevel: row.forkedFrom.rubricByLevel,
        }
      : null,
    isActive: row.isActive,
    questionCount: row._count?.questions ?? 0,
  };
}

export function serializeQuestionRow(row: {
  id: string;
  externalId: string;
  competencyId: string;
  level: number;
  difficulty: number;
  discrimination: number;
  template: string;
  ownerScope: ContentOwnerScope;
  organizationId: string | null;
  forkedFromId: string | null;
  isActive: boolean;
  competency?: { code: string; nameKo: string };
  forkedFrom?: { template: string; level: number } | null;
}) {
  return {
    id: row.id,
    externalId: row.externalId,
    competencyId: row.competencyId,
    competencyCode: row.competency?.code ?? null,
    competencyNameKo: row.competency?.nameKo ?? null,
    level: row.level,
    difficulty: row.difficulty,
    discrimination: row.discrimination,
    template: row.template,
    ownerScope: row.ownerScope,
    organizationId: row.organizationId,
    forkedFromId: row.forkedFromId,
    forkedFrom: row.forkedFrom
      ? { template: row.forkedFrom.template, level: row.forkedFrom.level }
      : null,
    isActive: row.isActive,
  };
}

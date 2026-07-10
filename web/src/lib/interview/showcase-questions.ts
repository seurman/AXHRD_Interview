import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES } from "@/types";

/** 쇼케이스 문항 목록 — 비로그인 티저·FREE 티어용 */
export async function listShowcaseCompetencies() {
  const rows = await prisma.competency.findMany({
    where: {
      isActive: true,
      ownerScope: "PLATFORM",
      organizationId: null,
      code: { in: [...COMPETENCY_CODES] },
      questions: { some: { isActive: true, isShowcase: true, ownerScope: "PLATFORM", organizationId: null } },
    },
    select: { code: true, nameKo: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows;
}

export async function pickShowcaseQuestion(competencyCode: string, preferredLevel: number) {
  const level = Math.min(5, Math.max(1, preferredLevel));
  const competency = await prisma.competency.findFirst({
    where: {
      code: competencyCode,
      isActive: true,
      ownerScope: "PLATFORM",
      organizationId: null,
    },
    select: { id: true, code: true, nameKo: true },
  });
  if (!competency) return null;

  const exact = await prisma.question.findFirst({
    where: {
      competencyId: competency.id,
      level,
      isActive: true,
      isShowcase: true,
      ownerScope: "PLATFORM",
      organizationId: null,
    },
    orderBy: [{ sortOrder: "asc" }, { externalId: "asc" }],
  });
  if (exact) {
    return { competency, question: exact };
  }

  const fallback = await prisma.question.findFirst({
    where: {
      competencyId: competency.id,
      isActive: true,
      isShowcase: true,
      ownerScope: "PLATFORM",
      organizationId: null,
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
  });
  if (!fallback) return null;
  return { competency, question: fallback };
}

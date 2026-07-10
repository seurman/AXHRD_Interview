import type { ContentOwnerScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** PLATFORM 기본 역량 — organizationId null + ownerScope PLATFORM */
export const PLATFORM_OWNER_FILTER = {
  ownerScope: "PLATFORM" as const,
  organizationId: null,
};

export function platformCompetencyUniqueWhere(code: string): Prisma.CompetencyWhereUniqueInput {
  // Prisma 타입은 nullable 복합유니크의 null을 허용하지 않아 런타임 값만 맞춘다.
  return {
    organizationId_code: {
      organizationId: null,
      code: code.trim().toUpperCase(),
    },
  } as unknown as Prisma.CompetencyWhereUniqueInput;
}

export function platformCompetencyWhere(code: string): Prisma.CompetencyWhereInput {
  return {
    code: code.trim().toUpperCase(),
    ...PLATFORM_OWNER_FILTER,
  };
}

export async function findPlatformCompetencyByCode(code: string) {
  return prisma.competency.findFirst({
    where: platformCompetencyWhere(code),
  });
}

export async function findOrgCompetencyByCode(code: string, organizationId: string) {
  return prisma.competency.findFirst({
    where: {
      code: code.trim().toUpperCase(),
      organizationId,
      ownerScope: "ORG",
    },
  });
}

/** Postgres nullable composite unique — PLATFORM code 중복은 앱에서 검증 */
export async function assertPlatformCompetencyCodeAvailable(
  code: string,
  excludeId?: string
): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const existing = await prisma.competency.findFirst({
    where: {
      ...platformCompetencyWhere(normalized),
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`PLATFORM 역량 코드 「${normalized}」가 이미 존재합니다.`);
  }
}

export function canEditCompetency(
  row: { ownerScope: ContentOwnerScope; organizationId: string | null },
  opts: { isSuperadmin: boolean; organizationId?: string | null }
): boolean {
  if (opts.isSuperadmin) return true;
  if (row.ownerScope === "PLATFORM") return false;
  if (row.ownerScope === "ORG") {
    return Boolean(opts.organizationId && row.organizationId === opts.organizationId);
  }
  return false;
}

export function canEditQuestion(
  row: { ownerScope: ContentOwnerScope; organizationId: string | null; competencyId: string },
  competency: { ownerScope: ContentOwnerScope; organizationId: string | null },
  opts: { isSuperadmin: boolean; organizationId?: string | null }
): boolean {
  if (opts.isSuperadmin) return true;
  if (competency.ownerScope === "PLATFORM") return false;
  return canEditCompetency(row, opts);
}

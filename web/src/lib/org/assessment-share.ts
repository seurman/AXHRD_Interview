import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";

/** 공유 링크 URL 토큰 — kit-share와 동일하게 추측 불가능한 opaque 값 */
export function generateAssessmentShareSlug(): string {
  return randomBytes(9).toString("base64url");
}

type ShareUser = {
  id: string;
  email: string;
  organizationId: string | null;
  orgRole: string;
  platformRole?: string;
};

export type AssessmentShareAccess =
  | {
      allowed: true;
      organizationId: string;
      organizationName: string;
      mode: "org_admin" | "superadmin";
    }
  | { allowed: false; reason: "no_org" | "not_admin" | "not_enabled" };

/** 기관 역량평가 배포 관리 권한 — 기관 ADMIN + assessmentEnabled (슈퍼어드민은 우회) */
export async function resolveAssessmentShareAccess(
  user: ShareUser,
): Promise<AssessmentShareAccess> {
  if (hasSuperadminAccess(user)) {
    if (!user.organizationId) return { allowed: false, reason: "no_org" };
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true },
    });
    if (!org) return { allowed: false, reason: "no_org" };
    return {
      allowed: true,
      organizationId: org.id,
      organizationName: org.name,
      mode: "superadmin",
    };
  }

  if (!user.organizationId) return { allowed: false, reason: "no_org" };
  if (user.orgRole !== "ADMIN") return { allowed: false, reason: "not_admin" };

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, name: true, assessmentEnabled: true, status: true },
  });
  if (!org || org.status !== "APPROVED") return { allowed: false, reason: "no_org" };
  if (!org.assessmentEnabled) return { allowed: false, reason: "not_enabled" };

  return {
    allowed: true,
    organizationId: org.id,
    organizationName: org.name,
    mode: "org_admin",
  };
}

export type PublicAssessmentShare = {
  slug: string;
  label: string;
  organizationName: string;
  scenario: {
    id: string;
    kind: "ROLE_PLAY" | "IN_BASKET";
    titleKo: string;
    roleContext: string | null;
    durationMinutes: number;
    itemCount: number;
    maxTurns: number;
    competencies: Array<{ code: string; nameKo: string }>;
  };
};

/** 공개 접근(/a/[slug]) — 비활성·만료·미승인·기능 미부여면 null(404) */
export async function loadPublicAssessmentShare(
  slug: string,
): Promise<PublicAssessmentShare | null> {
  const share = await prisma.orgAssessmentShare.findUnique({
    where: { slug },
    include: {
      organization: {
        select: { name: true, status: true, assessmentEnabled: true },
      },
      scenario: {
        select: {
          id: true,
          kind: true,
          titleKo: true,
          roleContext: true,
          durationMinutes: true,
          maxTurns: true,
          isActive: true,
          competencies: {
            orderBy: { sortOrder: "asc" },
            select: { competencyCode: true, nameKo: true },
          },
          _count: { select: { inBasketItems: true } },
        },
      },
    },
  });
  if (!share) return null;
  if (!share.isActive) return null;
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) return null;
  if (share.organization.status !== "APPROVED") return null;
  if (!share.organization.assessmentEnabled) return null;
  if (!share.scenario.isActive) return null;

  return {
    slug: share.slug,
    label: share.label,
    organizationName: share.organization.name,
    scenario: {
      id: share.scenario.id,
      kind: share.scenario.kind as "ROLE_PLAY" | "IN_BASKET",
      titleKo: share.scenario.titleKo,
      roleContext: share.scenario.roleContext,
      durationMinutes: share.scenario.durationMinutes,
      maxTurns: share.scenario.maxTurns,
      itemCount: share.scenario._count.inBasketItems,
      competencies: share.scenario.competencies.map((c) => ({
        code: c.competencyCode,
        nameKo: c.nameKo,
      })),
    },
  };
}

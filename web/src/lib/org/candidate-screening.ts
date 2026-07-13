import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgStaff } from "@/lib/auth/guards";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";
import { readOrgEntitlements } from "@/lib/org/entitlements";

export type OrgCandidateScreeningContext = {
  user: Awaited<ReturnType<typeof requireOrgStaff>>;
  competencyEnabled: boolean;
  organizationName: string;
};

/** 역량평가 SaaS(competency entitlement) 기관 담당자 — 지원자 스크리닝 */
export async function resolveOrgCandidateScreening(
  nextPath: string,
): Promise<OrgCandidateScreeningContext> {
  const user = await requireOrgStaff(nextPath);
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      name: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      diagnosticEnabled: true,
    },
  });
  if (!org) notFound();

  const entitlements = readOrgEntitlements(org);
  const competencyEnabled =
    entitlements.competency || hasSuperadminAccess(user);

  return {
    user,
    competencyEnabled,
    organizationName: org.name,
  };
}

/** @deprecated resolveOrgCandidateScreening + competencyEnabled 체크 권장 */
export async function requireOrgCandidateScreening(nextPath: string) {
  const ctx = await resolveOrgCandidateScreening(nextPath);
  if (!ctx.competencyEnabled) notFound();
  return ctx.user;
}

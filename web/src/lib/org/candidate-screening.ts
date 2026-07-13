import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgStaff } from "@/lib/auth/guards";
import { readOrgEntitlements } from "@/lib/org/entitlements";

/** 역량평가 SaaS(competency entitlement) 기관 담당자 전용 — 지원자 스크리닝 화면 */
export async function requireOrgCandidateScreening(nextPath: string) {
  const user = await requireOrgStaff(nextPath);
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      diagnosticEnabled: true,
    },
  });
  if (!org || !readOrgEntitlements(org).competency) notFound();
  return user;
}

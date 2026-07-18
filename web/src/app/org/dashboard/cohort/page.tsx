import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgStaff } from "@/lib/auth/guards";
import { readOrgEntitlements } from "@/lib/org/entitlements";
import { OrgCohortDashboard } from "@/components/org/OrgCohortDashboard";

export const dynamic = "force-dynamic";

/** 복합 SKU 기관 — 면접 코호트 대시보드 전체 화면 */
export default async function OrgCohortDashboardPage() {
  const user = await requireOrgStaff("/org/dashboard/cohort");

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      diagnosticEnabled: true,
      assessmentEnabled: true,
      status: true,
    },
  });

  if (!org || org.status !== "APPROVED") notFound();

  const entitlements = readOrgEntitlements(org);
  if (!entitlements.interview) {
    redirect("/org/dashboard");
  }

  return <OrgCohortDashboard user={user} />;
}

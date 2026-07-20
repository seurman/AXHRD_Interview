import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getCohortData } from "@/lib/org/cohort";
import { getOrgActivityLog } from "@/lib/org/activity-log";
import { getOrgPeopleDashboard } from "@/lib/org/people-dashboard";
import {
  countActiveEntitlements,
  readOrgEntitlements,
} from "@/lib/org/entitlements";
import { OrgOpsConsole } from "@/components/org/OrgOpsConsole";

export const dynamic = "force-dynamic";

/** 기관 통합 운영 콘솔 — 개요 · 구성원 · 승인·좌석 */
export default async function OrgDashboardPage() {
  const user = await requireOrgStaff("/org/dashboard");

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      name: true,
      status: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      diagnosticEnabled: true,
      assessmentEnabled: true,
    },
  });

  if (!org) {
    return <p className="text-muted">기관 정보를 찾을 수 없습니다.</p>;
  }

  const entitlements = readOrgEntitlements(org);
  const cohortMeta = await getCohortData(user.organizationId);

  if (!cohortMeta || org.status !== "APPROVED") {
    const pending = org.status === "PENDING";
    const joinCode = cohortMeta?.joinCode;
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
        <div className="rounded-2xl border border-card-border bg-card p-6">
          <p className="font-medium text-foreground">
            {pending ? "승인 대기 중입니다" : "승인이 거절되었습니다"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {pending
              ? "기관 생성 요청을 검토하고 있습니다. 승인되면 이 콘솔에서 구성원·참여를 관리할 수 있습니다."
              : "이 기관 생성 요청은 승인되지 않았습니다. 문의사항이 있으시면 운영팀에 연락해 주세요."}
          </p>
          {pending && joinCode ? (
            <p className="mt-3 text-xs text-muted">
              가입 코드: <span className="font-mono">{joinCode}</span> (승인 전 사용 불가)
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (
    entitlements.diagnostic &&
    !entitlements.interview &&
    !entitlements.competency &&
    !entitlements.assessment
  ) {
    redirect("/org/diagnosis");
  }

  const activeCount = countActiveEntitlements(entitlements);
  void activeCount;

  const [people, activityPreview] = await Promise.all([
    getOrgPeopleDashboard(user.organizationId),
    getOrgActivityLog(user.organizationId, 8),
  ]);

  if (!people) {
    return <p className="text-muted">기관 정보를 찾을 수 없습니다.</p>;
  }

  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <OrgOpsConsole
        organizationName={org.name}
        orgRole={user.orgRole}
        entitlements={entitlements}
        cohort={cohortMeta}
        people={people}
        activityPreview={activityPreview}
      />
    </Suspense>
  );
}

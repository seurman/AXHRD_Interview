import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getCohortData } from "@/lib/org/cohort";
import {
  countActiveEntitlements,
  readOrgEntitlements,
} from "@/lib/org/entitlements";
import { getCompetencyHomeData } from "@/lib/org/competency-home-data";
import { getOrgOverviewData } from "@/lib/org/overview-data";
import { OrgCohortDashboard } from "@/components/org/OrgCohortDashboard";
import { OrgCompetencyHome } from "@/components/org/OrgCompetencyHome";
import { OrgOverview } from "@/components/org/OrgOverview";

export const dynamic = "force-dynamic";

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

  const cohortMeta = await getCohortData(user.organizationId);

  if (!cohortMeta || org.status !== "APPROVED") {
    const pending = org.status === "PENDING";
    const joinCode = cohortMeta?.joinCode;
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
        <div className="card-luxe space-y-3 p-6">
          <p className="font-medium text-foreground">
            {pending ? "승인 대기 중입니다" : "승인이 거절되었습니다"}
          </p>
          <p className="text-sm text-muted">
            {pending
              ? "기관 생성 요청을 검토하고 있습니다. 승인되면 가입 코드로 학생을 받고 참여 현황을 이용하실 수 있습니다."
              : "이 기관 생성 요청은 승인되지 않았습니다. 문의사항이 있으시면 운영팀에 연락해 주세요."}
          </p>
          {pending && joinCode && (
            <p className="text-xs text-muted">
              학생 가입 코드: <span className="font-mono">{joinCode}</span> (승인 전까지는
              이 코드로 가입할 수 없습니다)
            </p>
          )}
        </div>
      </div>
    );
  }

  const entitlements = readOrgEntitlements(org);
  const activeCount = countActiveEntitlements(entitlements);

  if (entitlements.diagnostic && !entitlements.interview && !entitlements.competency) {
    redirect("/org/diagnosis");
  }

  if (activeCount >= 2) {
    const overview = await getOrgOverviewData(user.organizationId, entitlements);
    return <OrgOverview data={overview} entitlements={entitlements} />;
  }

  if (entitlements.competency && !entitlements.interview) {
    const competencyHome = await getCompetencyHomeData(user.organizationId);
    return (
      <OrgCompetencyHome
        organizationName={org.name}
        data={competencyHome}
        isAdmin={user.orgRole === "ADMIN"}
      />
    );
  }

  if (entitlements.interview) {
    return <OrgCohortDashboard user={user} />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
      <div className="card-luxe space-y-3 p-6">
        <p className="font-medium text-foreground">활성화된 상품이 없습니다</p>
        <p className="text-sm text-muted">
          기관 승인은 완료되었으나 면접·역량평가·조직진단 상품이 아직 켜지지 않았습니다.
          운영팀에 문의해 주세요.
        </p>
      </div>
    </div>
  );
}

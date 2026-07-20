import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getCohortData } from "@/lib/org/cohort";
import { getOrgActivityLog } from "@/lib/org/activity-log";
import { OrgActivityLogPanel } from "@/components/org/OrgActivityLogPanel";

export const dynamic = "force-dynamic";

const ORG_ACTIVITY_PAGE_LIMIT = 100;

export default async function OrgDashboardActivityPage() {
  const user = await requireOrgStaff("/org/dashboard/activity");
  const data = await getCohortData(user.organizationId);

  if (!data) {
    return <p className="text-muted">기관 정보를 찾을 수 없습니다.</p>;
  }

  if (data.status !== "APPROVED") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/org/dashboard" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          참여 현황으로
        </Link>
        <p className="text-sm text-muted">기관 승인 후 활동 로그를 확인하실 수 있습니다.</p>
      </div>
    );
  }

  const rows = await getOrgActivityLog(user.organizationId, ORG_ACTIVITY_PAGE_LIMIT);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/org/dashboard" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          참여 현황으로
        </Link>
        <p className="mt-2 text-xs font-medium uppercase tracking-widest text-gold">Activity Log</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{data.organizationName} · 활동 로그</h1>
        <p className="mt-1 text-sm text-muted">
          소속 구성원이 언제 어떤 역량으로 모의면접·자기발견 인터뷰를 완료했는지 보여줍니다. 답변
          원문은 표시되지 않습니다.
        </p>
      </div>

      <OrgActivityLogPanel rows={rows} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOrganizationsViewer } from "@/lib/auth/guards";
import { getOrgHubSnapshot } from "@/lib/org/hub-data";
import { getCohortData } from "@/lib/org/cohort";
import { getOrgBenchmark, MIN_PEER_MEMBERS } from "@/lib/org/benchmark";
import { formatPercentile } from "@/lib/labels";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { CohortCompetencyBarChart } from "@/components/charts/CohortCompetencyBarChart";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgCohortPage({ params }: Props) {
  await requireOrganizationsViewer("/admin/organizations");
  const { id } = await params;
  const hub = await getOrgHubSnapshot(id);
  if (!hub) notFound();

  const data = await getCohortData(id);
  if (!data) notFound();

  const benchmark = data.status === "APPROVED" ? await getOrgBenchmark(id) : null;
  const hubBase = `/admin/organizations/${hub.id}`;

  return (
    <div className={ADMIN_CONTAINER.detail}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.tenants}
        title={data.organizationName}
        subtitle="기관 ADMIN 참여 현황과 동일한 집계"
        breadcrumb={[
          { label: "기관 관리", href: "/admin/organizations" },
          { label: hub.name, href: hubBase },
          { label: "참여 현황" },
        ]}
        actions={
          <Link href={hubBase} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            기관 허브
          </Link>
        }
      />

      <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--platform-border)] bg-[var(--platform-border)] sm:grid-cols-3">
        <div className="org-ops-kpi bg-[var(--platform-surface)] px-5 py-5 text-center">
          <p className="font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tabular-nums text-[var(--platform-text)]">
            {data.memberCount}
          </p>
          <p className="mt-1 text-xs text-[var(--platform-text-muted)]">소속 학생</p>
        </div>
        <div className="org-ops-kpi bg-[var(--platform-surface)] px-5 py-5 text-center">
          <p className="font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tabular-nums text-[var(--platform-text)]">
            {data.totalCompletedSessions}
          </p>
          <p className="mt-1 text-xs text-[var(--platform-text-muted)]">완료 면접</p>
        </div>
        <div className="org-ops-kpi bg-[var(--platform-surface)] px-5 py-5 text-center">
          <p className="font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tabular-nums text-[var(--platform-text)]">
            {data.overallAvgPercentile != null ? data.overallAvgPercentile : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--platform-text-muted)]">평균 백분위</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6 platform-panel--elevated">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-[var(--platform-text)]">역량별 평균</h2>
          <span className="text-[11px] text-[var(--platform-text-muted)]">호버로 상세</span>
        </div>
        <CohortCompetencyBarChart
          items={data.competencies}
          emptyHint="아직 데이터가 없습니다."
        />
      </div>

      {benchmark && !benchmark.insufficientPeerData && (
        <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6">
          <h2 className="mb-2 font-semibold text-[var(--platform-text)]">기관 간 비교</h2>
          <p className="mb-4 text-xs text-[var(--platform-text-muted)]">
            학생 {MIN_PEER_MEMBERS}명 이상 기관만 비교에 포함됩니다.
          </p>
          <p className="text-2xl font-bold text-[var(--platform-text)]">
            {benchmark.rankPercentile != null
              ? `상위 ${Math.max(0, 100 - benchmark.rankPercentile)}%`
              : "—"}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-6">
        <h2 className="mb-4 font-semibold text-[var(--platform-text)]">학생 현황</h2>
        {data.members.length === 0 ? (
          <p className="text-sm text-[var(--platform-text-muted)]">연결된 학생이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--platform-border)] text-xs text-[var(--platform-text-muted)]">
                  <th className="py-2 pr-4">이름</th>
                  <th className="py-2 pr-4">완료</th>
                  <th className="py-2 pr-4">백분위</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--platform-border)]/60">
                    <td className="py-2.5 pr-4 font-medium text-[var(--platform-text)]">{m.name}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--platform-text-muted)]">
                      {m.completedSessions}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-[var(--platform-text)]">
                      {m.avgPercentile != null ? formatPercentile(m.avgPercentile) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

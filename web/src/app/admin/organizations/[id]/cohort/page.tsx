import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOrganizationsViewer } from "@/lib/auth/guards";
import { getOrgHubSnapshot } from "@/lib/org/hub-data";
import { getCohortData } from "@/lib/org/cohort";
import { getOrgBenchmark, MIN_PEER_MEMBERS } from "@/lib/org/benchmark";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.memberCount}</p>
          <p className="mt-1 text-xs text-muted">소속 학생</p>
        </div>
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.totalCompletedSessions}</p>
          <p className="mt-1 text-xs text-muted">완료 면접</p>
        </div>
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">
            {data.overallAvgPercentile != null ? data.overallAvgPercentile : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">평균 백분위</p>
        </div>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">역량별 평균</h2>
        {data.competencies.length === 0 ? (
          <p className="text-sm text-muted">아직 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {data.competencies.map((c) => (
              <div key={c.competency}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{competencyLabel(c.competency)}</span>
                  <span className="text-muted">{formatPercentile(c.avgPercentile)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${Math.max(4, Math.min(100, c.avgPercentile))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {benchmark && !benchmark.insufficientPeerData && (
        <div className="card-luxe p-6">
          <h2 className="mb-2 font-semibold text-foreground">기관 간 비교</h2>
          <p className="mb-4 text-xs text-muted">
            학생 {MIN_PEER_MEMBERS}명 이상 기관만 비교에 포함됩니다.
          </p>
          <p className="text-2xl font-bold text-foreground">
            {benchmark.rankPercentile != null
              ? `상위 ${Math.max(0, 100 - benchmark.rankPercentile)}%`
              : "—"}
          </p>
        </div>
      )}

      <div className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">학생 현황</h2>
        {data.members.length === 0 ? (
          <p className="text-sm text-muted">연결된 학생이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4">이름</th>
                  <th className="py-2 pr-4">완료</th>
                  <th className="py-2 pr-4">백분위</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-4">{m.name}</td>
                    <td className="py-2 pr-4 text-muted">{m.completedSessions}</td>
                    <td className="py-2 pr-4 text-muted">
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

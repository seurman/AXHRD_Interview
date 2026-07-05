import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getAllOrgBenchmarks } from "@/lib/org/benchmark";

export const dynamic = "force-dynamic";

export default async function AdminOrgBenchmarkPage() {
  await requireSuperadmin("/admin/organizations/benchmark");
  const rows = await getAllOrgBenchmarks();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">기관 간 퍼포먼스 비교</h1>
        <p className="mt-1 text-sm text-muted">
          승인된 기관 전체를 평균 백분위 기준으로 정렬했습니다. 이 화면은 슈퍼어드민에게만
          보이며, 기관 담당자 화면(코호트 대시보드)에는 다른 기관 이름이 노출되지 않습니다.
        </p>
        <Link href="/admin/organizations" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← 기관 승인 관리로 돌아가기
        </Link>
      </div>

      <div className="card-luxe p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">승인된 기관이 아직 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">순위</th>
                  <th className="py-2 pr-4 font-medium">기관명</th>
                  <th className="py-2 pr-4 font-medium">학생 수</th>
                  <th className="py-2 pr-4 font-medium">활동 학생 수</th>
                  <th className="py-2 pr-4 font-medium">완료율</th>
                  <th className="py-2 pr-4 font-medium">평균 백분위</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-4 text-muted">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-foreground">{r.name}</td>
                    <td className="py-2 pr-4 text-muted">{r.memberCount}</td>
                    <td className="py-2 pr-4 text-muted">{r.activeMemberCount}</td>
                    <td className="py-2 pr-4 text-muted">
                      {r.completionRate != null ? `${r.completionRate}%` : "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {r.overallAvgPercentile ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        개인 답변 원문은 이 화면에 표시되지 않습니다 — 기관 단위 집계 수치만 표시됩니다.
      </p>
    </div>
  );
}

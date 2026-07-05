import Link from "next/link";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getCohortData } from "@/lib/org/cohort";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { CopyCodeButton } from "@/components/org/CopyCodeButton";
import { RegenerateCodeButton } from "@/components/org/RegenerateCodeButton";

export const dynamic = "force-dynamic";

export default async function OrgDashboardPage() {
  const user = await requireOrgStaff("/org/dashboard");
  const data = await getCohortData(user.organizationId);

  if (!data) {
    return <p className="text-muted">기관 정보를 찾을 수 없습니다.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          Cohort Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{data.organizationName}</h1>
        <p className="mt-1 text-sm text-muted">
          소속 학생들의 모의 면접 진행 현황과 역량 수준을 한눈에 확인하세요.
        </p>
      </div>

      <div className="card-luxe flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-foreground">학생 가입 코드</p>
          <p className="mt-1 font-mono text-lg tracking-wider text-accent">{data.joinCode}</p>
          <p className="mt-1 text-xs text-muted">
            학생들이 프로필 &gt; 기관 연결 화면에서 이 코드를 입력하면 자동으로 소속됩니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CopyCodeButton code={data.joinCode} />
          {user.orgRole === "ADMIN" && <RegenerateCodeButton />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.memberCount}</p>
          <p className="mt-1 text-xs text-muted">소속 학생 수</p>
        </div>
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.totalCompletedSessions}</p>
          <p className="mt-1 text-xs text-muted">누적 완료 면접 수</p>
        </div>
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">
            {data.overallAvgPercentile != null ? `${data.overallAvgPercentile}` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted">전체 평균 백분위</p>
        </div>
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-1 font-semibold text-foreground">역량별 평균 수준</h2>
        <p className="mb-4 text-xs text-muted">
          백분위가 낮은 역량부터 표시됩니다 — 코호트 전체가 취약한 영역입니다.
        </p>
        {data.competencies.length === 0 ? (
          <p className="text-sm text-muted">아직 완료된 면접 데이터가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {data.competencies.map((c) => (
              <div key={c.competency}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {competencyLabel(c.competency)}
                  </span>
                  <span className="text-muted">
                    {formatPercentile(c.avgPercentile)} · 참여 {c.memberCount}명
                  </span>
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

      <div className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">학생 현황</h2>
        {data.members.length === 0 ? (
          <p className="text-sm text-muted">
            아직 가입 코드로 연결된 학생이 없습니다. 위 코드를 학생들에게 공유해 주세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">이름</th>
                  <th className="py-2 pr-4 font-medium">완료 면접</th>
                  <th className="py-2 pr-4 font-medium">평균 백분위</th>
                  <th className="py-2 pr-4 font-medium">최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-4 text-foreground">{m.name}</td>
                    <td className="py-2 pr-4 text-muted">{m.completedSessions}</td>
                    <td className="py-2 pr-4 text-muted">
                      {m.avgPercentile != null ? formatPercentile(m.avgPercentile) : "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {m.lastActiveAt
                        ? new Date(m.lastActiveAt).toLocaleDateString("ko-KR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        개인 답변 원문은 이 화면에 표시되지 않습니다 — 점수·완료 현황만 집계됩니다.{" "}
        <Link href="/dashboard" className="text-accent hover:underline">
          내 대시보드로 돌아가기
        </Link>
      </p>
    </div>
  );
}

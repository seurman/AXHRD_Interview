import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getCohortData } from "@/lib/org/cohort";
import { getOrgBenchmark, MIN_PEER_MEMBERS } from "@/lib/org/benchmark";
import { getOrgActivityLog } from "@/lib/org/activity-log";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { CopyCodeButton } from "@/components/org/CopyCodeButton";
import { RegenerateCodeButton } from "@/components/org/RegenerateCodeButton";
import { OrgActivityLogPanel } from "@/components/org/OrgActivityLogPanel";

export const dynamic = "force-dynamic";

/** 코호트 홈에서는 최근 활동 미리보기만 — 전체 로그는 /org/dashboard/activity에서 본다. */
const ORG_ACTIVITY_PREVIEW_LIMIT = 6;

export default async function OrgDashboardPage() {
  const user = await requireOrgStaff("/org/dashboard");
  const data = await getCohortData(user.organizationId);

  if (!data) {
    return <p className="text-muted">기관 정보를 찾을 수 없습니다.</p>;
  }

  const [benchmark, activityPreview] = await Promise.all([
    data.status === "APPROVED" ? getOrgBenchmark(user.organizationId) : Promise.resolve(null),
    data.status === "APPROVED"
      ? getOrgActivityLog(user.organizationId, ORG_ACTIVITY_PREVIEW_LIMIT)
      : Promise.resolve([]),
  ]);

  if (data.status !== "APPROVED") {
    const pending = data.status === "PENDING";
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{data.organizationName}</h1>
        <div className="card-luxe space-y-3 p-6">
          <p className="font-medium text-foreground">
            {pending ? "승인 대기 중입니다" : "승인이 거절되었습니다"}
          </p>
          <p className="text-sm text-muted">
            {pending
              ? "기관 생성 요청을 검토하고 있습니다. 승인되면 가입 코드로 학생을 받고 코호트 대시보드를 이용하실 수 있습니다."
              : "이 기관 생성 요청은 승인되지 않았습니다. 문의사항이 있으시면 운영팀에 연락해 주세요."}
          </p>
          {pending && (
            <p className="text-xs text-muted">
              학생 가입 코드: <span className="font-mono">{data.joinCode}</span> (승인 전까지는
              이 코드로 가입할 수 없습니다)
            </p>
          )}
        </div>
      </div>
    );
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

      {user.orgRole === "ADMIN" && (
        <div className="card-luxe flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">인터뷰 킷 빌더</p>
            <p className="mt-1 text-xs text-muted">
              역량별 문항 풀·루브릭 강조점을 기관 맞춤으로 설정합니다 (ORG_STANDARD /
              ORG_ENTERPRISE).
            </p>
          </div>
          <Link href="/org/settings" className="btn-secondary shrink-0 text-sm">
            면접 설정
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="card-luxe p-5 text-center">
          <p className="text-3xl font-bold text-foreground">{data.integritySignalSessions}</p>
          <p className="mt-1 text-xs text-muted">
            주의 신호 세션
            <span className="mt-0.5 block font-normal text-muted/80">
              붙여넣기·탭이탈 3회+
            </span>
          </p>
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
        <h2 className="mb-1 font-semibold text-foreground">다른 학교와 비교</h2>
        <p className="mb-4 text-xs text-muted">
          다른 기관의 이름은 표시되지 않으며, 학생 수 {MIN_PEER_MEMBERS}명 이상인 기관만 비교
          평균에 포함됩니다.
        </p>
        {!benchmark || benchmark.insufficientPeerData ? (
          <p className="text-sm text-muted">
            아직 비교할 수 있는 다른 기관 데이터가 충분하지 않습니다.
          </p>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-background p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {benchmark.rankPercentile != null
                    ? `상위 ${Math.max(0, 100 - benchmark.rankPercentile)}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  전체 {benchmark.peerOrgCount + 1}개 기관 중 순위
                </p>
              </div>
              <div className="rounded-xl bg-background p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {benchmark.ownCompletionRate != null ? `${benchmark.ownCompletionRate}%` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  완료율 · 비교 평균{" "}
                  {benchmark.peerAvgCompletionRate != null
                    ? `${Math.round(benchmark.peerAvgCompletionRate)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-background p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {benchmark.ownOverallAvgPercentile ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  평균 백분위 · 비교 평균{" "}
                  {benchmark.peerAvgOverallPercentile != null
                    ? Math.round(benchmark.peerAvgOverallPercentile)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {benchmark.competencies.map((c) => (
                <div key={c.competency}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {competencyLabel(c.competency)}
                    </span>
                    <span className="text-muted">
                      우리 학교{" "}
                      {c.ownAvgPercentile != null ? Math.round(c.ownAvgPercentile) : "—"} · 비교
                      평균{" "}
                      {c.peerAvgPercentile != null ? Math.round(c.peerAvgPercentile) : "—"}
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{
                        width: `${Math.max(4, Math.min(100, c.ownAvgPercentile ?? 0))}%`,
                      }}
                    />
                    {c.peerAvgPercentile != null && (
                      <div
                        className="absolute top-0 h-2 w-0.5 bg-foreground/50"
                        style={{ left: `${Math.max(0, Math.min(100, c.peerAvgPercentile))}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              막대는 우리 학교 평균 백분위, 세로선은 비교 대상 기관들의 평균 위치입니다.
            </p>
          </>
        )}
      </div>

      {data.status === "APPROVED" && (
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">최근 활동</h2>
              <p className="mt-1 text-xs text-muted">누가 언제 어떤 역량으로 활동했는지 보여줍니다.</p>
            </div>
            <Link
              href="/org/dashboard/activity"
              className="flex items-center gap-1 text-sm font-medium text-gold hover:underline"
            >
              전체 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <OrgActivityLogPanel rows={activityPreview} />
        </div>
      )}

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
                  <th className="py-2 font-medium">상세 리포트</th>
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
                    <td className="py-2">
                      {m.coachingConsent ? (
                        <Link
                          href={`/org/dashboard/members/${m.id}`}
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          상세 보기
                        </Link>
                      ) : (
                        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                          비공개
                        </span>
                      )}
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

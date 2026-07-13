import Link from "next/link";
import { requireSessionsViewer } from "@/lib/auth/guards";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { Badge } from "@/components/admin/Badge";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { competencyLabel } from "@/lib/labels";
import { formatRelativeTime } from "@/lib/admin/relative-time";
import {
  getCompetencyDimensionChecks,
  getDimensionsHealthSummary,
  getRecentResponseDimensionRows,
} from "@/lib/admin/response-dimensions-health";
import {
  ANSWER_DIMENSION_KEYS,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";

export const dynamic = "force-dynamic";

const DIMENSION_SHORT: Record<(typeof ANSWER_DIMENSION_KEYS)[number], string> = {
  questionIntent: "의도",
  situationSpecificity: "상황",
  individualOwnership: "기여",
  logic: "논리",
  outcomeQuantification: "성과",
  delivery: "전달",
};

function pct01(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function coveragePct(part: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

function DimensionPills({ dimensions }: { dimensions: AnswerDimensions }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ANSWER_DIMENSION_KEYS.map((key) => (
        <span
          key={key}
          className="rounded-full border border-card-border bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted"
        >
          {DIMENSION_SHORT[key]} {pct01(dimensions[key])}
        </span>
      ))}
    </div>
  );
}

export default async function AdminDataStoragePage() {
  await requireSessionsViewer("/admin/data-storage");

  const [summary, recentRows, competencyChecks] = await Promise.all([
    getDimensionsHealthSummary(),
    getRecentResponseDimensionRows(30),
    getCompetencyDimensionChecks(20),
  ]);

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="데이터 저장 검증"
        subtitle="매턴 Gemini가 계산한 AnswerDimensions가 ResponseRecord에 저장되는지, 역량 완료 시 CompetencyFeedback.dimensions가 실측 평균으로 덮어써지는지 확인합니다."
        links={[
          { href: "/admin/sessions", label: "면접 세션 로그 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ResponseRecord 전체"
          value={String(summary.responseTotal)}
          hint={`dimensions 저장 ${summary.responseWithDimensions}건 (${coveragePct(summary.responseWithDimensions, summary.responseTotal)})`}
        />
        <StatCard
          label="dimensions 미저장"
          value={String(summary.responseWithoutDimensions)}
          hint="마이그레이션 이전·레거시 세션"
          tone={summary.responseWithoutDimensions > 0 ? "warn" : "ok"}
        />
        <StatCard
          label="CompetencyFeedback"
          value={String(summary.competencyFeedbackTotal)}
          hint={`dimensions 있음 ${summary.competencyFeedbackWithDimensions}건`}
        />
        <StatCard
          label="최근 검증 샘플"
          value={`${competencyChecks.filter((c) => c.match === true).length}/${competencyChecks.filter((c) => c.match !== null).length}`}
          hint="실측 평균 vs 저장값 일치(±1점)"
          tone={
            competencyChecks.some((c) => c.match === false) ? "warn" : "ok"
          }
        />
      </div>

      <AdminSection
        title="최근 응답 · dimensions 저장"
        description="최신 ResponseRecord 30건. dimensions가 null이면 저장 파이프라인을 확인하세요."
      >
        {recentRows.length === 0 ? (
          <p className="text-sm text-muted">저장된 응답이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">시각</th>
                  <th className="py-2 pr-3 font-medium">사용자</th>
                  <th className="py-2 pr-3 font-medium">역량</th>
                  <th className="py-2 pr-3 font-medium">점수</th>
                  <th className="py-2 pr-3 font-medium">저장</th>
                  <th className="py-2 pr-3 font-medium">6축 (0~1)</th>
                  <th className="py-2 font-medium">세션</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row) => (
                  <tr key={row.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-3 text-xs text-muted">
                      {formatRelativeTime(row.createdAt)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-foreground">
                        {row.userName ?? "—"}
                      </span>
                      <span className="block text-xs text-muted">{row.userEmail}</span>
                    </td>
                    <td className="py-2 pr-3 text-muted">
                      {competencyLabel(row.competency)}
                      {row.isBonusQuestion ? (
                        <Badge tone="gold" className="ml-1">
                          보너스
                        </Badge>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {Math.round(row.rubricScore * 100)}점
                    </td>
                    <td className="py-2 pr-3">
                      {row.hasDimensions ? (
                        <Badge tone="success">OK</Badge>
                      ) : (
                        <Badge tone="neutral">null</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {row.dimensions ? (
                        <DimensionPills dimensions={row.dimensions} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/sessions/${row.sessionId}`}
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        {row.sessionId.slice(0, 8)}…
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="역량 리포트 · 실측 vs 저장"
        description="CompetencyFeedback.dimensions가 해당 세션 ResponseRecord.dimensions 평균(0~100)과 일치하는지 검증합니다."
      >
        {competencyChecks.length === 0 ? (
          <p className="text-sm text-muted">역량 피드백이 아직 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">생성</th>
                  <th className="py-2 pr-3 font-medium">역량</th>
                  <th className="py-2 pr-3 font-medium">매턴</th>
                  <th className="py-2 pr-3 font-medium">실측 평균</th>
                  <th className="py-2 pr-3 font-medium">DB 저장값</th>
                  <th className="py-2 pr-3 font-medium">일치</th>
                  <th className="py-2 font-medium">세션</th>
                </tr>
              </thead>
              <tbody>
                {competencyChecks.map((row) => (
                  <tr key={row.feedbackId} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-3 text-xs text-muted">
                      {formatRelativeTime(row.generatedAt)}
                    </td>
                    <td className="py-2 pr-3 text-muted">{competencyLabel(row.competency)}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted">
                      {row.responseWithDimensions}/{row.responseCount}
                    </td>
                    <td className="py-2 pr-3">
                      {row.measured ? (
                        <div className="flex flex-wrap gap-1 font-mono text-[11px] text-muted">
                          {ANSWER_DIMENSION_KEYS.map((key) => (
                            <span key={key}>
                              {DIMENSION_SHORT[key]} {row.measured![key]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">폴백(레거시)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {row.stored ? (
                        <div className="flex flex-wrap gap-1 font-mono text-[11px] text-muted">
                          {ANSWER_DIMENSION_KEYS.map((key) => (
                            <span key={key}>
                              {DIMENSION_SHORT[key]} {row.stored![key]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {row.match === true ? (
                        <Badge tone="success">일치</Badge>
                      ) : row.match === false ? (
                        <Badge tone="gold">불일치</Badge>
                      ) : (
                        <Badge tone="neutral">폴백</Badge>
                      )}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/sessions/${row.sessionId}`}
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        {row.sessionId.slice(0, 8)}…
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "ok",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="card-luxe p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-warning" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

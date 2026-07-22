import Link from "next/link";
import {
  ANSWER_DIMENSION_KEYS,
  type AnswerDimensionKey,
} from "@/lib/interview/answer-dimensions";
import { competencyLabel, dimensionLabel } from "@/lib/labels";
import { QuadScopeBadge } from "@/components/quadscope/QuadScopeBadge";
import type { CandidateComparisonPayload } from "@/lib/org/candidate-comparison";

function dimPct(value: number | undefined): number {
  return value != null ? Math.round(value * 100) : 0;
}

function dimBarClass(value: number | undefined): string {
  const pct = value ?? 0;
  if (pct >= 0.7) return "bg-success/70";
  if (pct >= 0.55) return "bg-gold/70";
  return "bg-warning/60";
}

/** 캠페인 내 지원자 역량·QuadScope·6축 비교표 */
export function CandidateCompareView({ data }: { data: CandidateComparisonPayload }) {
  if (data.rows.length < 2) {
    return (
      <p className="text-sm text-muted">
        비교하려면 완료 지원자가 2명 이상 필요합니다.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-muted">
              <th className="sticky left-0 bg-card py-2 pr-4 font-medium">지원자</th>
              <th className="py-2 pr-4 font-medium">종합</th>
              <th className="py-2 pr-4 font-medium">역량</th>
              <th className="py-2 pr-4 font-medium">QuadScope</th>
              {ANSWER_DIMENSION_KEYS.map((k) => (
                <th key={k} className="py-2 pr-3 font-medium whitespace-nowrap">
                  {dimensionLabel(k).replace(/\(.*\)/, "").trim()}
                </th>
              ))}
              <th className="py-2 font-medium">신호</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rank) => (
              <tr key={row.sessionId} className="border-b border-card-border last:border-0">
                <td className="sticky left-0 bg-card py-3 pr-4">
                  <p className="font-medium text-foreground">
                    <span className="mr-2 text-xs text-muted">#{rank + 1}</span>
                    {row.name}
                  </p>
                  <p className="text-xs text-muted">
                    {row.completedAt
                      ? new Date(row.completedAt).toLocaleDateString("ko-KR")
                      : "—"}
                  </p>
                </td>
                <td className="py-3 pr-4 font-semibold text-foreground">
                  {row.avgScore != null ? `${row.avgScore}` : "—"}
                </td>
                <td className="py-3 pr-4 text-muted">
                  {row.focusCompetency ? competencyLabel(row.focusCompetency) : "—"}
                </td>
                <td className="py-3 pr-4">
                  {row.focusCompetency ? (
                    <QuadScopeBadge competencyCode={row.focusCompetency} showKo />
                  ) : (
                    "—"
                  )}
                </td>
                {ANSWER_DIMENSION_KEYS.map((k) => (
                  <td key={k} className="py-3 pr-3">
                    <DimCell dimKey={k} value={row.dimensions?.[k]} />
                  </td>
                ))}
                <td className="py-3 text-xs text-muted">
                  {row.pasteDetected && <span className="text-warning">붙여넣기 </span>}
                  {row.tabSwitchCount >= 3 && (
                    <span className="text-warning">탭이탈 {row.tabSwitchCount}</span>
                  )}
                  {!row.pasteDetected && row.tabSwitchCount < 3 && "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        6축은 세션 내 답변 평균(0–100)입니다. 개인 답변 원문은 표시하지 않습니다.{" "}
        {data.rows.map((r) => (
          <Link
            key={r.sessionId}
            href={`/org/candidates/session/${r.sessionId}`}
            className="mr-3 text-accent hover:underline"
          >
            {r.name} 리포트
          </Link>
        ))}
      </p>
    </div>
  );
}

function DimCell({ dimKey, value }: { dimKey: AnswerDimensionKey; value?: number }) {
  const pct = dimPct(value);
  return (
    <div className="min-w-[4.5rem]" title={`${dimensionLabel(dimKey)} ${pct}%`}>
      <div className="mb-0.5 text-[10px] text-muted">{pct}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-background">
        <div
          className={`h-full rounded-full ${dimBarClass(value)}`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}

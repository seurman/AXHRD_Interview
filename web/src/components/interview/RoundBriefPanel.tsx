import { competencyLabel } from "@/lib/labels";
import type { RoundBrief } from "@/lib/interview/competency-round";
import { buildRoundNarrative } from "@/lib/dashboard/career-narrative";
import { NarrativeLead } from "@/components/dashboard/NarrativeLead";

interface RoundBriefPanelProps {
  brief: RoundBrief;
  roundLabel?: string;
}

/** 차수 면접 완료 후 강점·보완점 텍스트 요약 */
export function RoundBriefPanel({ brief, roundLabel }: RoundBriefPanelProps) {
  const competencies = Array.isArray(brief.competencies) ? brief.competencies : [];
  const strengthBullets = Array.isArray(brief.strengthBullets) ? brief.strengthBullets : [];
  const improvementBullets = Array.isArray(brief.improvementBullets)
    ? brief.improvementBullets
    : [];
  const strengthsText =
    typeof brief.strengthsText === "string" && brief.strengthsText.trim()
      ? brief.strengthsText
      : "이번 차수에서 두드러진 강점 패턴을 더 쌓아 보세요.";
  const improvementsText =
    typeof brief.improvementsText === "string" && brief.improvementsText.trim()
      ? brief.improvementsText
      : "다음 차수에서는 답변에 수치·본인 행동·결과를 한 문장씩 더 넣어 보세요.";
  const narrative = buildRoundNarrative({
    ...brief,
    competencies,
    strengthBullets,
    improvementBullets,
    strengthsText,
    improvementsText,
  });
  return (
    <section className="card-luxe space-y-4 p-6">
      <NarrativeLead text={narrative} label="차수 한 줄" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
          {roundLabel ?? "이번 차수 요약"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {competencies.map((c) => competencyLabel(c)).join(" · ")}
          {brief.timeBudgetMinutes ? ` · ${brief.timeBudgetMinutes}분` : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-success">차수 강점</h3>
          <p className="text-sm leading-relaxed text-foreground">{strengthsText}</p>
          {strengthBullets.length > 1 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {strengthBullets.slice(1).map((s) => (
                <li key={s}>✓ {s}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-warning">차수 보완점</h3>
          <p className="text-sm leading-relaxed text-foreground">{improvementsText}</p>
          {improvementBullets.length > 1 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {improvementBullets.slice(1).map((s) => (
                <li key={s}>↑ {s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

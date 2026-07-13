import { competencyLabel } from "@/lib/labels";
import type { RoundBrief } from "@/lib/interview/competency-round";

interface RoundBriefPanelProps {
  brief: RoundBrief;
  roundLabel?: string;
}

/** 차수 면접 완료 후 강점·보완점 텍스트 요약 */
export function RoundBriefPanel({ brief, roundLabel }: RoundBriefPanelProps) {
  return (
    <section className="card-luxe space-y-4 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
          {roundLabel ?? "이번 차수 요약"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {brief.competencies.map((c) => competencyLabel(c)).join(" · ")}
          {brief.timeBudgetMinutes ? ` · ${brief.timeBudgetMinutes}분` : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-success">차수 강점</h3>
          <p className="text-sm leading-relaxed text-foreground">{brief.strengthsText}</p>
          {brief.strengthBullets.length > 1 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {brief.strengthBullets.slice(1).map((s) => (
                <li key={s}>✓ {s}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-warning">차수 보완점</h3>
          <p className="text-sm leading-relaxed text-foreground">{brief.improvementsText}</p>
          {brief.improvementBullets.length > 1 && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {brief.improvementBullets.slice(1).map((s) => (
                <li key={s}>↑ {s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

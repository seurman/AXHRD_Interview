"use client";

import Link from "next/link";
import { competencyLabel } from "@/lib/labels";
import { RoundBriefPanel } from "@/components/interview/RoundBriefPanel";
import type { RoundBrief } from "@/lib/interview/competency-round";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DimensionAxesPanel } from "./DimensionAxesPanel";
import { InteractivePercentileBars } from "@/components/charts/InteractivePercentileBars";

export type CompetencyDeltaRow = {
  competency: string;
  percentile: number;
  delta: number | null;
  levelEst: number;
  assessed: boolean;
};

export type AccessLogRow = {
  id: string;
  label: string;
  href: string;
  at: string;
  kind: "interview" | "discover" | "resume";
};

export type CoachInsightsPayload = {
  competencyDeltas: CompetencyDeltaRow[];
  latestDimensions: Record<string, number> | null;
  recentRounds: RoundBrief[];
  accessLog: AccessLogRow[];
};

export function CoachInsightsPanel({
  competencyDeltas,
  latestDimensions,
  recentRounds,
  accessLog,
}: CoachInsightsPayload) {
  const { dict } = useI18n();
  const ci = dict.dashboard.coachInsights;
  const deltas = Array.isArray(competencyDeltas) ? competencyDeltas : [];
  const rounds = Array.isArray(recentRounds) ? recentRounds : [];
  const log = Array.isArray(accessLog) ? accessLog : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-luxe p-6">
          <h3 className="font-semibold text-foreground">{ci.masteryTitle}</h3>
          <p className="mt-1 text-xs text-muted">{ci.masteryHint}</p>
          <div className="mt-4">
            <InteractivePercentileBars
              fill="var(--color-primary)"
              items={deltas.map((row) => ({
                id: row.competency,
                label: competencyLabel(row.competency),
                value: row.percentile,
                assessed: row.assessed,
                deltaLabel:
                  row.delta != null && row.assessed
                    ? `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(0)}%`
                    : undefined,
                deltaPositive: row.delta != null ? row.delta >= 0 : undefined,
              }))}
            />
          </div>
        </section>

        <section className="card-luxe p-6">
          <h3 className="font-semibold text-foreground">{ci.dimensionsTitle}</h3>
          <p className="mt-1 text-xs text-muted">{ci.dimensionsHint}</p>
          <div className="mt-4">
            <DimensionAxesPanel
              values={latestDimensions}
              emptyHint={!latestDimensions ? ci.dimensionsEmpty : undefined}
            />
          </div>
        </section>
      </div>

      {rounds.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{ci.roundsTitle}</h3>
          {rounds.slice(0, 2).map((brief, i) => (
            <RoundBriefPanel key={`${brief.completedAt}-${i}`} brief={brief} />
          ))}
        </div>
      ) : (
        <section className="card-luxe border-dashed p-6">
          <h3 className="font-semibold text-foreground">{ci.roundsTitle}</h3>
          <p className="mt-2 text-sm text-muted">{ci.roundsEmpty}</p>
        </section>
      )}

      {log.length > 0 && (
        <section className="card-luxe p-6">
          <h3 className="font-semibold text-foreground">{ci.accessTitle}</h3>
          <p className="mt-1 text-xs text-muted">{ci.accessHint}</p>
          <ul className="mt-4 divide-y divide-card-border">
            {log.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted">
                    {new Date(row.at).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Link href={row.href} className="text-sm text-primary hover:underline">
                  {ci.view}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

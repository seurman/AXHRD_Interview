"use client";

import Link from "next/link";
import { competencyLabel } from "@/lib/labels";
import { RoundBriefPanel } from "@/components/interview/RoundBriefPanel";
import type { RoundBrief } from "@/lib/interview/competency-round";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DimensionAxesPanel } from "./DimensionAxesPanel";

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-luxe p-6">
          <h3 className="font-semibold text-foreground">{ci.masteryTitle}</h3>
          <p className="mt-1 text-xs text-muted">{ci.masteryHint}</p>
          <div className="mt-4 space-y-3">
            {competencyDeltas.map((row) => (
              <div key={row.competency} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {competencyLabel(row.competency)}
                  </span>
                  <span className="text-muted">
                    {row.assessed ? `${Math.round(row.percentile)}%` : "—"}
                    {row.delta != null && row.assessed && (
                      <span
                        className={
                          row.delta >= 0 ? "ml-2 text-success" : "ml-2 text-warning"
                        }
                      >
                        {row.delta >= 0 ? "+" : ""}
                        {row.delta.toFixed(0)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background ring-1 ring-inset ring-card-border/50">
                  <div
                    className={`h-2 rounded-full ${row.assessed ? "bg-primary/70" : "bg-muted/25"}`}
                    style={{
                      width: `${row.assessed ? Math.min(100, row.percentile) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
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

      {recentRounds.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{ci.roundsTitle}</h3>
          {recentRounds.slice(0, 2).map((brief, i) => (
            <RoundBriefPanel key={`${brief.completedAt}-${i}`} brief={brief} />
          ))}
        </div>
      ) : (
        <section className="card-luxe border-dashed p-6">
          <h3 className="font-semibold text-foreground">{ci.roundsTitle}</h3>
          <p className="mt-2 text-sm text-muted">{ci.roundsEmpty}</p>
        </section>
      )}

      {accessLog.length > 0 && (
        <section className="card-luxe p-6">
          <h3 className="font-semibold text-foreground">{ci.accessTitle}</h3>
          <p className="mt-1 text-xs text-muted">{ci.accessHint}</p>
          <ul className="mt-4 divide-y divide-card-border">
            {accessLog.map((row) => (
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

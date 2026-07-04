"use client";

import { competencyLabel, thetaToLevel } from "@/lib/labels";
import type { CompetencyState } from "@/types";

interface CompetencyBarProps {
  states: Record<string, CompetencyState>;
  activeCompetency?: string;
}

export function CompetencyBar({ states, activeCompetency }: CompetencyBarProps) {
  const entries = Object.values(states);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        역량 추정 (실시간)
      </p>
      {entries.map((state) => {
        const pct = Math.max(0, Math.min(100, ((state.theta + 3) / 6) * 100));
        const level = thetaToLevel(state.theta);
        const isActive = state.competency === activeCompetency;

        return (
          <div key={state.competency} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className={isActive ? "font-semibold text-accent" : "text-muted"}>
                {competencyLabel(state.competency)}
              </span>
              <span className="text-muted">
                L{level} · θ {state.theta.toFixed(2)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isActive ? "bg-accent" : "bg-gold/60"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

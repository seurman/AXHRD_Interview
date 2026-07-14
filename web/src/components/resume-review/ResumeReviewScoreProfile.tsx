"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  REVIEW_CATEGORY_LABELS,
  type ReviewCategory,
} from "@/lib/interview/resume-review-criteria-data";

const TARGET_SCORE = 80;

type DimensionRow = {
  category: string;
  label: string;
  score: number;
  band: string;
  strengths: string[];
  gaps: string[];
};

type CriterionRow = {
  code: string;
  category: string;
  title: string;
  status: string;
};

function statusToScore(status: string): number {
  if (status === "pass") return 100;
  if (status === "partial") return 60;
  return 25;
}

function bandTone(band: string): string {
  if (band === "strong") return "text-success";
  if (band === "adequate") return "text-warning";
  return "text-danger";
}

function bandFill(band: string): string {
  if (band === "strong") return "bg-success";
  if (band === "adequate") return "bg-warning";
  return "bg-danger";
}

function bandLabel(band: string): string {
  if (band === "strong") return "양호";
  if (band === "adequate") return "보통";
  return "보완";
}

function stripLeadLabel(s: string): string {
  return s.replace(/^[^—\-]{1,48}\s*[—\-]\s*/u, "").trim();
}

function dimInsight(d: DimensionRow): string {
  if (d.band === "strong") {
    return stripLeadLabel(d.strengths[0] || "") || "이 축의 기준을 고르게 충족하고 있습니다.";
  }
  return (
    stripLeadLabel(d.gaps[0] || "") ||
    stripLeadLabel(d.strengths[0] || "") ||
    "이 축에서 손볼 부분이 남아 있습니다."
  );
}

type Props = {
  dimensions: DimensionRow[];
  criteria: CriterionRow[];
};

export function ResumeReviewScoreProfile({ dimensions, criteria }: Props) {
  const radarData = useMemo(
    () =>
      dimensions.map((d) => ({
        axis: d.label,
        score: d.score,
        target: TARGET_SCORE,
      })),
    [dimensions]
  );

  const grouped = useMemo(() => {
    const order: ReviewCategory[] = ["FORMAT_LOGIC", "INDUSTRY_FIT", "STAR_BEI"];
    return order
      .map((cat) => ({
        category: cat,
        label: REVIEW_CATEGORY_LABELS[cat],
        items: criteria
          .filter((c) => c.category === cat)
          .map((c) => ({
            code: c.code,
            title: c.title,
            score: statusToScore(c.status),
          })),
      }))
      .filter((g) => g.items.length > 0);
  }, [criteria]);

  if (dimensions.length === 0) return null;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">평가 프로필</h2>
        <p className="mt-1 text-sm text-muted">
          실선은 현재 자소서, 점선은 권장 수준({TARGET_SCORE})입니다. 기준별 점수는
          막대로 한눈에 비교합니다.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="card-luxe p-4 sm:p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            3축 레이더
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="52%" outerRadius="70%">
              <defs>
                <linearGradient id="resumeReviewRadarFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="var(--color-card-border)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="권장"
                dataKey="target"
                stroke="var(--color-muted)"
                strokeWidth={1.25}
                strokeDasharray="5 4"
                fill="none"
                fillOpacity={0}
                isAnimationActive={false}
              />
              <Radar
                name="현재"
                dataKey="score"
                stroke="var(--color-gold)"
                strokeWidth={2}
                fill="url(#resumeReviewRadarFill)"
                fillOpacity={1}
                dot={{ r: 3, fill: "var(--color-gold)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-card-border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  `${value ?? 0}`,
                  name === "target" ? "권장" : "현재",
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap justify-center gap-4 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-gold" /> 현재 자소서
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-muted" />{" "}
              권장 {TARGET_SCORE}
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          {dimensions.map((d) => (
            <div key={d.category} className="card-luxe flex flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{d.label}</h3>
                <span className={`text-sm font-semibold tabular-nums ${bandTone(d.band)}`}>
                  {d.score}
                  <span className="ml-1 text-xs font-medium opacity-80">
                    {bandLabel(d.band)}
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-border/60">
                <div
                  className={`h-full rounded-full ${bandFill(d.band)}`}
                  style={{ width: `${Math.min(100, Math.max(0, d.score))}%` }}
                />
              </div>
              <p className="text-sm leading-relaxed text-muted">{dimInsight(d)}</p>
            </div>
          ))}
        </div>
      </div>

      {grouped.length > 0 && (
        <div className="card-luxe space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-foreground">기준별 점수</h3>
            <p className="mt-1 text-xs text-muted">
              충족 100 · 부분 60 · 부족 25. 고쳐 쓸 문장은 아래 문단 첨삭을 보세요.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {grouped.map((g) => (
              <div key={g.category} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {g.label}
                </p>
                <ul className="space-y-2.5">
                  {g.items.map((item) => (
                    <li key={item.code}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-foreground" title={item.title}>
                          {item.title}
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                          {item.score}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-card-border/50">
                        <div
                          className={`h-full rounded-full ${
                            item.score >= 80
                              ? "bg-success"
                              : item.score >= 50
                                ? "bg-warning"
                                : "bg-danger"
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

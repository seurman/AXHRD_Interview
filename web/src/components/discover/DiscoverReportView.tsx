"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DiscoverProfileData } from "@/types/discover";
import {
  InterviewAdviceSection,
  StrengthCompetencyMap,
} from "@/components/discover/InterviewAdviceSection";
import { chartTooltipStyle } from "@/components/charts/CohortCompetencyBarChart";

interface DiscoverReportViewProps {
  profile: DiscoverProfileData;
  completedAt?: string | null;
  jobRoleLabel?: string;
}

export function DiscoverReportView({ profile, completedAt, jobRoleLabel }: DiscoverReportViewProps) {
  const radarData = profile.competencySignals.map((s) => ({
    competency: s.labelKo,
    signal: 70 + (s.code.length % 5) * 6,
  }));

  return (
    <div className="product-stage product-stage--wide mx-auto max-w-3xl space-y-8">
      <div className="product-stage__inner !max-w-3xl space-y-8">
      <header className="space-y-2 text-center">
        <p className="product-stage__kicker">Self-Discovery</p>
        <h1 className="product-stage__title !text-2xl sm:!text-3xl">나를 발견한 이야기</h1>
        {completedAt && (
          <p className="text-sm text-muted">
            {new Date(completedAt).toLocaleDateString("ko-KR")} 완료
          </p>
        )}
      </header>

      <Disclaimer />

      <section className="card-luxe space-y-3 p-6">
        <h2 className="font-semibold text-foreground">당신의 이야기를 관통하는 주제</h2>
        <p className="text-sm leading-relaxed text-foreground/90">{profile.narrativeSummary}</p>
      </section>

      {profile.interviewAdvice && profile.interviewAdvice.length > 0 && (
        <>
          <StrengthCompetencyMap advice={profile.interviewAdvice} />
          <InterviewAdviceSection
            advice={profile.interviewAdvice}
            jobRoleLabel={jobRoleLabel}
          />
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">발견한 강점</h2>
        <p className="text-sm text-muted">
          VIA 성격강점 체계를 바탕으로, 답변 속에서 드러난 당신만의 강점입니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.strengths.map((s, i) => (
            <article key={`${s.viaCode}-${i}`} className="card-luxe space-y-2 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                  {s.virtueKo}
                </span>
                <h3 className="font-semibold text-foreground">{s.viaLabelKo}</h3>
              </div>
              <blockquote className="border-l-2 border-gold/40 pl-3 text-sm italic text-muted">
                &ldquo;{s.quote}&rdquo;
              </blockquote>
              <p className="text-sm text-foreground/85">{s.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">소중히 여기는 가치</h2>
        <p className="text-sm text-muted">
          선택과 이야기 속에서 드러난 가치관입니다.
        </p>
        <div className="grid gap-4">
          {profile.values.map((v, i) => (
            <article key={`${v.schwartzCode}-${i}`} className="card-luxe space-y-2 p-5">
              <h3 className="font-semibold text-primary">{v.schwartzLabelKo}</h3>
              <blockquote className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted">
                &ldquo;{v.quote}&rdquo;
              </blockquote>
              <p className="text-sm text-foreground/85">{v.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      {profile.competencySignals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">역량과 연결되는 신호</h2>
          <p className="text-sm text-muted">
            기존 역량 트래킹의 6가지 역량과 답변 속 경험이 어떻게 연결되는지 보여 드립니다.
            (점수가 아닌 &lsquo;신호&rsquo;입니다.)
          </p>
          <div className="card-luxe p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-card-border)" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number) => [`신호 ${value}`, "연결 강도"]}
                  />
                  <Radar
                    name="연결 신호"
                    dataKey="signal"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.32}
                    isAnimationActive
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ul className="space-y-3">
            {profile.competencySignals.map((c, i) => (
              <li key={`${c.code}-${i}`} className="card-luxe p-4">
                <p className="font-medium text-foreground">{c.labelKo}</p>
                <p className="mt-1 text-sm text-muted">{c.signal}</p>
                <p className="mt-2 text-xs italic text-muted/80">&ldquo;{c.quote}&rdquo;</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.riasecHint && (
        <section className="card-luxe space-y-2 p-5">
          <h2 className="font-semibold text-foreground">흥미 유형 힌트</h2>
          <p className="text-sm">
            <span className="font-medium text-accent">{profile.riasecHint.labelKo}</span>
            {" — "}
            {profile.riasecHint.note}
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">더 깊이 탐색해 볼 여지</h2>
        <ul className="space-y-3">
          {profile.weaknesses.map((w, i) => (
            <li key={i} className="card-luxe p-4">
              <p className="font-medium text-foreground">{w.area}</p>
              <p className="mt-1 text-sm text-muted">{w.suggestion}</p>
              {w.quote && (
                <p className="mt-2 text-xs italic text-muted/80">&ldquo;{w.quote}&rdquo;</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Disclaimer />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href="/discover"
          className="rounded-xl border border-card-border px-6 py-3 text-center text-sm font-medium hover:border-gold/40"
        >
          다시 시작하기
        </a>
        <a
          href="/dashboard"
          className="rounded-xl bg-primary px-6 py-3 text-center text-sm font-medium text-white hover:opacity-90"
        >
          역량 트래킹으로
        </a>
      </div>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-amber-900/90 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100/90">
      <strong>안내:</strong> 이 결과는 심리 검사나 채용 결정 도구가 아닙니다. AI가 당신의
      이야기를 바탕으로 성찰을 돕기 위해 정리한 내용이며, 점수·등급·진단을 의미하지 않습니다.
    </div>
  );
}

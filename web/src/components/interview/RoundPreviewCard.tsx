"use client";

import Link from "next/link";
import { competencyLabel } from "@/lib/labels";
import {
  questionsPerCompetencyForRound,
  type TimeBudgetMinutes,
} from "@/lib/interview/session-limits";

type Props = {
  focusCompetencies: string[];
  timeBudgetMinutes: TimeBudgetMinutes;
  personaName?: string | null;
  personaFocus?: string[];
  jdRecommended?: string | null;
  jdRationale?: string | null;
  weakDimensionLabel?: string | null;
  weakCompetency?: string | null;
};

/** 설정 화면 — 이번 차수 미리보기 (역량 순서·문항·시간·약점 축) */
export function RoundPreviewCard({
  focusCompetencies,
  timeBudgetMinutes,
  personaName,
  personaFocus = [],
  jdRecommended,
  jdRationale,
  weakDimensionLabel,
  weakCompetency,
}: Props) {
  if (focusCompetencies.length === 0) return null;

  const perComp = questionsPerCompetencyForRound(
    timeBudgetMinutes,
    focusCompetencies.length,
  );
  const totalQ = perComp * focusCompetencies.length;
  const whyBits: string[] = [];
  if (personaName) {
    whyBits.push(`페르소나「${personaName}」추천 순서를 반영했습니다`);
  }
  if (jdRecommended && focusCompetencies.includes(jdRecommended)) {
    whyBits.push(
      jdRationale?.trim()
        ? `공고 분석: ${jdRationale.trim()}`
        : `공고 분석이 ${competencyLabel(jdRecommended)}을(를) 우선 추천했습니다`,
    );
  }
  if (weakCompetency && focusCompetencies.includes(weakCompetency)) {
    whyBits.push(`최근 약한 역량 ${competencyLabel(weakCompetency)}을(를) 포함했습니다`);
  }
  if (whyBits.length === 0) {
    whyBits.push("선택한 역량 순서대로 세션이 이어집니다 (세션당 1역량)");
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-gold/5 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
        이번 차수 미리보기
      </p>
      <ol className="mt-3 space-y-1.5">
        {focusCompetencies.map((code, i) => (
          <li key={code} className="flex items-baseline gap-2 text-sm text-foreground">
            <span className="font-mono text-xs text-muted">{i + 1}.</span>
            <span className="font-medium">{competencyLabel(code)}</span>
            {personaFocus.includes(code) ? (
              <span className="text-[10px] text-accent">페르소나</span>
            ) : null}
            {jdRecommended === code ? (
              <span className="text-[10px] text-gold">공고</span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        약 {timeBudgetMinutes}분 · 역량당 {perComp}문항 · 합계 {totalQ}문항
      </p>
      {weakDimensionLabel ? (
        <p className="mt-2 text-xs text-accent">
          최근 약한 답변 축: <strong>{weakDimensionLabel}</strong>
          {weakCompetency ? ` · 연습 역량 ${competencyLabel(weakCompetency)}` : ""}
        </p>
      ) : null}
      <ul className="mt-3 space-y-1 text-xs leading-relaxed text-foreground">
        {whyBits.map((b) => (
          <li key={b.slice(0, 48)}>· {b}</li>
        ))}
      </ul>
      {weakCompetency ? (
        <p className="mt-3 text-xs text-muted">
          약점 역량만 다시 연습하려면{" "}
          <Link
            href={`/interview/setup?competency=${weakCompetency}`}
            className="text-accent underline-offset-2 hover:underline"
          >
            여기
          </Link>
          를 누르세요.
        </p>
      ) : null}
    </section>
  );
}

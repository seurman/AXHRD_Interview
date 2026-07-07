"use client";

import Link from "next/link";
import { competencyLabel } from "@/lib/labels";
import type { DiscoverInterviewAdvice } from "@/types/discover";

interface InterviewAdviceSectionProps {
  advice: DiscoverInterviewAdvice[];
  jobRoleLabel?: string;
}

export function InterviewAdviceSection({ advice, jobRoleLabel }: InterviewAdviceSectionProps) {
  if (!advice.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Interview Bridge
        </p>
        <h2 className="text-lg font-semibold text-foreground">면접에서 활용하기</h2>
        <p className="text-sm text-muted">
          발견한 강점을 NCS 6역량과 연결해,{" "}
          {jobRoleLabel ? `${jobRoleLabel} 직무` : "지원 직무"} 면접 답변 소재로 쓰는 방법입니다.
        </p>
      </div>

      <div className="space-y-4">
        {advice.map((a, i) => (
          <article key={`${a.viaCode}-${i}`} className="card-luxe overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <div className="shrink-0 sm:w-36">
                <p className="text-xs text-muted">강점 카드</p>
                <p className="text-lg font-bold text-gold">{a.viaLabelKo}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted">
                  <span>→</span>
                  <span className="font-medium text-primary">{a.competencyLabelKo}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3 border-t border-card-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <p className="text-sm font-medium text-foreground">{a.bridge}</p>
                <blockquote className="border-l-2 border-gold/40 pl-3 text-sm italic text-muted">
                  &ldquo;{a.quote}&rdquo;
                </blockquote>
                <div className="rounded-xl bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary">💡 면접 팁</p>
                  <p className="mt-1 text-sm text-foreground/90">{a.interviewTip}</p>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <p className="text-xs font-semibold text-muted">STAR 뼈대</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">{a.starPrompt}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/interview/setup"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          이 강점으로 모의 면접 연습 →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-card-border px-5 py-2.5 text-sm font-medium hover:border-gold/40"
        >
          역량 트래킹에서 확인
        </Link>
      </div>
    </section>
  );
}

/** 강점-역량 연결 맵 (시각화용) */
export function StrengthCompetencyMap({ advice }: { advice: DiscoverInterviewAdvice[] }) {
  const codes = [...new Set(advice.map((a) => a.competencyCode))];

  return (
    <div className="flex flex-wrap gap-2">
      {codes.map((code) => {
        const linked = advice.filter((a) => a.competencyCode === code);
        return (
          <div
            key={code}
            className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          >
            <span className="font-medium text-primary">{competencyLabel(code)}</span>
            <span className="mx-1 text-muted">←</span>
            <span className="text-gold">{linked.map((l) => l.viaLabelKo).join(", ")}</span>
          </div>
        );
      })}
    </div>
  );
}

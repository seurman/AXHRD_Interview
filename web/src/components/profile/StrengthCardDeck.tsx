"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiscoverInterviewAdvice, DiscoverStrengthItem } from "@/types/discover";

const VIRTUE_STYLE: Record<string, { border: string; glow: string; badge: string }> = {
  지혜: { border: "border-violet-400/60", glow: "shadow-violet-200/40", badge: "bg-violet-500/15 text-violet-700" },
  용기: { border: "border-orange-400/60", glow: "shadow-orange-200/40", badge: "bg-orange-500/15 text-orange-700" },
  인간애: { border: "border-rose-400/60", glow: "shadow-rose-200/40", badge: "bg-rose-500/15 text-rose-700" },
  정의: { border: "border-sky-400/60", glow: "shadow-sky-200/40", badge: "bg-sky-500/15 text-sky-700" },
  절제: { border: "border-teal-400/60", glow: "shadow-teal-200/40", badge: "bg-teal-500/15 text-teal-700" },
  초월: { border: "border-amber-400/70", glow: "shadow-amber-200/50", badge: "bg-gold/20 text-gold" },
};

interface StrengthCardDeckProps {
  strengths: DiscoverStrengthItem[];
  interviewAdvice?: DiscoverInterviewAdvice[];
  totalDiscovered: number;
  reportHref?: string;
  compact?: boolean;
}

export function StrengthCardDeck({
  strengths,
  interviewAdvice,
  totalDiscovered,
  reportHref,
  compact,
}: StrengthCardDeckProps) {
  if (strengths.length === 0) {
    return (
      <section className="card-luxe p-6 text-center">
        <p className="text-4xl">🃏</p>
        <h2 className="mt-2 font-semibold text-foreground">강점 카드 컬렉션</h2>
        <p className="mt-2 text-sm text-muted">
          아직 수집한 강점 카드가 없습니다. 자기발견 인터뷰를 완료하면 카드가 열립니다.
        </p>
        <Link
          href="/discover"
          className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          나를 발견하기 →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Strength Deck</p>
          <h2 className="text-lg font-bold text-foreground">나의 강점 카드</h2>
          <p className="text-sm text-muted">
            {totalDiscovered}장 획득 · VIA 24강점 중 발견된 카드
          </p>
        </div>
        {reportHref && (
          <Link href={reportHref} className="text-sm text-primary hover:underline">
            전체 리포트 →
          </Link>
        )}
      </div>

      <div className={`grid gap-4 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {strengths.map((s, i) => {
          const advice = interviewAdvice?.find((a) => a.viaCode === s.viaCode);
          return (
            <StrengthCard key={`${s.viaCode}-${i}`} strength={s} advice={advice} />
          );
        })}
      </div>
    </section>
  );
}

function StrengthCard({
  strength,
  advice,
}: {
  strength: DiscoverStrengthItem;
  advice?: DiscoverInterviewAdvice;
}) {
  const [flipped, setFlipped] = useState(false);
  const style = VIRTUE_STYLE[strength.virtueKo] ?? VIRTUE_STYLE["초월"];

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className={`group relative min-h-[11rem] w-full rounded-2xl border-2 ${style.border} bg-gradient-to-br from-card to-background p-4 text-left shadow-lg ${style.glow} transition hover:-translate-y-0.5 hover:shadow-xl`}
    >
      <div className="absolute right-3 top-3 text-[10px] font-bold uppercase tracking-wider text-muted/60">
        {flipped ? "BACK" : "FRONT"}
      </div>

      {!flipped ? (
        <>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
            {strength.virtueKo}
          </span>
          <h3 className="mt-2 text-xl font-bold text-foreground">{strength.viaLabelKo}</h3>
          <p className="mt-2 line-clamp-2 text-xs italic text-muted">&ldquo;{strength.quote}&rdquo;</p>
          {advice && (
            <p className="mt-3 rounded-lg bg-primary/5 px-2 py-1.5 text-xs text-primary">
              ⚔ {advice.competencyLabelKo} 역량 연결
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted">탭하여 면접 활용법 보기</p>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-gold">면접 활용</p>
          {advice ? (
            <>
              <p className="mt-2 text-sm text-foreground/90">{advice.bridge}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{advice.interviewTip}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{strength.explanation}</p>
          )}
          <p className="mt-2 text-[10px] text-muted">탭하여 카드 앞면으로</p>
        </>
      )}
    </button>
  );
}

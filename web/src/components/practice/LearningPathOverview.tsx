"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CareerTrack } from "@prisma/client";
import type { PathCompetencySummary } from "@/lib/learning/path";
import type { WeaknessRecommendation } from "@/lib/learning/weakness";

type UsageSlice = {
  used: number;
  limit: number | null;
};

type Props = {
  initialTrack: CareerTrack;
  competencies: PathCompetencySummary[];
  recommendation: PathCompetencySummary | null;
  weakness: WeaknessRecommendation;
  dailyDrills: UsageSlice;
  mockInterviews: UsageSlice;
};

export function LearningPathOverview({
  initialTrack,
  competencies,
  recommendation,
  weakness,
  dailyDrills,
  mockInterviews,
}: Props) {
  const router = useRouter();
  const [track, setTrack] = useState<CareerTrack>(initialTrack);
  const [pending, startTransition] = useTransition();

  const switchTrack = (next: CareerTrack) => {
    if (next === track) return;
    const prev = track;
    setTrack(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/learning/path", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track: next }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "트랙 저장 실패");
        router.refresh();
      } catch (e) {
        setTrack(prev);
        toast.error(e instanceof Error ? e.message : "트랙 저장 실패");
      }
    });
  };

  const drillLabel =
    dailyDrills.limit == null
      ? `이번 주 드릴 ${dailyDrills.used}회 (무제한)`
      : `이번 주 드릴 ${dailyDrills.used} / ${dailyDrills.limit}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center sm:text-left">
        <p className="section-eyebrow">Competency Path</p>
        <h1 className="mt-3 text-3xl font-bold text-foreground">역량 학습 패스</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted sm:mx-0">
          개념 → 원리 → 카드 말하기 → 약점 드릴 → 실전 → 인증. 매일 가벼운
          습관으로 쌓고, 필요할 때만 모의면접으로 측정합니다.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-card-border bg-card p-1">
          {(
            [
              { id: "NEW_GRAD", label: "신입" },
              { id: "EXPERIENCED", label: "경력" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              onClick={() => switchTrack(opt.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                track === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {drillLabel}
          {" · "}
          모의{" "}
          {mockInterviews.limit == null
            ? `${mockInterviews.used} (무제한)`
            : `${mockInterviews.used} / ${mockInterviews.limit}`}
        </p>
      </div>

      {dailyDrills.limit != null &&
      dailyDrills.used >= dailyDrills.limit ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="text-foreground">이번 주 Free 드릴 한도를 모두 썼어요.</p>
          <Link href="/pricing" className="mt-1 inline-flex text-accent hover:underline">
            Pro로 무제한 드릴 →
          </Link>
        </div>
      ) : null}

      {competencies.length === 0 ? (
        <section className="card-luxe p-6 text-center">
          <p className="text-sm text-muted">레슨 카탈로그를 준비 중입니다.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-secondary mt-3 px-4 py-2 text-sm"
          >
            다시 불러오기
          </button>
        </section>
      ) : null}

      {recommendation?.nextLesson ? (
        <section className="card-luxe overflow-hidden">
          <div className="border-b border-card-border bg-gradient-to-r from-gold/10 to-primary/5 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Today&apos;s Drill
            </p>
            <h2 className="font-bold text-foreground">오늘의 추천 드릴</h2>
            <p className="mt-1 text-sm text-muted">
              {recommendation.titleKo} · {recommendation.nextLesson.stageLabel} ·{" "}
              {recommendation.nextLesson.titleKo}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-xs text-muted">
              스트릭 {recommendation.streakDays}일 · 숙련{" "}
              {Math.round(recommendation.masteryScore * 100)}%
            </p>
            <Link
              href={`/practice/path/${recommendation.competency.toLowerCase()}`}
              className="btn-primary px-4 py-2 text-sm"
            >
              이어서 학습
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card-luxe space-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Weakness Drill
          </p>
          <h2 className="mt-1 font-bold text-foreground">
            약점 드릴 · {weakness.titleKo}
            {weakness.dimensionLabelKo
              ? ` (${weakness.dimensionLabelKo})`
              : ""}
          </h2>
          <p className="mt-1 text-sm text-muted">{weakness.tip}</p>
        </div>
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground">
          {weakness.prompt}
        </p>
        {(weakness.practiceQuestions?.length ?? 0) > 0 ? (
          <ol className="space-y-2">
            {weakness.practiceQuestions.map((q, i) => (
              <li
                key={q.id ?? i}
                className="rounded-lg border border-card-border px-3 py-2 text-sm text-foreground"
              >
                <span className="text-xs text-muted">{i + 1}. </span>
                {q.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted">샘플: {weakness.sampleQuestion}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={weakness.href} className="btn-secondary inline-flex text-sm">
            약점 레슨 열기 →
          </Link>
          <Link
            href={weakness.swipeHref ?? `/practice/swipe?competency=${weakness.competency}`}
            className="btn-primary inline-flex text-sm"
          >
            이 질문으로 말하기 →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">6개 역량 트랙</h2>
          <Link href="/practice/swipe" className="text-xs text-accent hover:underline">
            질문 카드만 연습 →
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {competencies.map((c) => (
            <li key={c.competency}>
              <Link
                href={`/practice/path/${c.competency.toLowerCase()}`}
                className="card-luxe block h-full p-4 transition hover:border-accent/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{c.titleKo}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.nextLesson
                        ? `다음: ${c.nextLesson.stageLabel} · ${c.nextLesson.titleKo}`
                        : "트랙 완료에 가깝습니다"}
                    </p>
                  </div>
                  {c.streakDays > 0 ? (
                    <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                      {c.streakDays}일
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold to-primary transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(c.masteryScore * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  stage {c.unlockedStage}/5 · 숙련{" "}
                  {Math.round(c.masteryScore * 100)}%
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

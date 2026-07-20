"use client";

import { Check, Lock } from "lucide-react";
import type { GuestTryFeedback } from "@/lib/demo/guest-try-feedback";
import { dimensionLabel } from "@/lib/labels";
import { AnswerInsightRadar } from "@/components/interview/AnswerInsightRadar";

const STAR_LABELS = {
  situation: "상황",
  task: "과제",
  action: "행동",
  result: "결과·수치",
} as const;

export function TrialFeedbackPanel({
  feedback,
  competencyLabel: compLabel,
  title = "맛보기 피드백",
}: {
  feedback: GuestTryFeedback;
  competencyLabel: string;
  title?: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-gold">{title}</span>
        <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-0.5 text-sm font-bold text-gold">
          {feedback.scorePct}점
        </span>
        <span className="text-xs text-muted">{compLabel}</span>
      </div>

      <p className="text-base font-semibold leading-snug text-foreground">{feedback.headline}</p>

      <AnswerInsightRadar
        dimensions={feedback.dimensions}
        weakestDimension={feedback.weakestDimension}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.entries(STAR_LABELS) as [keyof typeof STAR_LABELS, string][]).map(
          ([key, label]) => {
            const ok = feedback.star[key];
            return (
              <div
                key={key}
                className={`rounded-lg border px-2.5 py-2 text-center text-xs ${
                  ok
                    ? "border-success/30 bg-success/8 text-success"
                    : "border-card-border bg-background/50 text-muted"
                }`}
              >
                {ok ? <Check className="mx-auto mb-1 h-3.5 w-3.5" /> : <span className="mb-1 block opacity-40">·</span>}
                {label}
              </div>
            );
          },
        )}
      </div>

      <p className="text-sm leading-relaxed text-foreground">{feedback.coaching}</p>

      {Array.isArray(feedback.keyPoints) && feedback.keyPoints.length > 0 && (
        <ul className="space-y-1.5 rounded-xl border border-card-border bg-background/40 p-4 text-sm text-muted">
          {feedback.keyPoints.map((point) => (
            <li key={point} className="leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
      )}

      {Array.isArray(feedback.evidence) && feedback.evidence.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">답변 근거</p>
          {feedback.evidence.slice(0, 2).map((item) => (
            <figure
              key={`${item.supports}-${item.quote.slice(0, 20)}`}
              className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5"
            >
              <blockquote className="text-sm italic text-foreground">「{item.quote}」</blockquote>
              <figcaption className="mt-1 text-xs text-muted">{item.supports}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-gold/35 bg-gradient-to-br from-gold/8 to-transparent p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gold">
          <Lock className="h-3.5 w-3.5" />
          가입하면 이어지는 것
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-foreground">
          {feedback.unlockItems.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-gold">→</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          가장 보완할 축:{" "}
          <span className="font-medium text-warning">
            {dimensionLabel(feedback.weakestDimension)}
          </span>
        </p>
      </div>
    </div>
  );
}

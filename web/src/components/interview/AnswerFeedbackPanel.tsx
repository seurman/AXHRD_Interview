"use client";

import type { AnswerFeedback, ChipType } from "@/types";
import { competencyLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { AnswerInsightRadar } from "./AnswerInsightRadar";
import type { AnswerDimensions } from "@/lib/interview/answer-dimensions";

const CHIP_LABEL: Record<ChipType, string> = {
  pass: "통과 ♩",
  attempt: "부분 통과 ♪",
  downgrade: "미달 ♭",
};

const CHIP_STYLE: Record<ChipType, string> = {
  pass: "border-success/30 bg-success/8 text-success",
  attempt: "border-accent/30 bg-accent/8 text-accent",
  downgrade: "border-warning/30 bg-warning/8 text-warning",
};

export function AnswerFeedbackPanel({
  feedback,
  sessionAverage,
}: {
  feedback: AnswerFeedback;
  sessionAverage?: AnswerDimensions | null;
}) {
  const scorePct =
    typeof feedback.score === "number" ? Math.round(feedback.score * 100) : null;
  const evidence =
    feedback.evidence && feedback.evidence.length > 0
      ? feedback.evidence
      : feedback.quote
        ? [{ quote: feedback.quote, supports: "평가에 사용한 대표 발화" }]
        : [];

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          {feedback.isInterim ? "답변 코칭 (꼬리질문 전)" : "답변 핵심 피드백"}
        </span>
        {scorePct != null && (
          <span className="rounded-full border border-primary/25 bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {scorePct}점
          </span>
        )}
        {feedback.chipType && feedback.level != null && !feedback.isInterim && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              CHIP_STYLE[feedback.chipType]
            )}
          >
            L{feedback.level} {CHIP_LABEL[feedback.chipType]}
          </span>
        )}
        {feedback.competency && (
          <span className="text-xs text-muted">{competencyLabel(feedback.competency)}</span>
        )}
      </div>

      {feedback.dimensions && !feedback.isInterim && (
        <AnswerInsightRadar
          dimensions={feedback.dimensions}
          weakestDimension={feedback.weakestDimension}
          sessionAverage={sessionAverage}
        />
      )}

      <p className="text-sm leading-relaxed text-foreground">{feedback.summary}</p>

      {evidence.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            답변 근거
          </p>
          {evidence.map((item) => (
            <figure
              key={`${item.supports}-${item.quote.slice(0, 24)}`}
              className="rounded-xl border border-primary/10 bg-white/50 px-3 py-2.5"
            >
              <blockquote className="border-l-2 border-primary/30 pl-3 text-sm italic text-foreground">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-1.5 text-xs text-muted">{item.supports}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {feedback.keyPoints.length > 0 && (
        <ul className="space-y-1.5">
          {feedback.keyPoints.map((point) => (
            <li key={point} className="flex gap-2 text-sm text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {feedback.irtNote && (
        <div className="rounded-xl border border-primary/20 bg-white/60 px-4 py-3 text-sm leading-relaxed text-primary">
          <span className="font-semibold">IRT 적응형 · </span>
          {feedback.irtNote}
        </div>
      )}
    </div>
  );
}

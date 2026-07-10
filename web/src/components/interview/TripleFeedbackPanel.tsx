"use client";

import type { AnswerFeedback } from "@/types";
import type { TripleFeedbackResult } from "@/lib/interview/triple-feedback";
import { LENS_UI_LABEL } from "@/lib/interview/triple-feedback";
import { cn } from "@/lib/cn";
import { AnswerInsightRadar } from "./AnswerInsightRadar";
import type { AnswerDimensions } from "@/lib/interview/answer-dimensions";

const LENS_ORDER = ["LARGE", "PUBLIC", "STARTUP"] as const;

const LENS_STYLE: Record<(typeof LENS_ORDER)[number], string> = {
  LARGE: "border-primary/20 bg-primary/5",
  PUBLIC: "border-gold/25 bg-gold/5",
  STARTUP: "border-accent/25 bg-accent/5",
};

export function TripleFeedbackPanel({
  feedback,
  tripleFeedback,
  sessionAverage,
}: {
  feedback: AnswerFeedback;
  tripleFeedback: TripleFeedbackResult;
  sessionAverage?: AnswerDimensions | null;
}) {
  const scorePct =
    typeof feedback.score === "number" ? Math.round(feedback.score * 100) : null;

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          트리플 피드백
        </span>
        {scorePct != null && (
          <span className="rounded-full border border-primary/25 bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-primary">
            공통 IRT {scorePct}점
          </span>
        )}
      </div>

      <p className="text-xs text-muted">
        동일 답변을 대기업·공공·스타트업 관점에서 각각 해석합니다. 관점마다 판단이 다를 수
        있어요 — IRT 점수는 하나만 유지됩니다.
      </p>

      {feedback.dimensions && !feedback.isInterim && (
        <AnswerInsightRadar
          dimensions={feedback.dimensions}
          weakestDimension={feedback.weakestDimension}
          sessionAverage={sessionAverage}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {LENS_ORDER.map((lens) => {
          const card = tripleFeedback[lens];
          return (
            <article
              key={lens}
              className={cn("rounded-xl border p-4", LENS_STYLE[lens])}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {LENS_UI_LABEL[lens]}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">{card.verdict}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.comment}</p>
            </article>
          );
        })}
      </div>

      {feedback.irtNote ? (
        <div className="rounded-xl border border-primary/20 bg-white/60 px-4 py-3 text-sm leading-relaxed text-primary">
          <span className="font-semibold">IRT 적응형 · </span>
          {feedback.irtNote}
        </div>
      ) : null}
    </div>
  );
}

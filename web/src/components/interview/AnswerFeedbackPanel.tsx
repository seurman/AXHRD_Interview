"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnswerFeedback, ChipType } from "@/types";
import { competencyLabel, dimensionLabel } from "@/lib/labels";
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
  compact = true,
}: {
  feedback: AnswerFeedback;
  sessionAverage?: AnswerDimensions | null;
  /** true면 기본=보완 1줄+STAR 리라이트, 자세히에서 레이더·근거 */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const scorePct =
    typeof feedback.score === "number" ? Math.round(feedback.score * 100) : null;
  const keyPoints = Array.isArray(feedback.keyPoints) ? feedback.keyPoints : [];
  const evidence =
    feedback.evidence && feedback.evidence.length > 0
      ? feedback.evidence
      : feedback.quote
        ? [{ quote: feedback.quote, supports: "평가에 사용한 대표 발화" }]
        : [];

  const improvement =
    feedback.primaryImprovement ??
    keyPoints.find((p) => typeof p === "string" && p.startsWith("보완")) ??
    feedback.summary ??
    "다음 답변에서 상황·본인 행동·결과를 한 문장씩 더 구체적으로 말해 보세요.";
  const starRewrite =
    feedback.starRewrite ??
    `"(상황) … (과제) … (행동) … (결과) …" 순으로 ${feedback.competency ? competencyLabel(feedback.competency) : "이 역량"} 경험을 다시 말해 보세요.`;

  const practiceHref = feedback.competency
    ? `/interview/setup?competency=${encodeURIComponent(feedback.competency)}`
    : "/interview/setup";

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          {feedback.isInterim ? "답변 코칭 (꼬리질문 전)" : "핵심 코칭"}
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

      {feedback.summary ? (
        <p className="text-sm leading-relaxed text-foreground">{feedback.summary}</p>
      ) : null}

      {!feedback.isInterim && (
        <div className="space-y-3">
          <div className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-warning">
              보완 한 가지
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{improvement}</p>
          </div>
          <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
              STAR로 다시 말해보기
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{starRewrite}</p>
          </div>
        </div>
      )}

      {feedback.pressureCoaching ? (
        <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-danger">
            압박 면접 순간 코칭
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {feedback.pressureCoaching}
          </p>
        </div>
      ) : null}

      {feedback.weakestDimension && !feedback.isInterim ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5">
          <p className="text-xs text-foreground">
            약한 축:{" "}
            <strong>{dimensionLabel(feedback.weakestDimension)}</strong>
          </p>
          <Link href={practiceHref} className="btn-secondary px-3 py-1 text-xs">
            이 역량 다시 연습
          </Link>
        </div>
      ) : null}

      {compact && (
        <button
          type="button"
          className="text-xs font-medium text-accent underline-offset-2 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "간단히 보기" : "자세히 보기 (6축·근거·IRT)"}
        </button>
      )}

      {expanded && (
        <div className="space-y-4 border-t border-primary/10 pt-4">
          {feedback.dimensions && !feedback.isInterim && (
            <AnswerInsightRadar
              dimensions={feedback.dimensions}
              weakestDimension={feedback.weakestDimension}
              sessionAverage={sessionAverage}
            />
          )}

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

          {keyPoints.length > 0 && (
            <ul className="space-y-1.5">
              {keyPoints.map((point) => (
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
      )}
    </div>
  );
}

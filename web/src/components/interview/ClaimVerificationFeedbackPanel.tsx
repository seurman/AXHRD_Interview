import type { AnswerFeedback } from "@/types";

const LABEL_STYLES: Record<string, string> = {
  검증됨: "bg-success/15 text-success",
  부분검증: "bg-muted/20 text-muted",
  설명부족: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export function ClaimVerificationFeedbackPanel({
  feedback,
}: {
  feedback: AnswerFeedback;
}) {
  const cv = feedback.claimVerification;
  if (!cv) return null;

  return (
    <div className="card-luxe border border-dashed border-gold/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">
        경험 설명 피드백 (참고용 · 점수 미반영)
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${LABEL_STYLES[cv.label] ?? "bg-muted/20 text-muted"}`}
        >
          {cv.displayLabel}
        </span>
        <p className="flex-1 text-sm leading-relaxed text-foreground">{cv.reasoning}</p>
      </div>
    </div>
  );
}

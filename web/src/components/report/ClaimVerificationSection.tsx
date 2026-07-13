import {
  CLAIM_LABEL_DISPLAY,
  type ClaimVerificationLabel,
} from "@/lib/interview/claim-verification";

type ClaimResponse = {
  claimVerificationClaim: string | null;
  claimVerificationLabel: string | null;
  claimVerificationReasoning: string | null;
  transcript: string;
  correctedTranscript: string | null;
};

const LABEL_STYLES: Record<ClaimVerificationLabel, string> = {
  검증됨: "bg-success/15 text-success",
  부분검증: "bg-muted/20 text-muted",
  설명부족: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export function ClaimVerificationSection({
  response,
}: {
  response: ClaimResponse | null | undefined;
}) {
  if (!response?.claimVerificationClaim) return null;

  const label = response.claimVerificationLabel as ClaimVerificationLabel | null;
  const displayLabel =
    label && label in CLAIM_LABEL_DISPLAY ? CLAIM_LABEL_DISPLAY[label] : null;
  const answer = response.correctedTranscript ?? response.transcript;

  return (
    <section className="card-luxe border border-dashed border-gold/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">
        자소서 경험 확인 (참고용 · 점수 미반영)
      </p>
      <p className="mt-2 text-xs text-muted">
        자소서 내용: 「{response.claimVerificationClaim}」
      </p>
      <div className="mt-4 rounded-lg bg-surface/60 p-4 text-sm leading-relaxed text-foreground">
        <p className="mb-1 text-xs font-medium text-muted">나의 답변</p>
        {answer}
      </div>
      {label && displayLabel && (
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${LABEL_STYLES[label]}`}
          >
            {displayLabel}
          </span>
          {response.claimVerificationReasoning && (
            <p className="flex-1 text-sm leading-relaxed text-muted">
              {response.claimVerificationReasoning}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

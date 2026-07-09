type BonusResponse = {
  bonusQuestionText: string | null;
  bonusGroundedRequirement: string | null;
  transcript: string;
  correctedTranscript: string | null;
  bonusBriefFeedback: string | null;
  rubricScore: number;
};

export function BonusQuestionSection({
  response,
}: {
  response: BonusResponse | null | undefined;
}) {
  if (!response?.bonusQuestionText) return null;

  const answer = response.correctedTranscript ?? response.transcript;

  return (
    <section className="card-luxe border border-dashed border-gold/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">
        공고 맞춤 보너스 질문 (참고용 · 점수 미반영)
      </p>
      {response.bonusGroundedRequirement && (
        <p className="mt-2 text-xs text-muted">
          근거 요구사항: 「{response.bonusGroundedRequirement}」
        </p>
      )}
      <p className="mt-4 font-medium text-foreground">{response.bonusQuestionText}</p>
      <div className="mt-4 rounded-lg bg-surface/60 p-4 text-sm leading-relaxed text-foreground">
        <p className="mb-1 text-xs font-medium text-muted">나의 답변</p>
        {answer}
      </div>
      {response.bonusBriefFeedback && (
        <p className="mt-4 text-sm leading-relaxed text-muted">{response.bonusBriefFeedback}</p>
      )}
    </section>
  );
}

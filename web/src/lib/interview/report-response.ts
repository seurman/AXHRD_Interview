/** 리포트·역량 피드백 LLM 입력용 — DB ResponseRecord → 프롬프트 payload */

export type ReportResponseRow = {
  question: { template: string } | null;
  isBonusQuestion?: boolean;
  bonusQuestionText?: string | null;
  competency: string;
  transcript: string;
  correctedTranscript: string | null;
  rubricScore: number;
  followUpQuestion: string | null;
  followUpTranscript: string | null;
  followUpCorrectedTranscript: string | null;
};

export type FeedbackResponsePayload = {
  question: string;
  answer: string;
  score: number;
  followUpQuestion?: string;
  followUpAnswer?: string;
  hadFollowUp?: boolean;
};

export type SessionReportResponsePayload = FeedbackResponsePayload & {
  competency: string;
};

export function mapResponseForReport(r: ReportResponseRow): SessionReportResponsePayload {
  const hadFollowUp = !!(r.followUpQuestion && r.followUpTranscript);
  const questionText = r.isBonusQuestion
    ? (r.bonusQuestionText ?? "")
    : (r.question?.template ?? "");
  return {
    question: questionText,
    answer: r.correctedTranscript ?? r.transcript,
    score: r.rubricScore,
    competency: r.competency,
    ...(hadFollowUp
      ? {
          hadFollowUp: true,
          followUpQuestion: r.followUpQuestion!,
          followUpAnswer: r.followUpCorrectedTranscript ?? r.followUpTranscript!,
        }
      : {}),
  };
}

export function mapResponsesForCompetencyFeedback(
  rows: ReportResponseRow[],
): FeedbackResponsePayload[] {
  return rows.map((r) => {
    const mapped = mapResponseForReport(r);
    const { competency: _c, ...rest } = mapped;
    return rest;
  });
}

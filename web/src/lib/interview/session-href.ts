/**
 * 면접 세션 → 사용자에게 보여줄 대표 URL.
 * COMPETENCY 완료본은 역량 피드백이 본 경로, FULL·리포트 있는 세션은 /report.
 */
export type InterviewSessionHrefInput = {
  id: string;
  status?: string | null;
  completedAt?: Date | string | null;
  mode?: string | null;
  planId?: string | null;
  focusCompetency?: string | null;
};

export function isInterviewSessionCompleted(
  s: Pick<InterviewSessionHrefInput, "status" | "completedAt">,
): boolean {
  return s.status === "COMPLETED" || Boolean(s.completedAt);
}

export function interviewSessionHref(s: InterviewSessionHrefInput): string {
  if (!isInterviewSessionCompleted(s)) {
    return `/interview/${s.id}`;
  }

  const mode = (s.mode ?? "COMPETENCY").toUpperCase();
  if (mode === "COMPETENCY" && s.planId && s.focusCompetency) {
    return `/interview/plan/${s.planId}/competency/${encodeURIComponent(s.focusCompetency)}/feedback?sessionId=${s.id}`;
  }

  return `/interview/${s.id}/report`;
}

/** COMPETENCY 완료 세션의 피드백 URL (없으면 null) */
export function competencyFeedbackHref(s: InterviewSessionHrefInput): string | null {
  const mode = (s.mode ?? "COMPETENCY").toUpperCase();
  if (mode !== "COMPETENCY" || !s.planId || !s.focusCompetency) return null;
  if (!isInterviewSessionCompleted(s)) return null;
  return `/interview/plan/${s.planId}/competency/${encodeURIComponent(s.focusCompetency)}/feedback?sessionId=${s.id}`;
}

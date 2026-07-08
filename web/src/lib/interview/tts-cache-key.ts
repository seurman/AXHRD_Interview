import type { InterviewQuestion } from "@/types";

/** TTS 캐시 키 — 꼬리질문은 부모와 같은 question.id를 쓰므로 텍스트·플래그로 구분한다. */
export function ttsCacheKey(questionId: string, text: string, isFollowUp?: boolean): string {
  const normalized = text.trim().slice(0, 160);
  return `${questionId}:${isFollowUp ? "followup" : "main"}:${normalized}`;
}

export function ttsCacheKeyForQuestion(q: InterviewQuestion, text: string): string {
  return ttsCacheKey(q.id, text, q.isFollowUp);
}

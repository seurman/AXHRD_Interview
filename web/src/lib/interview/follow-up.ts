/**
 * AI 꼬리질문(follow-up question) — 답변이 추상적/모호할 때 같은 문항 안에서
 * 한 번 더 파고드는 질문을 추가한다.
 *
 * 비용 원칙: 꼬리질문 텍스트 자체는 Gemini를 다시 호출하지 않고, 문항 시딩 시
 * 이미 준비된 `Question.followUpHints`(주제 키워드)를 템플릿에 꽂아 만든다.
 * 이미 채점을 위해 호출한 evaluateAnswer 결과만으로 트리거 여부를 판단하므로
 * 세션당 추가 API 비용이 발생하지 않는다.
 */

import type { RubricResult } from "@/lib/gemini/evaluate";

// 이미 꽤 괜찮은 답변까지 꼬리질문으로 붙잡지 않도록 두 조건을 모두 만족할 때만 트리거한다.
const FOLLOW_UP_SCORE_THRESHOLD = 0.65;
const FOLLOW_UP_SPECIFICITY_THRESHOLD = 0.5;

/** 답변이 추상적이라 꼬리질문이 필요한지 판단한다. 문항당 한 번만 호출되도록
 *  (원 답변 채점 시에만) 호출측에서 보장해야 한다 — 꼬리질문 답변 자체에는 다시 적용하지 않는다. */
export function shouldTriggerFollowUp(rubric: RubricResult): boolean {
  return (
    rubric.score < FOLLOW_UP_SCORE_THRESHOLD &&
    rubric.dimensions.specificity < FOLLOW_UP_SPECIFICITY_THRESHOLD
  );
}

function normalizeHints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((h): h is string => typeof h === "string" && h.trim().length > 0);
}

/** followUpHints 중 답변에서 아직 언급되지 않은 키워드를 우선 선택한다
 *  (이미 다룬 부분을 또 캐묻지 않기 위함). 힌트가 없으면 범용 템플릿을 쓴다. */
export function pickFollowUpQuestion(rawHints: unknown, answer: string): string {
  const hints = normalizeHints(rawHints);

  if (hints.length === 0) {
    return "방금 답변을 조금 더 구체적인 사례나 수치를 포함해서 다시 한번 설명해 주시겠어요?";
  }

  const uncovered = hints.find((h) => !answer.includes(h));
  const topic = uncovered ?? hints[0];

  return `조금 더 구체적으로 여쭤볼게요 — 답변하신 내용 중 '${topic}' 부분을 실제 상황이나 수치를 들어 더 자세히 말씀해 주시겠어요?`;
}

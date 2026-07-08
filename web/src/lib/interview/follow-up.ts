/**
 * AI 꼬리질문 — 답변이 추상적일 때 같은 문항에서 **한 번만** 더 파고든다.
 *
 * 원칙:
 * - 세션당 꼬리질문은 최대 1회 (호출측 followUpUsed 플래그로 보장).
 * - 질문 내용은 **사용자가 방금 말한 구절**만 인용한다. 문항 뱅크 키워드·환각 금지.
 * - LLM suggestedFollowUp도 답변에 실제 등장하는 구절을 포함해야만 채택한다.
 */

import type { RubricResult } from "@/lib/gemini/evaluate";
import type { PressureTier } from "@/lib/interview/persona";
import { extractQuote } from "@/lib/interview/feedback-helpers";

const FOLLOW_UP_THRESHOLDS: Record<PressureTier, { score: number; specificity: number }> = {
  GENTLE: { score: 0.55, specificity: 0.4 },
  NEUTRAL: { score: 0.65, specificity: 0.5 },
  TOUGH: { score: 0.75, specificity: 0.6 },
};

/** 문항당 1회·세션당 1회는 호출측에서 보장한다. */
export function shouldTriggerFollowUp(
  rubric: RubricResult,
  tier: PressureTier = "NEUTRAL"
): boolean {
  const { score, specificity } = FOLLOW_UP_THRESHOLDS[tier];
  return rubric.score < score && rubric.dimensions.specificity < specificity;
}

const TIER_TEMPLATES: Record<PressureTier, (quoted: string) => string> = {
  GENTLE: (quoted) =>
    `괜찮으시면, 방금 말씀하신 「${quoted}」 부분을 조금 더 구체적인 상황이나 수치로 이어서 설명해 주시겠어요?`,
  NEUTRAL: (quoted) =>
    `방금 답변 중 「${quoted}」 부분을, 실제 상황·행동·결과(가능하면 수치)를 들어 더 자세히 말씀해 주시겠어요?`,
  TOUGH: (quoted) =>
    `「${quoted}」라고 하셨는데, 그때 본인이 한 행동과 측정 가능한 결과를 근거로 다시 명확히 설명해 주십시오.`,
};

/** 답변에서 짧게 인용할 구절 — extractQuote가 뽑은 문장을 20~40자로 자른다. */
export function extractAnswerAnchor(answer: string, maxLen = 36): string {
  const quote = extractQuote(answer, 80).replace(/^[「"']|[」"']$/g, "").trim();
  if (quote.length <= maxLen) return quote || "방금 말씀하신 부분";
  // 어절 경계에서 자른다
  const cut = quote.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const clipped = lastSpace > 12 ? cut.slice(0, lastSpace) : cut;
  return `${clipped}…`;
}

/**
 * 사용자 발화에만 근거한 꼬리질문.
 * @deprecated hints — 뱅크 키워드는 환각 원인이라 무시한다 (시그니처 호환만 유지).
 */
export function pickFollowUpQuestion(
  _rawHints: unknown,
  answer: string,
  tier: PressureTier = "NEUTRAL"
): string {
  const anchor = extractAnswerAnchor(answer);
  return TIER_TEMPLATES[tier](anchor);
}

/**
 * LLM이 제안한 꼬리질문이 실제 답변 구절을 인용하는지 검증.
 * 검증 실패 시 null → 호출측에서 pickFollowUpQuestion으로 대체.
 */
export function acceptGroundedSuggestedFollowUp(
  suggested: string | null | undefined,
  answer: string
): string | null {
  if (!suggested?.trim()) return null;
  const s = suggested.trim();
  if (s.length < 12 || s.length > 180) return null;

  const normalizedAnswer = answer.replace(/\s+/g, "");
  if (normalizedAnswer.length < 8) return null;

  // 「…」 / "…" 인용 구가 답변에 포함되는지
  const quoted = [...s.matchAll(/[「"]([^」"]{4,40})[」"]/g)].map((m) => m[1]);
  for (const q of quoted) {
    const nq = q.replace(/\s+/g, "");
    if (nq.length >= 4 && normalizedAnswer.includes(nq)) return s;
  }

  // 인용 부호 없이도 답변에서 뽑은 앵커가 질문에 포함되면 OK
  const anchor = extractAnswerAnchor(answer, 24).replace(/…$/, "");
  const na = anchor.replace(/\s+/g, "");
  if (na.length >= 4 && s.replace(/\s+/g, "").includes(na)) return s;

  return null;
}

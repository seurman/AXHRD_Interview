/**
 * 자소서 경험 주장에 대한 설명 구체성 판정 — IRT/점수와 무관.
 */

import { generateGeminiText } from "@/lib/gemini/client";

export type ClaimVerificationLabel = "검증됨" | "부분검증" | "설명부족";

export interface ClaimVerificationResult {
  label: ClaimVerificationLabel;
  reasoning: string;
  newDetails: string[];
}

/** 응시자 대면 UI용 — "검증" 단어 없이 순화 */
export const CLAIM_LABEL_DISPLAY: Record<ClaimVerificationLabel, string> = {
  검증됨: "구체적으로 잘 설명했어요",
  부분검증: "조금 더 보완할 여지가 있어요",
  설명부족: "다음엔 상황·수치를 더 붙여 보세요",
};

const VERIFICATION_SYSTEM = `당신은 채용 면접 코치입니다. 아래 세 가지를 받습니다:
1. 자소서 원문 문장(주장)
2. 그 주장을 더 캐묻기 위해 던진 질문
3. 지원자의 답변

당신의 역할은 "AI가 썼는지 판정"하는 게 아니라, **답변이 주장을 얼마나 구체적으로
뒷받침하는지**만 평가하는 것입니다.

판정 기준:
- "검증됨": 답변에 원문 주장에는 없던 구체적 정보(수치·구체적 행동·의사결정 과정·인물/역할)가
  자연스럽게 추가되고, 주장과 논리적으로 모순되지 않음.
- "부분검증": 어느 정도 구체화는 되었으나 새로운 핵심 정보가 부족하거나 다소 일반적인
  수준에 머무름.
- "설명부족": 질문에 대한 답이 원문 재진술 수준이거나, 구체적 근거 없이 넘어가거나,
  주장과 모순되는 내용이 있음.

절대 "AI가 썼다/거짓말이다" 같은 단정적 표현을 쓰지 마세요 — 이 도구는 진위 판정이 아니라
설명 구체성만 평가합니다. reasoning은 지원자에게 그대로 보여줄 수 있는 존중하는 톤으로
1~2문장 작성하세요.

JSON만: {"label":"검증됨|부분검증|설명부족","reasoning":"...","newDetails":["..."]}`;

const VALID_LABELS = new Set<ClaimVerificationLabel>([
  "검증됨",
  "부분검증",
  "설명부족",
]);

function heuristicFallback(answer: string): ClaimVerificationResult {
  const trimmed = answer.trim();
  const hasMetric = /\d+(\.\d+)?\s*(%|퍼센트|명|건|억|만\s?원|배|시간|일|개월)/.test(trimmed);
  const longEnough = trimmed.length >= 80;

  if (longEnough && hasMetric) {
    return {
      label: "검증됨",
      reasoning: "답변에 구체적인 수치나 상황이 추가되어 경험 설명이 한층 풍부해졌습니다.",
      newDetails: [],
    };
  }
  if (trimmed.length >= 40) {
    return {
      label: "부분검증",
      reasoning: "일부 맥락은 전달되었으나, 행동·결과를 더 구체적으로 붙이면 좋겠습니다.",
      newDetails: [],
    };
  }
  return {
    label: "설명부족",
    reasoning: "질문에 맞춰 상황·행동·결과를 조금 더 풀어 설명해 보시면 좋겠습니다.",
    newDetails: [],
  };
}

export async function evaluateClaimVerification(params: {
  claim: string;
  question: string;
  answer: string;
}): Promise<ClaimVerificationResult> {
  const answer = params.answer.trim();
  if (!answer) {
    return {
      label: "설명부족",
      reasoning: "답변 내용이 비어 있어 경험을 구체적으로 확인하기 어렵습니다.",
      newDetails: [],
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return heuristicFallback(answer);
  }

  const userPrompt = `
[자소서 원문]
${params.claim}

[질문]
${params.question}

[지원자 답변]
${answer}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: VERIFICATION_SYSTEM,
    userPrompt,
    temperature: 0.2,
    maxOutputTokens: 400,
    timeoutMs: 35_000,
    task: "claim_verification",
    responseMimeType: "application/json",
  });

  if (!content) return heuristicFallback(answer);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return heuristicFallback(answer);

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      label?: string;
      reasoning?: string;
      newDetails?: string[];
    };
    const label = parsed.label?.trim() as ClaimVerificationLabel | undefined;
    const reasoning = parsed.reasoning?.trim();
    if (!label || !VALID_LABELS.has(label) || !reasoning) {
      return heuristicFallback(answer);
    }
    const newDetails = Array.isArray(parsed.newDetails)
      ? parsed.newDetails.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      : [];
    return { label, reasoning, newDetails };
  } catch {
    return heuristicFallback(answer);
  }
}

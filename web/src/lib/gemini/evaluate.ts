/**
 * Gemini 2.5 Flash-Lite — 실시간 답변 채점 (저비용)
 */

import { generateGeminiText } from "@/lib/gemini/client";

export interface RubricResult {
  score: number; // 0.0 - 1.0
  briefFeedback: string;
  dimensions: {
    structure: number;
    specificity: number;
    relevance: number;
    clarity: number;
  };
}

const RUBRIC_SYSTEM = `당신은 한국 기업 면접 평가관입니다.
답변을 0.0~1.0 루브릭 점수로 평가하세요. "채점 기준"이 주어지면 반드시 그 기준을 우선 적용하고,
briefFeedback에는 기준 중 어떤 부분이 충족/미흡했는지 구체적으로 언급하세요.
반드시 JSON만 출력:
{
  "score": 0.0-1.0,
  "briefFeedback": "1문장 한국어 피드백",
  "dimensions": {
    "structure": 0.0-1.0,
    "specificity": 0.0-1.0,
    "relevance": 0.0-1.0,
    "clarity": 0.0-1.0
  }
}`;

export async function evaluateAnswer(params: {
  question: string;
  answer: string;
  competency: string;
  resumeContext?: string;
  /** 질문 생성 시 함께 만들어진 맞춤 채점 기준(있으면 우선 적용) */
  rubricCriteria?: string[];
}): Promise<RubricResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return mockEvaluate(params.answer);
  }

  const userPrompt = `
역량: ${params.competency}
질문: ${params.question}
${params.rubricCriteria?.length ? `채점 기준:\n${params.rubricCriteria.map((c) => `- ${c}`).join("\n")}` : ""}
${params.resumeContext ? `자소서 맥락: ${params.resumeContext.slice(0, 500)}` : ""}
답변: ${params.answer}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: RUBRIC_SYSTEM,
    userPrompt,
    temperature: 0.2,
    maxOutputTokens: 256,
    timeoutMs: 8000,
  });

  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as RubricResult;
      } catch (e) {
        console.error("[Gemini evaluate] JSON parse 실패:", e);
      }
    }
  }

  return mockEvaluate(params.answer);
}

/** API 키 없을 때 개발용 휴리스틱 */
function mockEvaluate(answer: string): RubricResult {
  const len = answer.trim().length;
  const hasStar =
    /상황|과제|행동|결과|situation|task|action|result/i.test(answer);
  const hasNumber = /\d+/.test(answer);

  let score = 0.3;
  if (len > 80) score += 0.15;
  if (len > 200) score += 0.15;
  if (hasStar) score += 0.2;
  if (hasNumber) score += 0.1;
  score = Math.min(score, 0.95);

  return {
    score,
    briefFeedback:
      score >= 0.75
        ? "구체적 사례와 결과가 잘 드러났습니다."
        : score >= 0.55
          ? "기본 구조는 있으나 구체성을 보강하세요."
          : "상황·행동·결과를 STAR로 정리해 보세요.",
    dimensions: {
      structure: hasStar ? 0.7 : 0.4,
      specificity: hasNumber ? 0.65 : 0.35,
      relevance: len > 50 ? 0.6 : 0.3,
      clarity: len > 100 ? 0.65 : 0.4,
    },
  };
}

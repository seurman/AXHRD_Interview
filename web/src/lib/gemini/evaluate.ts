/**
 * Gemini 2.5 Flash-Lite — 실시간 답변 채점 (저비용)
 */

import { generateGeminiText } from "@/lib/gemini/client";
import { pressureTierPromptHint, type PressureTier } from "@/lib/interview/persona";
import { detectStarCoverage, starCoachingNote } from "@/lib/interview/feedback-helpers";

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

const RUBRIC_SYSTEM = `당신은 BEI(행동사건면접) 기법에 능숙한 한국 기업 면접 평가관입니다.
답변을 0.0~1.0 루브릭 점수로 평가하세요. "채점 기준"이 주어지면 반드시 그 기준을 우선 적용하고,
briefFeedback에는 STAR(상황-과제-행동-결과) 구조 중 어떤 요소가 드러났고 어떤 요소가 부족한지
구체적으로 짚어 2~3문장으로 코칭하세요(어떤 기준이 충족/미흡했는지도 함께 언급).
반드시 JSON만 출력:
{
  "score": 0.0-1.0,
  "briefFeedback": "STAR 구조 분석을 포함한 2~3문장 한국어 피드백",
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

export interface CorrectedRubricResult extends RubricResult {
  correctedAnswer: string;
  /** 자소서와 명백히 모순되는 사실이 있을 때만 채워지는 부드러운 코칭 톤 1문장. 없으면 null.
   *  채점(score)에는 영향을 주지 않는다 — "거짓말 탐지"가 아니라 정보 정리 제안. */
  consistencyNote: string | null;
  /** 답변에 논리적 비약·구체성 부족이 있을 때 AI가 즉석에서 만든 후속 질문 제안. 없으면 null.
   *  비용 원칙상 역량당 첫 문항(자소서 개인화 대상)에만 실제로 사용하고, 나머지 문항은
   *  무료 키워드 기반 pickFollowUpQuestion()으로 대체한다(호출측 책임). */
  suggestedFollowUp: string | null;
}

const CORRECT_AND_EVALUATE_SYSTEM = `당신은 BEI(행동사건면접, Behavioral Event Interview) 기법에 능숙한
한국 기업 면접 평가관 겸 음성인식(STT) 오류 교정기입니다.
"원문 답변"은 브라우저 음성 인식으로 받아쓴 면접 답변이라 발음이 비슷한 단어로 잘못
인식된 부분이 있을 수 있습니다(예: "병목"이 "병 먹고"로, "구간"이 "간"으로 잘못 인식).

순서:
1. 명백한 오인식만 문맥에 맞게 교정하세요. 내용을 추가하거나 문장을 매끄럽게 다듬지 마세요.
   의미가 이미 통하는 문장은 그대로 두고, 답변에 실제로 없는 정보를 지어내지 마세요.
2. 교정된 답변을 기준으로 0.0~1.0 루브릭 점수를 매기세요. "채점 기준"이 주어지면 그 기준을
   우선 적용하세요. briefFeedback은 BEI/STAR(상황-과제-행동-결과) 분석을 담아 2~3문장으로
   작성하세요 — 답변에서 상황·과제·행동·결과 중 어떤 요소가 구체적으로 드러났고 어떤
   요소가 빠졌는지 짚고, 빠진 요소를 보강하려면 무엇을 덧붙이면 좋을지 실질적인 코칭을
   담으세요("채점 기준"이 있으면 그 기준 충족/미흡 여부도 함께 언급).
3. "자소서 맥락"이 주어졌다면, 답변 내용이 자소서와 명백히 모순되는 사실(기간·숫자·역할·
   기술 스택 등)이 있는지만 확인하세요. 모순이 있으면 consistencyNote에 부드러운 코칭 톤
   1문장으로 적으세요(예: "자소서에는 3년으로 적혀 있는데 방금은 1년이라 하셨어요 — 정리해서
   답변하면 더 신뢰감을 줄 수 있어요."). 절대 "거짓말"이라 단정하지 말고 항상 정보 정리
   제안으로 표현하세요. 단순 요약·표현 차이는 모순이 아닙니다. 모순이 없거나 자소서 맥락이
   없으면 consistencyNote는 반드시 null로 두세요(사소한 걸로 억지로 지적하지 마세요).
4. 답변에 논리적 비약이나 구체성 부족(막연한 주장, 근거 없는 수치, 방법론 누락 등)이 있다면
   그 부분을 더 파고드는 후속 질문을 suggestedFollowUp에 1문장으로 제안하세요. "면접관 태도"가
   주어지면 그 어투에 맞추세요. 이미 충분히 구체적이고 훌륭한 답변이면 반드시 null로 두세요.

반드시 JSON만 출력:
{
  "correctedAnswer": "교정된 답변 전체 텍스트",
  "score": 0.0-1.0,
  "briefFeedback": "STAR 구조 분석을 포함한 2~3문장 한국어 피드백",
  "dimensions": {
    "structure": 0.0-1.0,
    "specificity": 0.0-1.0,
    "relevance": 0.0-1.0,
    "clarity": 0.0-1.0
  },
  "consistencyNote": "1문장 또는 null",
  "suggestedFollowUp": "1문장 또는 null"
}`;

/**
 * STT 교정 + 채점을 한 번의 Gemini 호출로 합친 버전.
 * 매 턴마다 correctTranscript() + evaluateAnswer()를 순차 호출하던 것을 하나로 합쳐
 * 왕복 1회를 줄인다 — 특히 꼬리질문이 트리거되는 턴(원 답변 채점만 하고 바로 반환)에서
 * 체감 지연이 절반 가까이 줄어든다.
 */
export async function correctAndEvaluateAnswer(params: {
  question: string;
  rawAnswer: string;
  competency: string;
  resumeContext?: string;
  rubricCriteria?: string[];
  /** 압박 강도 — suggestedFollowUp의 어투를 여기 맞춘다(추가 호출 없음, 프롬프트 한 줄) */
  pressureTier?: PressureTier;
}): Promise<CorrectedRubricResult> {
  const raw = params.rawAnswer ?? "";
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || raw.trim().length < 8) {
    return { ...mockEvaluate(raw), correctedAnswer: raw, consistencyNote: null, suggestedFollowUp: null };
  }

  const userPrompt = `
역량: ${params.competency}
질문: ${params.question}
${params.rubricCriteria?.length ? `채점 기준:\n${params.rubricCriteria.map((c) => `- ${c}`).join("\n")}` : ""}
${params.resumeContext ? `자소서 맥락: ${params.resumeContext.slice(0, 500)}` : ""}
${params.pressureTier ? `면접관 태도: ${pressureTierPromptHint(params.pressureTier)}` : ""}
원문 답변(STT): ${raw}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: CORRECT_AND_EVALUATE_SYSTEM,
    userPrompt,
    temperature: 0.2,
    maxOutputTokens: Math.max(400, Math.ceil(raw.length * 1.5)),
    timeoutMs: 8000,
  });

  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          correctedAnswer?: string;
          score?: number;
          briefFeedback?: string;
          dimensions?: RubricResult["dimensions"];
          consistencyNote?: string | null;
          suggestedFollowUp?: string | null;
        };
        if (typeof parsed.score === "number" && parsed.dimensions) {
          let correctedAnswer = parsed.correctedAnswer?.trim() || raw;
          // 결과가 비정상적으로 짧거나(잘림) 너무 길면(내용 추가 의심) 원문을 그대로 사용
          if (
            correctedAnswer.length < raw.length * 0.5 ||
            correctedAnswer.length > raw.length * 1.8
          ) {
            correctedAnswer = raw;
          }
          return {
            correctedAnswer,
            score: parsed.score,
            briefFeedback: parsed.briefFeedback ?? "",
            dimensions: parsed.dimensions,
            consistencyNote:
              typeof parsed.consistencyNote === "string" && parsed.consistencyNote.trim()
                ? parsed.consistencyNote.trim()
                : null,
            suggestedFollowUp:
              typeof parsed.suggestedFollowUp === "string" && parsed.suggestedFollowUp.trim()
                ? parsed.suggestedFollowUp.trim()
                : null,
          };
        }
      } catch (e) {
        console.error("[Gemini correctAndEvaluate] JSON parse 실패:", e);
      }
    }
  }

  return { ...mockEvaluate(raw), correctedAnswer: raw, consistencyNote: null, suggestedFollowUp: null };
}

/**
 * API 키 없을 때 개발용 휴리스틱. LLM 프롬프트 경로와 동일하게 BEI/STAR 커버리지
 * 기반으로 채점·피드백을 만든다(feedback-helpers.ts의 결정론적 텍스트 분석 재사용 —
 * 추가 LLM 호출 없음, 특허 회피 원칙 유지).
 */
function mockEvaluate(answer: string): RubricResult {
  const len = answer.trim().length;
  const coverage = detectStarCoverage(answer);
  const starHits = Object.values(coverage).filter(Boolean).length; // 0~4
  const hasNumber = /\d+/.test(answer);

  let score = 0.3;
  if (len > 80) score += 0.15;
  if (len > 200) score += 0.15;
  score += starHits * 0.1; // STAR 4요소 각각 최대 0.1씩
  if (hasNumber) score += 0.05;
  score = Math.min(score, 0.95);

  return {
    score,
    briefFeedback: starCoachingNote(coverage),
    dimensions: {
      structure: coverage.situation && coverage.task ? 0.7 : coverage.situation || coverage.task ? 0.5 : 0.3,
      specificity: coverage.result && hasNumber ? 0.75 : coverage.result || hasNumber ? 0.55 : 0.3,
      relevance: coverage.action ? 0.65 : len > 50 ? 0.5 : 0.3,
      clarity: len > 100 ? 0.65 : 0.4,
    },
  };
}

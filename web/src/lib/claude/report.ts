/**
 * Gemini Pro — 세션 리포트 생성 (세션당 1회)
 * 폴더명(claude)은 레거시입니다 — Claude → DeepSeek → Gemini Pro로 교체했습니다.
 * (DeepSeek는 결제/크레딧 미설정으로 매 호출이 실패해 mock으로만 폴백되던 것을 정리)
 */

import { generateGeminiText } from "@/lib/gemini/client";
import { competencyLabel } from "@/lib/labels";
import { extractQuote } from "@/lib/interview/feedback-helpers";
import type { CompetencySummary, SessionReportData } from "@/types";

const REPORT_SYSTEM = `당신은 한국 취업 코치입니다.
면접 세션 결과를 바탕으로 격려와 구체적 개선안이 담긴 리포트 JSON을 작성하세요.

중요: 각 section의 "highlight"는 해당 역량 답변 중 지원자가 실제로 한 말을 그대로 인용해야 합니다(지어내지 마세요).
꼬리질문이 있었던 문항(hadFollowUp=true)은 원 답변과 꼬리질문 답변을 함께 보고, 꼬리질문에 얼마나 잘 대응했는지도 해당 section의 content나 suggestions에 자연스럽게 반영하세요.

반드시 JSON만 출력:
{
  "summary": "2-3문장 총평",
  "sections": [{"title": "역량명", "content": "분석", "score": 0-100, "suggestions": ["..."], "highlight": "실제 답변 인용"}],
  "strengths": ["..."],
  "improvements": ["..."],
  "nextSteps": ["..."]
}`;

export async function generateSessionReport(params: {
  companyName?: string;
  jobRole?: string;
  competencies: CompetencySummary[];
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    competency: string;
    followUpQuestion?: string;
    followUpAnswer?: string;
    hadFollowUp?: boolean;
  }>;
}): Promise<SessionReportData> {
  const userContent = JSON.stringify(
    {
      company: params.companyName,
      jobRole: params.jobRole,
      competencySummaries: params.competencies,
      responses: params.responses.slice(0, 12),
    },
    null,
    2
  );

  try {
    const text = await generateGeminiText({
      systemInstruction: REPORT_SYSTEM,
      userPrompt: userContent,
      temperature: 0.4,
      maxOutputTokens: 3072,
      // 리포트는 세션 종료 시 사용자가 기다리는 동기 호출이라 타임아웃을 둔다
      timeoutMs: 45_000,
      task: "session_report",
      responseMimeType: "application/json",
    });

    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SessionReportData;
      }
    }
  } catch (e) {
    console.error("[Gemini session report]", e);
  }

  return mockReport(params.competencies, params.responses);
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickTemplates<T>(templates: T[], seed: string, count: number): T[] {
  if (templates.length === 0) return [];
  const start = hashSeed(seed) % templates.length;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(templates[(start + i) % templates.length]);
  }
  return picked;
}

function contentForPercentile(percentile: number, level: number): string {
  if (percentile >= 70) {
    return `추정 레벨 L${level} — 상위권 역량으로 안정적인 답변을 보였습니다.`;
  }
  if (percentile >= 50) {
    return `추정 레벨 L${level} — 평균 이상 수준으로 핵심을 전달했습니다.`;
  }
  if (percentile >= 40) {
    return `추정 레벨 L${level} — 기본기는 갖추었으나 구체성을 더하면 좋겠습니다.`;
  }
  return `추정 레벨 L${level} — 기초 역량부터 다시 다지면 좋겠습니다.`;
}

const SUGGESTION_HIGH = [
  "성과 수치와 본인 기여도를 한 문장으로 압축해 말해보세요.",
  "답변 마지막에 배운 점·다음 행동을 한 줄로 정리해보세요.",
  "같은 경험을 STAR 구조로 2분 이내에 말하는 연습을 해보세요.",
];

const SUGGESTION_MID = [
  "상황·과제·행동·결과 순서로 답변을 재구성해보세요.",
  "추상적 표현 대신 구체적 사례 하나를 골라 반복 연습하세요.",
  "질문 의도에 맞는 키워드를 답변 앞부분에 먼저 제시해보세요.",
];

const SUGGESTION_LOW = [
  "L1~L2 기초 문항부터 짧게 답하는 연습을 해보세요.",
  "경험이 없더라도 학습·프로젝트 사례를 하나 준비해두세요.",
  "한 문장 요약 → 근거 한 가지 순으로 답변 길이를 맞춰보세요.",
];

function suggestionsForCompetency(competency: string, percentile: number): string[] {
  const templates =
    percentile >= 70 ? SUGGESTION_HIGH : percentile >= 50 ? SUGGESTION_MID : SUGGESTION_LOW;
  return pickTemplates(templates, competency, 2);
}

function mockReport(
  competencies: CompetencySummary[],
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    competency: string;
    followUpQuestion?: string;
    followUpAnswer?: string;
    hadFollowUp?: boolean;
  }>
): SessionReportData {
  const sorted = [...competencies].sort((a, b) => b.theta - a.theta);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const weakestLabel = bottom ? competencyLabel(bottom.competency) : "약점";

  return {
    summary: `전반적으로 ${competencies.length}개 역량을 측정했습니다. ${top?.competency ? competencyLabel(top.competency) : ""} 영역이 상대적으로 강점으로 보입니다.`,
    sections: competencies.map((c) => {
      const compResponses = responses
        .filter((r) => r.competency === c.competency && r.answer?.trim())
        .sort((a, b) => b.score - a.score);
      const bestAnswer = compResponses[0];
      const percentile = Math.round(c.percentile);

      return {
        title: c.competency,
        content: contentForPercentile(percentile, c.level_estimate),
        score: percentile,
        suggestions: suggestionsForCompetency(c.competency, percentile),
        highlight: bestAnswer ? extractQuote(bestAnswer.answer) : undefined,
      };
    }),
    strengths: top ? [`${competencyLabel(top.competency)} 역량 (상위 ${Math.round(top.percentile)}%)`] : [],
    improvements: bottom
      ? [`${competencyLabel(bottom.competency)} 역량 보강 (레벨 ${bottom.level_estimate})`]
      : [],
    nextSteps: [
      `${weakestLabel} 영역 L1~L2 문항 반복 연습`,
      "STAR 구조로 2분 이내 답변 연습",
      `${weakestLabel} 역량 중심으로 다음 차수 면접 진행`,
    ],
  };
}

/**
 * DeepSeek — 세션 리포트 생성 (가성비, 세션당 1회)
 * 폴더명(claude)은 레거시입니다 — Claude에서 DeepSeek로 교체했습니다.
 * @see https://api-docs.deepseek.com
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { competencyLabel } from "@/lib/labels";
import { extractQuote } from "@/lib/interview/feedback-helpers";
import type { CompetencySummary, SessionReportData } from "@/types";

const DEEPSEEK_BASE = "https://api.deepseek.com";

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
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return mockReport(params.competencies, params.responses);
  }

  const model = process.env.DEEPSEEK_REPORT_MODEL ?? "deepseek-chat";

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
    const res = await fetchWithTimeout(`${DEEPSEEK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: REPORT_SYSTEM },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
      // 리포트는 세션 종료 시 사용자가 기다리는 동기 호출이라 20초로 제한
      timeoutMs: 20000,
      retries: 1,
    });

    if (!res.ok) {
      console.error("[DeepSeek report] HTTP", res.status, await res.text());
      return mockReport(params.competencies, params.responses);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SessionReportData;
    }
  } catch (e) {
    console.error("[DeepSeek report]", e);
  }

  return mockReport(params.competencies, params.responses);
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

  return {
    summary: `전반적으로 ${competencies.length}개 역량을 측정했습니다. ${top?.competency ? competencyLabel(top.competency) : ""} 영역이 상대적으로 강점으로 보입니다.`,
    sections: competencies.map((c) => {
      const compResponses = responses
        .filter((r) => r.competency === c.competency && r.answer?.trim())
        .sort((a, b) => b.score - a.score);
      const bestAnswer = compResponses[0];

      return {
        title: c.competency,
        content: `θ=${c.theta.toFixed(2)}, 추정 레벨 L${c.level_estimate}`,
        score: Math.round(c.percentile),
        suggestions: ["구체적 수치와 본인 역할을 포함하세요."],
        highlight: bestAnswer ? extractQuote(bestAnswer.answer) : undefined,
      };
    }),
    strengths: top ? [`${competencyLabel(top.competency)} 역량 (상위 ${Math.round(top.percentile)}%)`] : [],
    improvements: bottom
      ? [`${competencyLabel(bottom.competency)} 역량 보강 (레벨 ${bottom.level_estimate})`]
      : [],
    nextSteps: [
      "약점 역량 L1~L2 문항 반복 연습",
      "STAR 구조로 2분 이내 답변 연습",
      "다음 차수에서 동일 역량 θ 변화 확인",
    ],
  };
}

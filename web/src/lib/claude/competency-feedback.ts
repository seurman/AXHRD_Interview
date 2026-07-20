/**
 * 역량 단위 피드백 생성 (Gemini Pro 또는 mock)
 * 폴더명(claude)은 레거시입니다 — Claude → DeepSeek → Gemini Pro로 교체했습니다.
 * (DeepSeek는 결제/크레딧 미설정으로 매 호출이 실패해 mock으로만 폴백되던 것을 정리)
 */

import { generateGeminiText } from "@/lib/gemini/client";
import { competencyLabel } from "@/lib/labels";
import {
  detectStarCoverage,
  extractQuote,
  starCoachingNote,
  starRewriteTemplate,
} from "@/lib/interview/feedback-helpers";
import type { CompetencySummary } from "@/types";
import {
  normalizeCompetencyDimensions,
  type CompetencyReportDimensions,
} from "@/lib/interview/answer-dimensions";

export interface CompetencyFeedbackData {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  dimensions: CompetencyReportDimensions;
  score: number;
  /** 실제 답변에서 뽑은 인용문 + 코칭 노트 (Yoodli 등 선도 서비스의 "답변 하이라이트" 패턴 참고).
   *  type으로 강점 근거/개선 근거를 구분 — 최소 1개씩 포함하도록 프롬프트에서 요구. */
  highlights: Array<{ quote: string; note: string; type?: "strength" | "growth" }>;
  /** STAR 구조로 다시 써보는 예시 문장 뼈대 */
  rewriteExample: string;
  /** "이 페르소나답게 답변했는가" 1문장 코칭 — persona가 주어졌을 때만 채워짐(채점 무관) */
  personaAlignmentNote: string | null;
}

const SYSTEM = `당신은 한국 취업 면접 코치입니다.
단일 역량에 대한 모의 면접 결과만 분석해 JSON으로 답하세요.

중요(근거 기반 평가 원칙):
- "summary"는 반드시 (1) 관찰된 구체적 답변 내용(무엇을 어떻게 말했는지)을 먼저 제시하고 (2) 그 근거가
  왜 이 점수/레벨에 해당하는지 판단을 뒤에 쓰는 순서로 작성하세요. 답변에서 실제로 확인되지 않은
  행동·역량을 있다고 추정해서 쓰지 마세요 — 근거가 부족하면 "이번 답변만으로는 확인되지 않았다"고
  솔직히 쓰세요.
- "highlights"는 최소 2개를 만들되, 가능하면 하나는 강점을 보여주는 인용(type="strength"), 하나는
  개선이 필요한 부분을 보여주는 인용(type="growth")으로 구성하세요. quote는 지원자가 실제로 한 말을
  그대로 인용해야 합니다(지어내지 마세요). note는 그 인용이 왜 강점/개선점인지 구체적으로 설명하세요
  (막연한 칭찬·지적 금지).
- 꼬리질문이 있었던 문항(hadFollowUp=true)은 원 답변과 꼬리질문 답변을 함께 보고, 꼬리질문 대응도 summary·improvements·highlights에 자연스럽게 반영하세요.
- rewriteExample은 가장 약한 답변 하나를 상황-과제-행동-결과(STAR) 구조로 다시 쓴 예시 문장입니다.
- "지원자 페르소나"가 주어지면, 답변들이 그 페르소나(가치관·태도)답게 일관됐는지 1문장으로
  코칭하세요(personaAlignmentNote). 페르소나가 없으면 null로 두세요. 이 코칭은 점수(score)에
  전혀 영향을 주지 않습니다 — 참고용 코칭 문구일 뿐입니다.

반드시 JSON만:
{
  "summary": "근거→판단 순으로 쓴 2-3문장 역량별 총평",
  "strengths": ["..."],
  "improvements": ["..."],
  "suggestions": ["다음 연습 방법"],
  "dimensions": {"questionIntent":0-100,"situationSpecificity":0-100,"individualOwnership":0-100,"logic":0-100,"outcomeQuantification":0-100,"delivery":0-100},
  "score": 0-100,
  "highlights": [{"quote": "실제 답변 인용", "note": "왜 강점/개선점인지 설명", "type": "strength|growth"}],
  "rewriteExample": "STAR로 다시 쓴 예시 문장",
  "personaAlignmentNote": "페르소나답게 답변했는지 1문장 코칭 또는 null"
}`;

export async function generateCompetencyFeedback(params: {
  competency: string;
  summary: CompetencySummary;
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    followUpQuestion?: string;
    followUpAnswer?: string;
    hadFollowUp?: boolean;
  }>;
  companyName?: string;
  jobRole?: string;
  persona?: { name: string; description: string } | null;
}): Promise<CompetencyFeedbackData> {
  const userContent = JSON.stringify(
    {
      competency: competencyLabel(params.competency),
      competencyCode: params.competency,
      company: params.companyName,
      jobRole: params.jobRole,
      "지원자 페르소나": params.persona
        ? { "이름": params.persona.name, "설명": params.persona.description }
        : null,
      irt: params.summary,
      responses: params.responses,
    },
    null,
    2
  );

  try {
    const text = await generateGeminiText({
      systemInstruction: SYSTEM,
      userPrompt: userContent,
      temperature: 0.4,
      maxOutputTokens: 1536,
      timeoutMs: 45_000,
      task: "competency_feedback",
      responseMimeType: "application/json",
    });

    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<CompetencyFeedbackData> & {
          dimensions?: unknown;
        };
        const fallback = mockCompetencyFeedback(params);
        const normalizedDims = normalizeCompetencyDimensions(parsed.dimensions);
        const asStringList = (value: unknown, backup: string[]): string[] => {
          if (Array.isArray(value)) {
            return value
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim())
              .filter(Boolean);
          }
          if (typeof value === "string" && value.trim()) return [value.trim()];
          return backup;
        };
        const highlights = Array.isArray(parsed.highlights)
          ? parsed.highlights
              .filter(
                (h): h is { quote: string; note: string; type?: "strength" | "growth" } =>
                  !!h &&
                  typeof h === "object" &&
                  typeof (h as { quote?: unknown }).quote === "string" &&
                  typeof (h as { note?: unknown }).note === "string",
              )
              .map((h) => ({
                quote: h.quote.trim(),
                note: h.note.trim(),
                type: h.type === "growth" ? ("growth" as const) : ("strength" as const),
              }))
              .filter((h) => h.quote && h.note)
          : [];
        return {
          summary:
            typeof parsed.summary === "string" && parsed.summary.trim()
              ? parsed.summary.trim()
              : fallback.summary,
          strengths: asStringList(parsed.strengths, fallback.strengths),
          improvements: asStringList(parsed.improvements, fallback.improvements),
          suggestions: asStringList(parsed.suggestions, fallback.suggestions),
          dimensions: normalizedDims ?? fallback.dimensions,
          score:
            typeof parsed.score === "number" && Number.isFinite(parsed.score)
              ? Math.round(Math.min(100, Math.max(0, parsed.score)))
              : fallback.score,
          highlights: highlights.length > 0 ? highlights : fallback.highlights,
          rewriteExample:
            typeof parsed.rewriteExample === "string" && parsed.rewriteExample.trim()
              ? parsed.rewriteExample.trim()
              : fallback.rewriteExample,
          personaAlignmentNote:
            typeof parsed.personaAlignmentNote === "string" &&
            parsed.personaAlignmentNote.trim()
              ? parsed.personaAlignmentNote.trim()
              : null,
        };
      }
    }
  } catch (e) {
    console.error("[Gemini competency-feedback]", e);
  }

  return mockCompetencyFeedback(params);
}

function mockCompetencyFeedback(params: {
  competency: string;
  summary: CompetencySummary;
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    followUpQuestion?: string;
    followUpAnswer?: string;
    hadFollowUp?: boolean;
  }>;
  persona?: { name: string; description: string } | null;
}): CompetencyFeedbackData {
  const responses = params.responses.filter((r) => r.answer?.trim());
  const avg =
    responses.reduce((s, r) => s + r.score, 0) / Math.max(responses.length, 1);
  const score = Math.round(params.summary.percentile);
  const label = competencyLabel(params.competency);

  // 답변별 STAR 커버리지 집계 — 실제 응답 텍스트 기반이라 세션마다 결과가 달라진다.
  const coverages = responses.map((r) => detectStarCoverage(r.answer));
  const coverageCount = (key: keyof (typeof coverages)[number]) =>
    coverages.filter((c) => c[key]).length;
  const total = Math.max(coverages.length, 1);

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (coverageCount("action") / total >= 0.6) strengths.push("본인의 행동을 능동적으로 서술");
  if (coverageCount("result") / total >= 0.6) strengths.push("결과·수치로 성과를 뒷받침");
  if (avg >= 0.6 && strengths.length === 0) strengths.push("핵심 메시지 전달");
  if (strengths.length === 0) strengths.push("면접 상황에 성실하게 임함");

  if (coverageCount("result") / total < 0.5) improvements.push("결과를 수치로 구체화하기");
  if (coverageCount("situation") / total < 0.5) improvements.push("답변 서두에 상황 설명 추가하기");
  if (improvements.length === 0) improvements.push("본인의 기여 비중을 더 명확히 밝히기");

  // 실제 답변에서 인용문 2개 추출 (가장 점수 높은 것 + 가장 낮은 것 — 다양한 예시 제공)
  const sorted = [...responses].sort((a, b) => b.score - a.score);
  const pickedResponses = [sorted[0], sorted[sorted.length - 1]].filter(
    (r, i, arr) => r && arr.indexOf(r) === i
  );

  const highlights = pickedResponses.map((r, i) => ({
    quote: extractQuote(r.answer),
    note: starCoachingNote(detectStarCoverage(r.answer)),
    // pickedResponses[0]=최고점, 마지막=최저점 — 강점/개선 근거로 태깅
    type: (i === 0 ? "strength" : "growth") as "strength" | "growth",
  }));

  return {
    summary: `${label} 역량에서 추정 레벨 L${params.summary.level_estimate}(θ=${params.summary.theta.toFixed(2)})입니다. ${avg >= 0.6 ? "기본기는 갖추었으니 사례의 구체성을 더 높여보세요." : "구체적 사례 보강이 필요합니다."} STAR 구조로 한 번 더 정리해 보세요.`,
    strengths,
    improvements,
    suggestions: [
      `${label} 관련 경험 1건을 STAR로 90초 내외로 연습`,
      "다음 역량 면접 전 키워드 3개 메모",
    ],
    dimensions: {
      questionIntent: Math.round(params.summary.percentile),
      situationSpecificity: Math.round(
        ((coverageCount("situation") + coverageCount("task")) / (2 * total)) * 100,
      ),
      individualOwnership: Math.round((coverageCount("action") / total) * 100),
      logic: Math.round(avg * 90),
      outcomeQuantification: Math.round((coverageCount("result") / total) * 100),
      delivery: Math.round(avg * 95),
    },
    score,
    highlights:
      highlights.length > 0
        ? highlights
        : [{ quote: "제출된 답변이 없습니다.", note: "다음 세션에서는 각 질문에 답변을 완료해 주세요." }],
    rewriteExample: starRewriteTemplate(label),
    // API 키 미설정/오류 시 폴백 경로 — LLM 호출 없이 페르소나 이름만으로 만드는
    // 결정론적 코칭 문구(채점 무관, 참고용). persona가 없으면 null.
    personaAlignmentNote: params.persona
      ? `${params.persona.name}답게 답변하려면 ${label} 사례에서도 그 페르소나의 태도가 드러나는 표현을 더 넣어보세요.`
      : null,
  };
}

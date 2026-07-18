/**
 * 증거형 평가 리포트(EvidenceAssessmentReport) 생성.
 * 첨부 샘플(하위역량 · +/- 관찰 행동 · 평정 근거 · 개발 제언 · 1–5 평정표)과 정렬.
 * 관찰된 행동만 평가하고, 인용은 지어내지 않는다.
 */
import { generateGeminiText } from "@/lib/gemini/client";
import { competencyLabel } from "@/lib/labels";
import {
  clampScore1to5,
  parseEvidenceAssessmentReport,
  percentileToFiveScale,
  scoreToLevelLabel,
} from "@/lib/assessment/evidence-report";
import { loadInterviewEvidenceContext } from "@/lib/assessment/load-evidence-context";
import type { CompetencySummary } from "@/types";
import type {
  CompetencyAssessmentBlock,
  EvidenceAssessmentReport,
} from "@/types/evidence-assessment";

export type EvidenceReportResponse = {
  question: string;
  answer: string;
  score: number;
  competency: string;
  followUpQuestion?: string;
  followUpAnswer?: string;
  hadFollowUp?: boolean;
};

export type GenerateEvidenceReportParams = {
  companyName?: string;
  jobRole?: string;
  competencies: CompetencySummary[];
  responses: EvidenceReportResponse[];
};

const SYSTEM = `당신은 한국 기업의 역량평가 전문가입니다. 모의면접 결과를 "증거 기반 행동평가" 리포트(JSON)로 작성하세요.

평가 원칙(반드시 준수):
- 관찰된 행동만 평가합니다. 답변에 없는 역량·행동을 있다고 추정하지 마세요. 관찰되지 않았으면 미관찰(NEGATIVE_OR_MISSING)로 처리하고, 없는 긍정 행동을 지어내지 마세요.
- 모든 quote는 지원자가 실제로 한 말을 그대로 인용합니다. 인용을 창작하지 마세요(없으면 quote 생략).
- 점수는 1~5 정수/소수. 5 매우 우수 · 4 우수 · 3 보통 · 2 미흡 · 1 매우 미흡. 관찰된 긍정/부정 행동의 빈도·강도·다양성으로 판단합니다.
- 각 역량은 하위역량으로 나누고, 하위역량마다 관찰된 긍정 행동(POSITIVE)과 부정/미관찰 행동(NEGATIVE_OR_MISSING)을 함께 제시합니다.
- rationale(평정 근거): 왜 이 점수인지 관찰 근거로 설명. developmentAdvice(개발 제언): 구체적 개선 스크립트/행동을 제안.

반드시 아래 JSON만 출력(주석·설명 금지):
{
  "schemaVersion": 1,
  "domain": "INTERVIEW",
  "reportKindLabel": "ASSESSMENT REPORT · 모의면접",
  "title": "리포트 제목",
  "roleContext": "직무/맥락 또는 null",
  "overallScore": 1.0,
  "overallScaleMax": 5,
  "overallLevelLabel": "보통",
  "executiveSummary": "3-5문장 총평(근거→판단)",
  "competencies": [
    {
      "code": "COMMUNICATION",
      "nameKo": "의사소통",
      "definition": "역량 정의",
      "score": 3,
      "levelLabel": "보통",
      "subCompetencies": [
        {
          "code": "ACTIVE_LISTEN",
          "nameKo": "적극적 경청",
          "score": 3,
          "observedBehaviors": [
            {"polarity": "POSITIVE", "text": "관찰 요약", "quote": "실제 인용 또는 생략", "analysis": "왜 점수에 영향을 주는지"},
            {"polarity": "NEGATIVE_OR_MISSING", "text": "관찰되지 않은/부정 행동", "analysis": "설명"}
          ]
        }
      ],
      "rationale": "평정 근거",
      "developmentAdvice": "개발 제언(구체 스크립트 포함 가능)"
    }
  ],
  "strengths": ["강점 근거 문장"],
  "developmentTasks": [{"title": "개발과제", "body": "설명", "practiceSequence": "연습 순서 또는 null"}],
  "recommendedSequence": "권장 진행 순서 또는 null"
}`;

export async function generateEvidenceAssessmentReport(
  params: GenerateEvidenceReportParams,
): Promise<EvidenceAssessmentReport> {
  const competencyCodes = params.competencies.map((c) => c.competency);
  const context = await loadInterviewEvidenceContext(competencyCodes);

  const title =
    params.companyName && params.jobRole
      ? `${params.companyName} ${params.jobRole} 면접 역량 평가`
      : params.companyName
        ? `${params.companyName} 면접 역량 평가`
        : "면접 역량 평가";

  const userContent = JSON.stringify(
    {
      company: params.companyName ?? null,
      jobRole: params.jobRole ?? null,
      title,
      ratingScale: context.ratingScale,
      competencyFrameworks: context.frameworks,
      competencySummaries: params.competencies.map((c) => ({
        competency: c.competency,
        nameKo: competencyLabel(c.competency),
        levelEstimate: c.level_estimate,
        percentile: c.percentile,
        scoreHint1to5: percentileToFiveScale(c.percentile),
      })),
      responses: params.responses.slice(0, 14),
    },
    null,
    2,
  );

  try {
    const text = await generateGeminiText({
      systemInstruction: SYSTEM,
      userPrompt: userContent,
      temperature: 0.4,
      maxOutputTokens: 8192,
      timeoutMs: 60_000,
      task: "evidence_report",
      responseMimeType: "application/json",
    });

    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        raw.ratingScale = context.ratingScale;
        const parsed = parseEvidenceAssessmentReport(raw);
        if (parsed) {
          if (!parsed.title) parsed.title = title;
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error("[evidence report]", e);
  }

  return buildFallbackEvidenceReport(params, title, context.ratingScale);
}

/** LLM 실패 시 percentile→1–5 근사로 최소 리포트 구성(행동 인용 없음, 미관찰 명시) */
export function buildFallbackEvidenceReport(
  params: GenerateEvidenceReportParams,
  title: string,
  ratingScale: EvidenceAssessmentReport["ratingScale"],
): EvidenceAssessmentReport {
  const competencies: CompetencyAssessmentBlock[] = params.competencies.map(
    (c) => {
      const score = clampScore1to5(percentileToFiveScale(c.percentile));
      const nameKo = competencyLabel(c.competency);
      return {
        code: c.competency,
        nameKo,
        definition: "",
        score,
        levelLabel: scoreToLevelLabel(score),
        subCompetencies: [
          {
            code: `${c.competency}_OVERALL`,
            nameKo,
            score,
            observedBehaviors: [
              {
                polarity: "NEGATIVE_OR_MISSING",
                text: "자동 리포트 생성이 일시적으로 지연되어 세부 행동 근거를 수집하지 못했습니다.",
                quote: null,
                trigger: null,
                analysis: null,
                indicatorCode: null,
              },
            ],
          },
        ],
        rationale: `추정 백분위 ${Math.round(c.percentile)}% 기준으로 ${scoreToLevelLabel(score)} 수준으로 근사 평정했습니다. 세부 행동 근거는 재생성 시 채워집니다.`,
        developmentAdvice:
          "리포트를 다시 생성하면 관찰 행동 기반의 구체적 개발 제언이 제공됩니다.",
      };
    },
  );

  const overallScore = competencies.length
    ? clampScore1to5(
        competencies.reduce((s, c) => s + c.score, 0) / competencies.length,
      )
    : 3;

  return {
    schemaVersion: 1,
    domain: "INTERVIEW",
    reportKindLabel: "ASSESSMENT REPORT · 모의면접",
    title,
    roleContext: params.jobRole ?? null,
    overallScore,
    overallScaleMax: 5,
    overallLevelLabel: scoreToLevelLabel(overallScore),
    executiveSummary:
      "자동 리포트 생성이 일시적으로 지연되어 백분위 기반 근사 점수로 구성한 리포트입니다.",
    competencies,
    strengths: [],
    developmentTasks: [],
    ratingScale,
    recommendedSequence: null,
  };
}

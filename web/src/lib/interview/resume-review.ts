/**
 * 자소서 첨삭 — 키워드 매칭(코드) + 서술형 피드백(Gemini 1회, 사용자 요청 시만).
 */

import { generateGeminiText } from "@/lib/gemini/client";
import { getIndustryPreset } from "@/lib/company/industry-presets";
import { matchPersona } from "@/lib/interview/persona-archetype";
import {
  sanitizeResumeForLlm,
  type ResumeSummary,
} from "@/lib/interview/resume-summary";
import { competencyLabel } from "@/lib/labels";
import type { CompetencyCode, IndustryCode, JobRoleCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";

export type JdMatchResult = {
  matchScore: number | null;
  matched: string[];
  missing: string[];
};

export type ParagraphFeedbackItem = {
  quote: string;
  issue: string;
  suggestion: string;
};

export type ImprovementPlanItem = {
  gapLabel: string;
  suggestion: string;
};

export type ResumeReviewNarrative = {
  overallSummary: string;
  paragraphFeedback: ParagraphFeedbackItem[];
  improvementPlan: ImprovementPlanItem[];
  suggestedCompetencies: CompetencyCode[];
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokensMatch(a: string, b: string): boolean {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 2 && nb.length >= 2) {
    return na.includes(nb) || nb.includes(na);
  }
  return false;
}

/** 자소서 키워드 vs 공고/프리셋 요구 키워드 — LLM 없이 매칭률 계산 */
export function matchKeywords(
  resumeKeywords: string[],
  requiredKeywords: string[]
): JdMatchResult {
  const required = [...new Set(requiredKeywords.map((k) => k.trim()).filter(Boolean))];
  if (required.length === 0) {
    return { matchScore: null, matched: [], missing: [] };
  }

  const resumePool = [...new Set(resumeKeywords.map((k) => k.trim()).filter(Boolean))];
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of required) {
    const hit = resumePool.some((r) => tokensMatch(r, req));
    if (hit) matched.push(req);
    else missing.push(req);
  }

  const matchScore = Math.round((matched.length / required.length) * 100);
  return { matchScore, matched, missing };
}

export function presetRequiredKeywords(
  industry: IndustryCode,
  jobRole: JobRoleCode
): { skills: string[]; keywords: string[] } {
  const persona = matchPersona(industry, jobRole);
  const preset = getIndustryPreset(industry);
  const keywords = [
    ...persona.focusCompetencies.map((c) => competencyLabel(c)),
    ...preset.interviewStyle.focus,
    ...persona.traits.slice(0, 4),
  ];
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
  return { skills: [], keywords: unique };
}

function collectResumeKeywords(summary: ResumeSummary): string[] {
  return [...new Set([...summary.skills, ...summary.keywords, ...summary.experiences])];
}

const REVIEW_SYSTEM = `당신은 한국 채용 시장의 자기소개서 첨삭 코치입니다.
지원자 자소서 요약과 (있으면) 채용공고 요구사항·키워드 매칭 결과를 바탕으로 첨삭 리포트 JSON만 출력하세요.

원칙:
- 자소서 원문/요약에 없는 경험을 지어내거나 "이렇게 쓰세요"라고 허위 사실을 만들지 마세요.
- paragraphFeedback의 quote는 반드시 자소서 요약(experiences·summary)에 실제로 등장하는 문장/구절만 인용하세요.
- 경험이 부족하면 "이런 경험이 있다면 추가하세요" 또는 "면접에서 다른 사례로 보완하는 전략"을 제안하세요.
- 이메일·전화번호 등 개인정보는 언급하지 마세요.
- suggestedCompetencies는 NCS 6역량 코드만 사용: COMMUNICATION, PROBLEM_SOLVING, JOB_FIT, ORG_FIT, GROWTH, GLOBAL (최대 3개).

JSON 형식:
{
  "overallSummary": "6~8문장 총평. (1) 첫 문장: 지원자에게 직접 말하듯 한 줄 핵심 평가. (2) 2~3문장: 자소서에서 잘 드러난 강점·설득력 있는 경험. (3) 2~3문장: 공고/직무 대비 보완이 필요한 핵심 약점. (4) 마지막 1~2문장: 우선 수정할 액션과 면접 연결 전략. 단편적 나열이 아니라 하나의 흐름 있는 종합 평가로 작성.",
  "paragraphFeedback": [{ "quote": "...", "issue": "...", "suggestion": "..." }],
  "improvementPlan": [{ "gapLabel": "...", "suggestion": "..." }],
  "suggestedCompetencies": ["COMMUNICATION"]
}`;

function parseCompetencyCodes(raw: unknown): CompetencyCode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is CompetencyCode => typeof c === "string" && COMPETENCY_CODES.includes(c as CompetencyCode))
    .slice(0, 3);
}

export async function generateResumeReviewNarrative(params: {
  resumeSummary: ResumeSummary;
  resumeRawText: string;
  matchSource: "jd" | "industry_preset";
  jdMatch: JdMatchResult;
  requiredKeywords: string[];
  industryLabel?: string;
  jobRoleLabel?: string;
}): Promise<ResumeReviewNarrative> {
  const {
    resumeSummary,
    resumeRawText,
    matchSource,
    jdMatch,
    requiredKeywords,
    industryLabel,
    jobRoleLabel,
  } = params;

  const matchContext =
    matchSource === "jd"
      ? `채용공고(JD) 기준 키워드: ${requiredKeywords.join(", ") || "(없음)"}`
      : `산업군·직무 일반 기준: ${industryLabel ?? ""} · ${jobRoleLabel ?? ""} — 기대 역량: ${requiredKeywords.join(", ")}`;

  const userPrompt = `
${matchContext}
매칭률: ${jdMatch.matchScore ?? "N/A"}%
매칭됨: ${jdMatch.matched.join(", ") || "(없음)"}
부족: ${jdMatch.missing.join(", ") || "(없음)"}

자소서 요약:
- summary: ${resumeSummary.summary}
- skills: ${resumeSummary.skills.join(", ")}
- experiences: ${resumeSummary.experiences.join(" | ")}
- keywords: ${resumeSummary.keywords.join(", ")}

자소서 원문(인용 검증용, 일부):
${sanitizeResumeForLlm(resumeRawText).slice(0, 2500)}
`.trim();

  const fallback = buildFallbackNarrative(resumeSummary, jdMatch);

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  const content = await generateGeminiText({
    systemInstruction: REVIEW_SYSTEM,
    userPrompt,
    temperature: 0.35,
    maxOutputTokens: 2400,
    timeoutMs: 20000,
  });

  if (!content) return fallback;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallback;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      overallSummary?: unknown;
      paragraphFeedback?: unknown;
      improvementPlan?: unknown;
      suggestedCompetencies?: unknown;
    };

    const overallSummary =
      typeof parsed.overallSummary === "string" && parsed.overallSummary.trim()
        ? parsed.overallSummary.trim()
        : fallback.overallSummary;

    const paragraphFeedback = Array.isArray(parsed.paragraphFeedback)
      ? parsed.paragraphFeedback
          .filter((p): p is ParagraphFeedbackItem => {
            if (!p || typeof p !== "object") return false;
            const row = p as Record<string, unknown>;
            return (
              typeof row.quote === "string" &&
              typeof row.issue === "string" &&
              typeof row.suggestion === "string"
            );
          })
          .slice(0, 6)
      : fallback.paragraphFeedback;

    const improvementPlan = Array.isArray(parsed.improvementPlan)
      ? parsed.improvementPlan
          .filter((p): p is ImprovementPlanItem => {
            if (!p || typeof p !== "object") return false;
            const row = p as Record<string, unknown>;
            return typeof row.gapLabel === "string" && typeof row.suggestion === "string";
          })
          .slice(0, 6)
      : fallback.improvementPlan;

    const suggestedCompetencies = parseCompetencyCodes(parsed.suggestedCompetencies);
    if (suggestedCompetencies.length === 0) {
      return { ...fallback, overallSummary, paragraphFeedback, improvementPlan };
    }

    return {
      overallSummary,
      paragraphFeedback: paragraphFeedback.length > 0 ? paragraphFeedback : fallback.paragraphFeedback,
      improvementPlan: improvementPlan.length > 0 ? improvementPlan : fallback.improvementPlan,
      suggestedCompetencies,
    };
  } catch (e) {
    console.error("[resume-review] JSON parse 실패:", e);
    return fallback;
  }
}

function buildFallbackNarrative(
  summary: ResumeSummary,
  jdMatch: JdMatchResult
): ResumeReviewNarrative {
  const paragraphFeedback: ParagraphFeedbackItem[] = summary.experiences.slice(0, 3).map((exp) => ({
    quote: exp.slice(0, 120),
    issue: "성과·역할·수치가 더 구체적이면 설득력이 높아집니다.",
    suggestion:
      "무엇을 목표로 했고, 본인이 한 일과 결과(수치)를 한 문장씩 추가해 보세요.",
  }));

  const improvementPlan: ImprovementPlanItem[] = jdMatch.missing.slice(0, 4).map((gap) => ({
    gapLabel: gap,
    suggestion:
      "자소서에 해당 키워드와 연결되는 경험이 있다면 한 문단으로 보강하세요. 없다면 면접에서 유사 역량을 보여줄 다른 사례를 준비하세요.",
  }));

  return {
    overallSummary:
      summary.summary ||
      "자소서에서 핵심 경험을 더 구체적인 상황·행동·결과로 풀어 쓰면 면접에서도 일관된 스토리를 전달할 수 있습니다.",
    paragraphFeedback:
      paragraphFeedback.length > 0
        ? paragraphFeedback
        : [
            {
              quote: summary.summary.slice(0, 80) || "(요약 없음)",
              issue: "경험 서술이 추상적일 수 있습니다.",
              suggestion: "프로젝트·역할·성과를 구체적으로 보완해 보세요.",
            },
          ],
    improvementPlan:
      improvementPlan.length > 0
        ? improvementPlan
        : [{ gapLabel: "구체성", suggestion: "STAR 형식으로 사례를 정리해 보세요." }],
    suggestedCompetencies: ["COMMUNICATION"],
  };
}

export function buildResumeKeywordPool(summary: ResumeSummary): string[] {
  return collectResumeKeywords(summary);
}

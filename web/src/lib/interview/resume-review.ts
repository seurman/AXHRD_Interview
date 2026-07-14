/**
 * 자소서 첨삭 — 관리 기준(FORMAT_LOGIC / INDUSTRY_FIT / STAR_BEI) 대비 강점·부족·수정안.
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
import {
  loadActiveReviewCriteria,
  REVIEW_CATEGORY_LABELS,
  type LoadedCriterion,
  type ReviewCategory,
} from "@/lib/interview/resume-review-criteria";

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

export type CriterionStatus = "pass" | "partial" | "fail";

export type CriterionResult = {
  code: string;
  category: ReviewCategory;
  title: string;
  status: CriterionStatus;
  /** 기준 대비 잘된 점 */
  strengthNote: string;
  /** 기준 대비 부족한 점 */
  gapNote: string;
};

export type DimensionScore = {
  category: ReviewCategory;
  label: string;
  score: number;
  band: "strong" | "adequate" | "weak";
  strengths: string[];
  gaps: string[];
};

export type ResumeReviewNarrative = {
  overallSummary: string;
  paragraphFeedback: ParagraphFeedbackItem[];
  improvementPlan: ImprovementPlanItem[];
  suggestedCompetencies: CompetencyCode[];
  dimensionScores: DimensionScore[];
  criteriaResults: CriterionResult[];
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

type HeuristicSignals = {
  hasMetrics: boolean;
  metricHits: string[];
  hasVagueEffort: boolean;
  hasSituationCues: boolean;
  hasTaskCues: boolean;
  hasActionCues: boolean;
  hasResultCues: boolean;
  hasFirstPersonAction: boolean;
  textLength: number;
};

function collectHeuristicSignals(rawText: string, summary: ResumeSummary): HeuristicSignals {
  const text = `${rawText}\n${summary.summary}\n${summary.experiences.join("\n")}`;
  const metricRe =
    /\d+\s*(%|퍼센트|명|건|개|회|배|원|만원|억|개월|주|일|시간|위|등|점)|증가|감소|향상|단축|절감|달성/gi;
  const metricHits = [...text.matchAll(metricRe)].map((m) => m[0]).slice(0, 8);
  const vagueRe = /열심히|최선을\s*다|다양한\s*경험|많은\s*노력|열정적으로|성실히/gi;
  const situationRe = /당시|상황|배경|프로젝트|과제|인턴|팀\s*프로젝트|문제\s*상황/gi;
  const taskRe = /역할|담당|맡|과제|목표|해결해야|책임/gi;
  const actionRe =
    /분석했|제안했|설계했|개선했|주도했|실행했|협업했|도입했|구현했|정리했|설득했|기획했/gi;
  const resultRe = /결과|성과|효과|덕분에|개선되어|단축|증가|감소|달성|배웠/gi;
  const firstPersonAction =
    /(저는|제가|본인은).{0,40}(분석|제안|설계|개선|주도|실행|도입|구현|협업|설득|기획)/gi.test(
      text
    );

  return {
    hasMetrics: metricHits.length > 0,
    metricHits,
    hasVagueEffort: vagueRe.test(text),
    hasSituationCues: situationRe.test(text),
    hasTaskCues: taskRe.test(text),
    hasActionCues: actionRe.test(text),
    hasResultCues: resultRe.test(text),
    hasFirstPersonAction: firstPersonAction,
    textLength: text.length,
  };
}

function statusScore(status: CriterionStatus): number {
  if (status === "pass") return 100;
  if (status === "partial") return 55;
  return 20;
}

function bandFromScore(score: number): DimensionScore["band"] {
  if (score >= 75) return "strong";
  if (score >= 50) return "adequate";
  return "weak";
}

function buildDimensionScores(results: CriterionResult[]): DimensionScore[] {
  const categories: ReviewCategory[] = ["FORMAT_LOGIC", "INDUSTRY_FIT", "STAR_BEI"];
  return categories.map((category) => {
    const rows = results.filter((r) => r.category === category);
    const score =
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((sum, r) => sum + statusScore(r.status), 0) / rows.length);
    return {
      category,
      label: REVIEW_CATEGORY_LABELS[category],
      score,
      band: bandFromScore(score),
      strengths: rows
        .filter((r) => r.status === "pass" && r.strengthNote.trim())
        .map((r) => `${r.title}: ${r.strengthNote}`)
        .slice(0, 4),
      gaps: rows
        .filter((r) => r.status !== "pass" && r.gapNote.trim())
        .map((r) => `${r.title}: ${r.gapNote}`)
        .slice(0, 5),
    };
  });
}

function heuristicCriterionStatus(
  code: string,
  signals: HeuristicSignals,
  jdMatch: JdMatchResult
): { status: CriterionStatus; strengthNote: string; gapNote: string } {
  switch (code) {
    case "QUANTIFIED_OUTCOME":
    case "STAR_RESULT":
      return signals.hasMetrics
        ? {
            status: "pass",
            strengthNote: `수치·성과 표현이 보입니다(${signals.metricHits.slice(0, 3).join(", ")}).`,
            gapNote: "",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: "정량 수치(%, 건수, 기간, 규모 등)가 거의 없습니다. 결과에 숫자를 추가하세요.",
          };
    case "NO_VAGUE_EFFORT":
      return signals.hasVagueEffort
        ? {
            status: "partial",
            strengthNote: "",
            gapNote:
              "‘열심히/최선을’ 등 추상 표현이 보입니다. 판단·방법·실행으로 바꿔 쓰세요.",
          }
        : {
            status: "pass",
            strengthNote: "추상적인 노력어 비중은 낮은 편입니다.",
            gapNote: "",
          };
    case "OWN_ROLE_CLEAR":
      return signals.hasFirstPersonAction || signals.hasActionCues
        ? {
            status: signals.hasFirstPersonAction ? "pass" : "partial",
            strengthNote: "본인이 한 행동·기여가 일부 드러납니다.",
            gapNote: signals.hasFirstPersonAction
              ? ""
              : "‘내가 무엇을 결정·실행했는지’를 더 분명히 쓰세요.",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: "팀 성과만 있고 본인 역할·행동이 약합니다.",
          };
    case "STAR_SITUATION":
      return signals.hasSituationCues
        ? {
            status: "pass",
            strengthNote: "상황·배경 단서가 있습니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote: "경험의 배경·제약을 2–3줄로 제시해 주세요.",
          };
    case "STAR_TASK":
      return signals.hasTaskCues
        ? {
            status: "pass",
            strengthNote: "과제·역할 단서가 있습니다.",
            gapNote: "",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: "그 상황에서 본인이 맡은 과제·목표가 불명확합니다.",
          };
    case "STAR_ACTION":
      return signals.hasActionCues
        ? {
            status: "pass",
            strengthNote: "구체 행동 동사가 보입니다.",
            gapNote: "",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: "Action(방법·판단·실행)이 빈약합니다. 분량의 40–50%를 Action에 할애하세요.",
          };
    case "JD_KEYWORD_EVIDENCE": {
      if (jdMatch.matchScore == null) {
        return {
          status: "partial",
          strengthNote: "",
          gapNote: "공고 키워드가 없어 산업·직무 일반 기준으로만 볼 수 있습니다.",
        };
      }
      if (jdMatch.matchScore >= 70) {
        return {
          status: "pass",
          strengthNote: `요구 키워드의 ${jdMatch.matchScore}%가 자소서에 반영되어 있습니다.`,
          gapNote: jdMatch.missing.length
            ? `부족 키워드: ${jdMatch.missing.slice(0, 5).join(", ")}`
            : "",
        };
      }
      if (jdMatch.matchScore >= 40) {
        return {
          status: "partial",
          strengthNote: `일부 키워드만 매칭(${jdMatch.matchScore}%).`,
          gapNote: `보완 키워드: ${jdMatch.missing.slice(0, 6).join(", ")}`,
        };
      }
      return {
        status: "fail",
        strengthNote: "",
        gapNote: `요구 키워드 매칭이 낮습니다(${jdMatch.matchScore}%). 경험과 연결해 보강하세요.`,
      };
    }
    case "BEI_BEHAVIORAL_INDICATORS":
      return signals.hasActionCues && (signals.hasMetrics || signals.hasResultCues)
        ? {
            status: "pass",
            strengthNote: "관찰 가능한 행동·결과 단서가 있습니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote: "역량 형용사보다 ‘무엇을 했고 어떤 결과가 났는지’ 행동을 쓰세요.",
          };
    default:
      return {
        status: "partial",
        strengthNote: "",
        gapNote: "원문 기준으로 추가 보완이 필요할 수 있습니다.",
      };
  }
}

function buildHeuristicResults(
  criteria: LoadedCriterion[],
  signals: HeuristicSignals,
  jdMatch: JdMatchResult
): CriterionResult[] {
  return criteria.map((c) => {
    const h = heuristicCriterionStatus(c.code, signals, jdMatch);
    return {
      code: c.code,
      category: c.category,
      title: c.title,
      status: h.status,
      strengthNote: h.strengthNote,
      gapNote: h.gapNote,
    };
  });
}

function improvementFromResults(results: CriterionResult[]): ImprovementPlanItem[] {
  return results
    .filter((r) => r.status !== "pass" && r.gapNote.trim())
    .sort((a, b) => statusScore(a.status) - statusScore(b.status))
    .slice(0, 8)
    .map((r) => ({
      gapLabel: `[${REVIEW_CATEGORY_LABELS[r.category]}] ${r.title}`,
      suggestion: r.gapNote,
    }));
}

function paragraphFromWeakResults(
  summary: ResumeSummary,
  results: CriterionResult[]
): ParagraphFeedbackItem[] {
  const weak = results.filter((r) => r.status !== "pass").slice(0, 5);
  const quotes = summary.experiences.length
    ? summary.experiences
    : [summary.summary || "핵심 경험 서술"];

  return weak.map((r, i) => ({
    quote: (quotes[i % quotes.length] ?? "").slice(0, 140) || "(인용 가능한 경험 문장 없음)",
    issue: `${r.title} 기준에서 ${r.status === "fail" ? "부족" : "부분 충족"}합니다. ${r.gapNote}`,
    suggestion:
      r.status === "fail"
        ? `「${r.title}」을 충족하도록 구체 행동·수치·직무 연결을 한 문장씩 보강하세요.`
        : `「${r.title}」을 더 분명하게 — ${r.gapNote || "근거를 한 문장 더 추가하세요."}`,
  }));
}

function overallFromDimensions(dimensions: DimensionScore[], jdMatch: JdMatchResult): string {
  const lines: string[] = [];
  const weak = dimensions.filter((d) => d.band === "weak");
  const strong = dimensions.filter((d) => d.band === "strong");

  if (strong.length) {
    lines.push(
      `잘 갖춘 축: ${strong.map((d) => `${d.label}(${d.score})`).join(", ")}. 해당 축의 강점을 문단 앞으로 끌어올리세요.`
    );
  } else {
    lines.push(
      "형식·논리 / 산업 역량 / STAR·BEI 세 축 모두에서 기준을 충분히 충족하지 못했습니다. 요약이 아니라 기준 대비 보완이 필요합니다."
    );
  }

  for (const d of dimensions) {
    const gapBit = d.gaps[0] ? ` 우선 보완: ${d.gaps[0]}` : "";
    const strengthBit = d.strengths[0] ? ` 강점: ${d.strengths[0]}` : "";
    lines.push(`· ${d.label} ${d.score}점(${d.band === "strong" ? "양호" : d.band === "adequate" ? "보통" : "약함"}).${strengthBit}${gapBit}`);
  }

  if (jdMatch.matchScore != null) {
    lines.push(
      `키워드 매칭 ${jdMatch.matchScore}% — 키워드 나열이 아니라 경험 근거와 연결해 보강하세요.`
    );
  }

  if (weak.length) {
    lines.push(
      `가장 먼저 손볼 축: ${weak.map((d) => d.label).join(", ")}. 아래 ‘우선 보완 액션’ 순서를 따라 문단을 고쳐 쓴 뒤 다시 첨삭하세요.`
    );
  }

  return lines.join("\n");
}

const REVIEW_SYSTEM = `당신은 한국 채용시장의 자기소개서 첨삭관입니다.
역할은 자소서를 '요약'하는 것이 아니라, 제공된 평가 기준(criterion) 각각에 대해
(1) 잘 갖춘 점(strengthNote) (2) 부족한 점(gapNote) (3) pass|partial|fail 을 판정하는 것입니다.

절대 규칙:
- 원문/요약에 없는 경험을 지어내지 마세요.
- paragraphFeedback.quote는 원문(또는 experiences)에 실제 있는 구절만 쓰세요.
- overallSummary는 자소서 줄거리가 아니라, 세 축(형식·논리 / 산업·직무 역량 / STAR·BEI) 대비 강점·약점·수정 우선순위를 말하세요.
- improvementPlan은 fail/partial 기준에서만 만들고, 구체적인 수정 지시로 쓰세요.
- suggestedCompetencies는 NCS 코드만: COMMUNICATION, PROBLEM_SOLVING, JOB_FIT, ORG_FIT, LEADERSHIP, GROWTH (최대 3).

JSON만 출력:
{
  "overallSummary": "4~7문장. 요약 금지. 축별 강점/약점/수정 우선순위.",
  "criteriaResults": [
    { "code": "STAR_ACTION", "status": "partial", "strengthNote": "...", "gapNote": "..." }
  ],
  "paragraphFeedback": [{ "quote": "...", "issue": "어떤 기준이 왜 부족한지", "suggestion": "어떻게 고쳐 쓸지" }],
  "improvementPlan": [{ "gapLabel": "[축] 기준명", "suggestion": "구체 수정 지시" }],
  "suggestedCompetencies": ["PROBLEM_SOLVING"]
}`;

function parseCompetencyCodes(raw: unknown): CompetencyCode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is CompetencyCode => typeof c === "string" && COMPETENCY_CODES.includes(c as CompetencyCode))
    .slice(0, 3);
}

function mergeCriteriaResults(
  criteria: LoadedCriterion[],
  llmRaw: unknown,
  heuristic: CriterionResult[]
): CriterionResult[] {
  const byCode = new Map(heuristic.map((h) => [h.code, h]));
  if (Array.isArray(llmRaw)) {
    for (const row of llmRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const code = typeof r.code === "string" ? r.code : "";
      if (!code || !byCode.has(code)) continue;
      const status =
        r.status === "pass" || r.status === "partial" || r.status === "fail"
          ? r.status
          : byCode.get(code)!.status;
      const strengthNote =
        typeof r.strengthNote === "string" && r.strengthNote.trim()
          ? r.strengthNote.trim()
          : byCode.get(code)!.strengthNote;
      const gapNote =
        typeof r.gapNote === "string" && r.gapNote.trim()
          ? r.gapNote.trim()
          : byCode.get(code)!.gapNote;
      const base = byCode.get(code)!;
      byCode.set(code, { ...base, status, strengthNote, gapNote });
    }
  }
  return criteria.map((c) => byCode.get(c.code)!);
}

export async function generateResumeReviewNarrative(params: {
  resumeSummary: ResumeSummary;
  resumeRawText: string;
  matchSource: "jd" | "industry_preset";
  jdMatch: JdMatchResult;
  requiredKeywords: string[];
  industryLabel?: string;
  jobRoleLabel?: string;
  evidenceContext?: string;
  performanceContext?: string;
  suggestedFromEvidence?: CompetencyCode[];
}): Promise<ResumeReviewNarrative> {
  const {
    resumeSummary,
    resumeRawText,
    matchSource,
    jdMatch,
    requiredKeywords,
    industryLabel,
    jobRoleLabel,
    evidenceContext,
    performanceContext,
  } = params;

  const criteria = await loadActiveReviewCriteria();
  const signals = collectHeuristicSignals(resumeRawText, resumeSummary);
  const heuristicResults = buildHeuristicResults(criteria, signals, jdMatch);
  const heuristicDimensions = buildDimensionScores(heuristicResults);

  const fallback: ResumeReviewNarrative = {
    overallSummary: overallFromDimensions(heuristicDimensions, jdMatch),
    paragraphFeedback: paragraphFromWeakResults(resumeSummary, heuristicResults),
    improvementPlan: improvementFromResults(heuristicResults),
    suggestedCompetencies:
      params.suggestedFromEvidence?.length
        ? params.suggestedFromEvidence.slice(0, 3)
        : ["COMMUNICATION"],
    dimensionScores: heuristicDimensions,
    criteriaResults: heuristicResults,
  };

  const matchContext =
    matchSource === "jd"
      ? `채용공고(JD) 기준 키워드: ${requiredKeywords.join(", ") || "(없음)"}`
      : `산업군·직무 일반 기준: ${industryLabel ?? ""} · ${jobRoleLabel ?? ""} — 기대 역량: ${requiredKeywords.join(", ")}`;

  const criteriaBlock = criteria
    .map(
      (c) =>
        `- [${c.category}] code=${c.code} | ${c.title}\n  정의: ${c.description}\n  확인: ${c.howToCheck}`
    )
    .join("\n");

  const userPrompt = `
${matchContext}
키워드 매칭률: ${jdMatch.matchScore ?? "N/A"}%
매칭됨: ${jdMatch.matched.join(", ") || "(없음)"}
부족: ${jdMatch.missing.join(", ") || "(없음)"}

휴리스틱 단서:
- 수치: ${signals.hasMetrics ? signals.metricHits.join(", ") : "없음"}
- 추상 노력어: ${signals.hasVagueEffort ? "있음" : "없음"}
- S/T/A/R 단서: S=${signals.hasSituationCues} T=${signals.hasTaskCues} A=${signals.hasActionCues} R=${signals.hasResultCues}
- 1인칭 행동: ${signals.hasFirstPersonAction}

평가 기준 (반드시 criteriaResults에 아래 code를 모두 포함):
${criteriaBlock}

자소서 요약:
- summary: ${resumeSummary.summary}
- skills: ${resumeSummary.skills.join(", ")}
- experiences: ${resumeSummary.experiences.join(" | ")}
- keywords: ${resumeSummary.keywords.join(", ")}
${evidenceContext ? `\n온톨로지 claim↔역량:\n${evidenceContext}` : ""}
${performanceContext ? `\n면접 답변 수준(역량별):\n${performanceContext}` : ""}

자소서 원문(인용·판정용):
${sanitizeResumeForLlm(resumeRawText).slice(0, 4500)}
`.trim();

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  const content = await generateGeminiText({
    systemInstruction: REVIEW_SYSTEM,
    userPrompt,
    temperature: 0.25,
    maxOutputTokens: 3600,
    timeoutMs: 28000,
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
      criteriaResults?: unknown;
    };

    const criteriaResults = mergeCriteriaResults(
      criteria,
      parsed.criteriaResults,
      heuristicResults
    );
    const dimensionScores = buildDimensionScores(criteriaResults);

    const overallSummary =
      typeof parsed.overallSummary === "string" && parsed.overallSummary.trim()
        ? parsed.overallSummary.trim()
        : overallFromDimensions(dimensionScores, jdMatch);

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
          .slice(0, 8)
      : [];

    const improvementPlan = Array.isArray(parsed.improvementPlan)
      ? parsed.improvementPlan
          .filter((p): p is ImprovementPlanItem => {
            if (!p || typeof p !== "object") return false;
            const row = p as Record<string, unknown>;
            return typeof row.gapLabel === "string" && typeof row.suggestion === "string";
          })
          .slice(0, 8)
      : [];

    const suggestedCompetencies = parseCompetencyCodes(parsed.suggestedCompetencies);

    return {
      overallSummary,
      paragraphFeedback:
        paragraphFeedback.length > 0
          ? paragraphFeedback
          : paragraphFromWeakResults(resumeSummary, criteriaResults),
      improvementPlan:
        improvementPlan.length > 0
          ? improvementPlan
          : improvementFromResults(criteriaResults),
      suggestedCompetencies:
        suggestedCompetencies.length > 0
          ? suggestedCompetencies
          : fallback.suggestedCompetencies,
      dimensionScores,
      criteriaResults,
    };
  } catch (e) {
    console.error("[resume-review] JSON parse 실패:", e);
    return fallback;
  }
}

export function buildResumeKeywordPool(summary: ResumeSummary): string[] {
  return collectResumeKeywords(summary);
}

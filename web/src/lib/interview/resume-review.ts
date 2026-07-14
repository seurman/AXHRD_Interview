/**
 * 자소서 첨삭 — 관리 기준 대비 강점·부족·수정안.
 * 원칙: 요약/점수 나열이 아니라, 원문 근거가 있는 자연스러운 한글 첨삭.
 */

import { generateGeminiQualityText } from "@/lib/gemini/client";
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
  strengthNote: string;
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
  /** llm = 상위 모델 서술, heuristic = 규칙 폴백(문장이 비슷하게 반복될 수 있음) */
  narrativeSource: "llm" | "heuristic";
  narrativeModel: string | null;
};

const GENERIC_GAP =
  /원문\s*기준(?:으로)?\s*추가\s*보완|추가\s*보완이\s*필요할\s*수\s*있습니다/;

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

/** 원문을 문단·문장 단위로 쪼개 인용 후보를 만든다. */
export function extractQuoteCandidates(
  rawText: string,
  summary: ResumeSummary
): string[] {
  const cleaned = sanitizeResumeForLlm(rawText).replace(/\r\n/g, "\n");
  const fromRaw = cleaned
    .split(/\n{2,}|\n(?=[•·\-–—▪►▶■□★◆◇※]|\d+[.)]\s|[가-힣]{2,10}\s*[:：])/u)
    .flatMap((block) => block.split(/(?<=[.!?。]|다\.|요\.)\s+/u))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 28 && s.length <= 280);

  const fromChunks = (summary.chunks ?? [])
    .flatMap((c) =>
      c.markdown
        .split(/\n+/)
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter((s) => s.length >= 28)
    );

  const fromExp = summary.experiences
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 20);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of [...fromRaw, ...fromChunks, ...fromExp]) {
    const key = normalizeToken(q).slice(0, 48);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q.slice(0, 220));
    if (out.length >= 24) break;
  }
  return out;
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
  hasTopicFirst: boolean;
  hasJobLink: boolean;
  hasMotivationLink: boolean;
  textLength: number;
  openingSnippet: string;
};

function collectHeuristicSignals(rawText: string, summary: ResumeSummary): HeuristicSignals {
  const text = `${rawText}\n${summary.summary}\n${summary.experiences.join("\n")}`;
  const opening = sanitizeResumeForLlm(rawText).replace(/\s+/g, " ").trim().slice(0, 180);
  const metricRe =
    /\d+\s*(%|퍼센트|명|건|개|회|배|원|만원|억|개월|주|일|시간|위|등|점)|증가|감소|향상|단축|절감|달성/gi;
  const metricHits = [...text.matchAll(metricRe)].map((m) => m[0]).slice(0, 8);
  const vagueRe = /열심히|최선을\s*다|다양한\s*경험|많은\s*노력|열정적으로|성실히/gi;
  const situationRe = /당시|상황|배경|프로젝트|과제|인턴|팀\s*프로젝트|문제\s*상황|장애|병목/gi;
  const taskRe = /역할|담당|맡|과제|목표|해결해야|책임|맡았/gi;
  const actionRe =
    /분석했|제안했|설계했|개선했|주도했|실행했|협업했|도입했|구현했|정리했|설득했|기획했|측정했|재구성했/gi;
  const resultRe = /결과|성과|효과|덕분에|개선되어|단축|증가|감소|달성|배웠/gi;
  const firstPersonAction =
    /(저는|제가|본인은).{0,40}(분석|제안|설계|개선|주도|실행|도입|구현|협업|설득|기획|측정)/gi.test(
      text
    );
  const jobLinkRe =
    /지원\s*직무|해당\s*직무|이\s*경험(?:을|이)|입사\s*후|기여하|역량으로|연결|활용/gi;
  const motivationRe =
    /지원\s*동기|왜\s*.{0,8}(회사|기업|직무)|비전|서비스|제품|사업|가치관/gi;

  // 두괄식: 앞부분이 배경 나열만인지, 성과/행동이 먼저인지
  const openingHasClaim =
    /(?:했습니다|했습니다\.|단축|개선|측정|도입|주도|달성|확인)/.test(opening) &&
    !/안녕하세요|귀사|성장과정|어릴\s*적|태어나/.test(opening);

  return {
    hasMetrics: metricHits.length > 0,
    metricHits,
    hasVagueEffort: vagueRe.test(text),
    hasSituationCues: situationRe.test(text),
    hasTaskCues: taskRe.test(text),
    hasActionCues: actionRe.test(text),
    hasResultCues: resultRe.test(text),
    hasFirstPersonAction: firstPersonAction,
    hasTopicFirst: openingHasClaim,
    hasJobLink: jobLinkRe.test(text),
    hasMotivationLink: motivationRe.test(text),
    textLength: text.length,
    openingSnippet: opening,
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

function cleanNote(note: string): string {
  return note
    .replace(/\s*\(\d+%\)/g, "")
    .replace(/\b\d{1,3}%\b/g, "")
    .replace(/\d+점/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
        .filter((r) => r.status === "pass" && r.strengthNote.trim() && !GENERIC_GAP.test(r.strengthNote))
        .map((r) => cleanNote(r.strengthNote))
        .filter(Boolean)
        .slice(0, 4),
      gaps: rows
        .filter((r) => r.status !== "pass" && r.gapNote.trim() && !GENERIC_GAP.test(r.gapNote))
        .map((r) => cleanNote(`${r.title} — ${r.gapNote}`))
        .filter(Boolean)
        .slice(0, 5),
    };
  });
}

function findQuote(
  candidates: string[],
  patterns: RegExp[],
  used: Set<string>
): string | null {
  for (const p of patterns) {
    const hit = candidates.find((q) => p.test(q) && !used.has(normalizeToken(q).slice(0, 40)));
    if (hit) return hit;
  }
  return candidates.find((q) => !used.has(normalizeToken(q).slice(0, 40))) ?? null;
}

function markUsed(used: Set<string>, quote: string) {
  used.add(normalizeToken(quote).slice(0, 40));
}

type HeuristicCtx = {
  signals: HeuristicSignals;
  jdMatch: JdMatchResult;
  matchSource: "jd" | "industry_preset";
  industryLabel?: string;
  jobRoleLabel?: string;
  requiredKeywords: string[];
  quotes: string[];
};

function heuristicCriterionStatus(
  code: string,
  ctx: HeuristicCtx
): { status: CriterionStatus; strengthNote: string; gapNote: string } {
  const { signals, jdMatch, matchSource, industryLabel, jobRoleLabel, requiredKeywords } = ctx;
  const roleHint = [industryLabel, jobRoleLabel].filter(Boolean).join(" · ") || "지원 직무";
  const missingWords = jdMatch.missing.slice(0, 4);

  switch (code) {
    case "TOPIC_FIRST":
      return signals.hasTopicFirst
        ? {
            status: "pass",
            strengthNote: "앞부분에서 문제 해결·행동이나 성과가 먼저 읽힙니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote:
              "문단 초반이 배경 설명에 머물러 보입니다. 첫 문장에 ‘무엇을 했고 무엇이 달라졌는지’를 두고, 배경은 뒤로 빼면 두괄식이 살아납니다.",
          };
    case "LOGICAL_ARC":
      return signals.hasJobLink
        ? {
            status: signals.hasResultCues ? "pass" : "partial",
            strengthNote: "경험과 기여를 직무로 잇는 연결 문장이 일부 있습니다.",
            gapNote: signals.hasResultCues
              ? ""
              : "성과 다음에 ‘이 경험이 지원 직무에서 어떻게 쓰이는지’ 한 문장을 덧붙이세요.",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: `경험→결과 다음에 ${roleHint}와의 연결이 약합니다. ‘그래서 이 직무에서 ○○를 할 수 있다’는 문장을 넣어 주세요.`,
          };
    case "QUANTIFIED_OUTCOME":
    case "STAR_RESULT":
      return signals.hasMetrics
        ? {
            status: "pass",
            strengthNote: "성과를 숫자로 보여 주는 문장이 있어 설득력이 있습니다.",
            gapNote: "",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote:
              "결과 문단에 기간·규모·개선 폭 같은 객관 지표가 거의 없습니다. ‘얼마나, 어떻게 달라졌는지’를 숫자로 한 줄 보강하세요.",
          };
    case "OWN_ROLE_CLEAR":
      return signals.hasFirstPersonAction || signals.hasActionCues
        ? {
            status: signals.hasFirstPersonAction ? "pass" : "partial",
            strengthNote: "본인이 한 행동이 드러나는 서술이 있습니다.",
            gapNote: signals.hasFirstPersonAction
              ? ""
              : "‘팀이 했다’보다 ‘내가 측정·판단·실행한 부분’을 주어로 더 분명히 쓰세요.",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: "역할이 모호합니다. 본인이 결정하거나 실행한 단계를 동사 중심으로 적어 주세요.",
          };
    case "NO_VAGUE_EFFORT":
      return signals.hasVagueEffort
        ? {
            status: "partial",
            strengthNote: "",
            gapNote:
              "‘열심히’·‘최선을’ 같은 표현이 보입니다. 관찰 가능한 방법·판단으로 바꿔 주세요.",
          }
        : {
            status: "pass",
            strengthNote: "추상적인 노력어보다 구체 행동을 쓰는 편입니다.",
            gapNote: "",
          };
    case "JD_KEYWORD_EVIDENCE": {
      if (matchSource === "industry_preset") {
        if (jdMatch.matched.length >= 2) {
          return {
            status: "pass",
            strengthNote: `${roleHint}에서 자주 쓰는 표현이 경험과 맞물려 읽힙니다.`,
            gapNote: "",
          };
        }
        return {
          status: "partial",
          strengthNote: "",
          gapNote: missingWords.length
            ? `기술·성과는 있는데, ${roleHint}에서 기대하는 표현(${missingWords.join(", ")})이 경험과 직접 연결되지 않습니다. 같은 사례를 그 언어로 한 줄 번역해 보세요.`
            : `${roleHint} 언어로 본인 경험을 ‘무엇을 잘하는 사람인지’ 한 문장으로 번역해 주세요.`,
        };
      }
      if (jdMatch.matchScore == null) {
        return {
          status: "partial",
          strengthNote: "",
          gapNote: "공고 키워드가 없어 산업·직무 일반 기준으로만 봤습니다. 공고를 붙이면 더 정확한 맞춤 첨삭이 됩니다.",
        };
      }
      if (jdMatch.matched.length >= Math.max(2, Math.ceil(requiredKeywords.length * 0.5))) {
        return {
          status: "pass",
          strengthNote: "공고에서 요구하는 표현이 경험 서술과 맞물립니다.",
          gapNote: missingWords.length
            ? `아직 덜 드러난 요구는 ${missingWords.join(", ")} 쪽입니다. 관련 경험이 있으면 같은 맥락에 녹여 주세요.`
            : "",
        };
      }
      return {
        status: "fail",
        strengthNote: "",
        gapNote: missingWords.length
          ? `공고가 강조하는 ${missingWords.join(", ")} 등이 자소서에 거의 안 보입니다. 키워드만 넣지 말고, 관련 경험 한 문단에 근거로 담아 주세요.`
          : "공고 요구사항과 경험의 연결이 약합니다. 관련 사례를 한 문단으로 보강하세요.",
      };
    }
    case "JOB_RELEVANT_EXPERIENCE":
      return signals.hasActionCues && (signals.hasMetrics || signals.hasResultCues)
        ? {
            status: signals.hasJobLink ? "pass" : "partial",
            strengthNote: "현장성 있는 문제 해결 경험이 있습니다.",
            gapNote: signals.hasJobLink
              ? ""
              : `그 경험이 ${roleHint}에서 왜 쓸모 있는지 연결 문장이 필요합니다.`,
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote: `${roleHint}와 가까운 경험을 앞에 두고, 무관한 스펙 나열은 줄이세요.`,
          };
    case "MOTIVATION_TRIPLE_LINK":
      return signals.hasMotivationLink && signals.hasJobLink
        ? {
            status: "pass",
            strengthNote: "회사·직무·본인 경험을 잇는 동기 단서가 있습니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote:
              "지원동기라면 ‘왜 이 회사 / 왜 이 직무 / 왜 나’가 한 줄기에 있어야 합니다. 회사 칭찬만 길면 설득이 약해집니다.",
          };
    case "INDUSTRY_COMPETENCY_SIGNAL":
      return signals.hasActionCues && signals.hasResultCues
        ? {
            status: "pass",
            strengthNote: "역량을 형용사가 아니라 행동·결과로 보여 주고 있습니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote: `${roleHint}에서 중시하는 역량을 ‘성실함’이 아니라 구체 행동으로 보여 주세요.`,
          };
    case "STAR_SITUATION":
      return signals.hasSituationCues
        ? {
            status: "pass",
            strengthNote: "문제·제약 같은 상황 배경이 잡힙니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote: "상황(배경·제약)을 2~3줄로만 짧게 두고, 바로 과제·행동으로 넘어가세요.",
          };
    case "STAR_TASK":
      return signals.hasTaskCues
        ? {
            status: "pass",
            strengthNote: "맡았던 과제·목표가 드러납니다.",
            gapNote: "",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote: "그 상황에서 본인이 풀어야 했던 과제를 한 문장으로 분명하게 쓰세요.",
          };
    case "STAR_ACTION":
      return signals.hasActionCues
        ? {
            status: "pass",
            strengthNote: "측정·개선·도입처럼 구체 행동 단계가 보입니다.",
            gapNote: "",
          }
        : {
            status: "fail",
            strengthNote: "",
            gapNote:
              "행동(방법·판단·실행) 비중이 약합니다. Situation보다 Action을 더 길게, 단계별로 써 주세요.",
          };
    case "BEI_BEHAVIORAL_INDICATORS":
      return signals.hasActionCues && (signals.hasMetrics || signals.hasResultCues)
        ? {
            status: "pass",
            strengthNote: "관찰 가능한 행동과 결과가 함께 있어 BEI 관점에서도 평가하기 좋습니다.",
            gapNote: "",
          }
        : {
            status: "partial",
            strengthNote: "",
            gapNote: "역량 형용사 대신 ‘무슨 말을/행동을/결정을 했는지’를 사건처럼 적어 주세요.",
          };
    default:
      return {
        status: "partial",
        strengthNote: "",
        gapNote: `${roleHint} 맥락에서 근거 문장이 더 분명하면 설득력이 커집니다. 관련 경험의 행동·결과를 한 줄 보강하세요.`,
      };
  }
}

function buildHeuristicResults(
  criteria: LoadedCriterion[],
  ctx: HeuristicCtx
): CriterionResult[] {
  return criteria.map((c) => {
    const h = heuristicCriterionStatus(c.code, ctx);
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

/** 약한 기준마다 서로 다른 원문 인용 + 근거 있는 문단 피드백 */
export function buildEvidenceParagraphFeedback(
  results: CriterionResult[],
  quotes: string[],
  ctx: HeuristicCtx
): ParagraphFeedbackItem[] {
  const weak = results
    .filter((r) => r.status !== "pass" && r.gapNote.trim() && !GENERIC_GAP.test(r.gapNote))
    .sort((a, b) => statusScore(a.status) - statusScore(b.status));

  const used = new Set<string>();
  const items: ParagraphFeedbackItem[] = [];

  const quotePatterns: Record<string, RegExp[]> = {
    TOPIC_FIRST: [/./],
    LOGICAL_ARC: [/결과|덕분에|개선|단축|도입/, /경험|프로젝트/],
    OWN_ROLE_CLEAR: [/팀|함께|참여/, /측정|도입|분석|개선/],
    JD_KEYWORD_EVIDENCE: [/결과|도입|개선|분석/, /./],
    JOB_RELEVANT_EXPERIENCE: [/프로젝트|서버|서비스|고객|업무/, /./],
    MOTIVATION_TRIPLE_LINK: [/지원|회사|기업|직무|비전/, /./],
    STAR_SITUATION: [/당시|상황|병목|문제|장애/, /./],
    STAR_TASK: [/담당|맡|역할|목표|과제/, /./],
    STAR_ACTION: [/측정|분석|도입|개선|구현|재구성/, /./],
    STAR_RESULT: [/\d+|결과|단축|증가|감소/, /./],
    QUANTIFIED_OUTCOME: [/\d+/, /결과/],
    BEI_BEHAVIORAL_INDICATORS: [/했습니다|확인|도입|개선/, /./],
  };

  for (const r of weak) {
    if (items.length >= 5) break;
    const patterns = quotePatterns[r.code] ?? [/./];
    let quote = findQuote(quotes, patterns, used);
    if (!quote && quotes.length) {
      quote = quotes.find((q) => !used.has(normalizeToken(q).slice(0, 40))) ?? quotes[0];
    }
    if (!quote) continue;
    markUsed(used, quote);

    const snippet = quote.length > 160 ? `${quote.slice(0, 157)}…` : quote;
    const why =
      r.status === "fail"
        ? `이 문장에서는 「${r.title}」이 충분히 안 드러납니다.`
        : `이 문장은 「${r.title}」을 부분적으로만 충족합니다.`;

    items.push({
      quote: snippet,
      issue: `${why} ${cleanNote(r.gapNote)}`,
      suggestion: rewriteHint(r.code, snippet, ctx),
    });
  }

  return items;
}

function rewriteHint(code: string, quote: string, ctx: HeuristicCtx): string {
  const role = [ctx.industryLabel, ctx.jobRoleLabel].filter(Boolean).join(" ") || "지원 직무";
  const short = quote.length > 60 ? `${quote.slice(0, 57)}…` : quote;

  switch (code) {
    case "TOPIC_FIRST":
      return `문단을 「결론(성과/행동) → 배경 → 과정」 순으로 바꿔 보세요. 예: 앞문장에 성과를 두고, 지금 인용한 배경(“${short}”)은 뒷받침으로 옮깁니다.`;
    case "LOGICAL_ARC":
      return `이 사례 끝에 “이 경험으로 ${role}에서 ○○를 할 수 있다”는 연결 문장 한 줄을 추가하세요.`;
    case "OWN_ROLE_CLEAR":
      return `‘우리는/팀이’를 ‘저는 APM으로 병목을 측정했고, 인덱스를 재구성했다’처럼 주어를 본인으로 바꿔 역할을 분리해 쓰세요.`;
    case "JD_KEYWORD_EVIDENCE":
      return ctx.jdMatch.missing[0]
        ? `같은 성과를 유지한 채, 공고·직무에서 쓰는 “${ctx.jdMatch.missing.slice(0, 2).join(", ")}” 맥락으로 한 문장만 번역해 덧붙이세요.`
        : `성과 문장 뒤에 직무에서 쓰는 언어로 ‘그래서 어떤 일을 잘한다’를 한 줄 연결하세요.`;
    case "JOB_RELEVANT_EXPERIENCE":
      return `${role}와 직접 닿는 부분을 제목·첫 문장에 드러내고, 덜 관련한 나열은 줄이세요.`;
    case "MOTIVATION_TRIPLE_LINK":
      return `지원동기 문단에 회사 특징 + 직무 + 본인 사례를 한 문장씩만 짝지어 주세요.`;
    case "STAR_ACTION":
      return `Action을 늘리세요: (1) 무엇을 봤는지 (2) 어떤 판단을 했는지 (3) 무엇을 실행했는지 순으로 나눠 씁니다.`;
    case "STAR_RESULT":
    case "QUANTIFIED_OUTCOME":
      return `결과 문장에 ‘전→후’ 숫자(시간, 비율, 규모)를 넣고, 가능하면 배운 점 한 줄을 붙이세요.`;
    default:
      return `인용 문장의 바로 앞뒤에, 부족한 기준을 채울 구체 행동·결과·직무 연결을 한두 문장 보강하세요.`;
  }
}

function improvementFromResults(results: CriterionResult[]): ImprovementPlanItem[] {
  return results
    .filter((r) => r.status !== "pass" && r.gapNote.trim() && !GENERIC_GAP.test(r.gapNote))
    .sort((a, b) => statusScore(a.status) - statusScore(b.status))
    .slice(0, 6)
    .map((r) => ({
      gapLabel: `[${REVIEW_CATEGORY_LABELS[r.category]}] ${r.title}`,
      suggestion: cleanNote(r.gapNote),
    }));
}

/** 점수·% 없이 읽히는 총평 */
export function buildNaturalOverallSummary(
  dimensions: DimensionScore[],
  results: CriterionResult[],
  ctx: HeuristicCtx
): string {
  const strong = dimensions.filter((d) => d.band === "strong");
  const weak = dimensions.filter((d) => d.band === "weak");
  const role = [ctx.industryLabel, ctx.jobRoleLabel].filter(Boolean).join(" · ") || "지원 직무";

  const bestStrength =
    results.find((r) => r.status === "pass" && r.strengthNote)?.strengthNote ||
    strong[0]?.strengths[0] ||
    "";
  const topGaps = results
    .filter((r) => r.status !== "pass" && r.gapNote && !GENERIC_GAP.test(r.gapNote))
    .sort((a, b) => statusScore(a.status) - statusScore(b.status))
    .slice(0, 2);

  const parts: string[] = [];

  if (strong.length && bestStrength) {
    parts.push(
      `읽히기 좋은 쪽은 ${strong.map((d) => d.label).join("·")}입니다. 특히 ${cleanNote(bestStrength)}`
    );
  } else if (bestStrength) {
    parts.push(`강점으로는 ${cleanNote(bestStrength)}`);
  } else {
    parts.push(
      `${role} 기준으로 볼 때, 경험의 뼈대는 있으나 기준별로는 손볼 곳이 분명합니다.`
    );
  }

  if (topGaps.length) {
    parts.push(
      `아쉬운 부분은 ${topGaps.map((g) => g.title).join("과 ")}입니다. ${cleanNote(topGaps[0].gapNote)}`
    );
    if (topGaps[1]) {
      parts.push(cleanNote(topGaps[1].gapNote));
    }
  }

  if (weak.length) {
    parts.push(
      `우선순위는 ${weak.map((d) => d.label).join(", ")} 축을 먼저 손보고, 문단별 제안처럼 원문을 고친 뒤 다시 첨삭받는 흐름이 좋습니다.`
    );
  } else {
    parts.push(
      `전체적으로는 쓸 만한 사례가 있으니, 아래 문단 제안만 반영해도 설득력이 한 단계 올라갑니다.`
    );
  }

  return parts.map((p) => (p.endsWith(".") || p.endsWith("다") ? p : `${p}.`)).join(" ");
}

const REVIEW_SYSTEM = `당신은 10년 이상 대기업·중견기업 서류전형을 봐 온 자기소개서 전문 첨삭관입니다.
지원자에게 말하듯, 교열 비평문을 한국어로 매끄럽게 씁니다. 기계역·체크리스트 나열·점수 발표는 하지 않습니다.

문체:
- 자연스럽고 단정한 경어체. 같은 문장 패턴 반복 금지.
- 점수, %, "매칭률", "충족도" 같은 수치를 본문에 넣지 마세요. (내부 점수는 UI가 따로 보여 줍니다.)
- "원문 기준으로 추가 보완이 필요할 수 있습니다", "보완이 필요합니다"처럼 근거 없는 템플릿 금지.
- 원문에 나온 도구명·수치·행동(APM, Redis, 응답 시간 등)을 짚어 근거로 쓰세요.
- overallSummary는 서로 이어지는 4~6문장으로, 강점 → 핵심 약점 → 고칠 순서까지 한 편의 총평처럼.

문단 피드백:
- paragraphFeedback는 서로 다른 quote만. 같은 문장 중복 인용 금지.
- quote는 제공된 원문/후보에 실제 있는 문장 전체(가능하면).
- issue: 그 문장이 왜 기준에 부족한지(근거). suggestion: 어떻게 고쳐 쓰면 좋은지, 가능하면 고쳐 쓴 방향까지.
- 최대 5개, 정말 손볼 곳만.

criteriaResults: 제공 code 전부. pass면 strengthNote 중심, fail/partial이면 gapNote에 구체 근거.
improvementPlan: fail/partial만. gapLabel "[축이름] 기준제목".
suggestedCompetencies: COMMUNICATION|PROBLEM_SOLVING|JOB_FIT|ORG_FIT|LEADERSHIP|GROWTH 최대 3.

JSON만 출력:
{
  "overallSummary": "...",
  "criteriaResults": [{ "code": "...", "status": "pass|partial|fail", "strengthNote": "...", "gapNote": "..." }],
  "paragraphFeedback": [{ "quote": "...", "issue": "...", "suggestion": "..." }],
  "improvementPlan": [{ "gapLabel": "[형식·논리] ...", "suggestion": "..." }],
  "suggestedCompetencies": ["PROBLEM_SOLVING"]
}`;

function parseCompetencyCodes(raw: unknown): CompetencyCode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is CompetencyCode => typeof c === "string" && COMPETENCY_CODES.includes(c as CompetencyCode))
    .slice(0, 3);
}

function looksNumericDump(text: string): boolean {
  const scoreHits = (text.match(/\d{1,3}\s*점/g) ?? []).length;
  const pctHits = (text.match(/\d{1,3}\s*%/g) ?? []).length;
  return scoreHits + pctHits >= 2 || /매칭률\s*\d/.test(text);
}

function dedupeParagraphFeedback(
  items: ParagraphFeedbackItem[],
  fallbackQuotes: string[]
): ParagraphFeedbackItem[] {
  const used = new Set<string>();
  const out: ParagraphFeedbackItem[] = [];
  let quoteIdx = 0;

  for (const item of items) {
    let quote = item.quote.trim();
    let key = normalizeToken(quote).slice(0, 40);
    if (!quote || used.has(key) || GENERIC_GAP.test(item.issue)) {
      while (quoteIdx < fallbackQuotes.length) {
        const alt = fallbackQuotes[quoteIdx++];
        const altKey = normalizeToken(alt).slice(0, 40);
        if (!used.has(altKey)) {
          quote = alt.slice(0, 220);
          key = altKey;
          break;
        }
      }
      if (!quote || used.has(key)) continue;
    }
    used.add(key);
    out.push({
      quote: quote.slice(0, 220),
      issue: cleanNote(item.issue),
      suggestion: cleanNote(item.suggestion),
    });
    if (out.length >= 5) break;
  }
  return out;
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
      const base = byCode.get(code)!;
      const status =
        r.status === "pass" || r.status === "partial" || r.status === "fail"
          ? r.status
          : base.status;
      // LLM 문구를 우선. 비어 있거나 템플릿/점수 나열일 때만 휴리스틱.
      let strengthNote =
        typeof r.strengthNote === "string" ? r.strengthNote.trim() : "";
      let gapNote = typeof r.gapNote === "string" ? r.gapNote.trim() : "";
      if (!strengthNote || GENERIC_GAP.test(strengthNote) || looksNumericDump(strengthNote)) {
        strengthNote = base.strengthNote;
      }
      if (!gapNote || GENERIC_GAP.test(gapNote) || looksNumericDump(gapNote)) {
        gapNote = status === "pass" ? "" : base.gapNote;
      }
      byCode.set(code, {
        ...base,
        status,
        strengthNote: cleanNote(strengthNote),
        gapNote: cleanNote(gapNote),
      });
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
  const quotes = extractQuoteCandidates(resumeRawText, resumeSummary);
  const ctx: HeuristicCtx = {
    signals,
    jdMatch,
    matchSource,
    industryLabel,
    jobRoleLabel,
    requiredKeywords,
    quotes,
  };

  const heuristicResults = buildHeuristicResults(criteria, ctx);
  const heuristicDimensions = buildDimensionScores(heuristicResults);

  const fallback: ResumeReviewNarrative = {
    overallSummary: buildNaturalOverallSummary(heuristicDimensions, heuristicResults, ctx),
    paragraphFeedback: buildEvidenceParagraphFeedback(heuristicResults, quotes, ctx),
    improvementPlan: improvementFromResults(heuristicResults),
    suggestedCompetencies:
      params.suggestedFromEvidence?.length
        ? params.suggestedFromEvidence.slice(0, 3)
        : ["PROBLEM_SOLVING"],
    dimensionScores: heuristicDimensions,
    criteriaResults: heuristicResults,
    narrativeSource: "heuristic",
    narrativeModel: null,
  };

  const matchContext =
    matchSource === "jd"
      ? `기준: 채용공고. 공고에서 강조하는 말: ${requiredKeywords.join(", ") || "(없음)"}. 이미 드러난 말: ${jdMatch.matched.join(", ") || "(없음)"}. 덜 드러난 말: ${jdMatch.missing.join(", ") || "(없음)"}.`
      : `기준: ${industryLabel ?? ""} · ${jobRoleLabel ?? ""} 일반 기대. 기대 표현: ${requiredKeywords.join(", ")}. 이미 닿아 보이는 표현: ${jdMatch.matched.join(", ") || "(없음)"}.`;

  const criteriaBlock = criteria
    .map(
      (c) =>
        `- [${c.category}] code=${c.code} | ${c.title}\n  정의: ${c.description}\n  확인: ${c.howToCheck}`
    )
    .join("\n");

  const quoteBlock = quotes
    .slice(0, 14)
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  const userPrompt = `
${matchContext}
(참고용 내부 단서 — 답변에 점수/%로 쓰지 말 것: 수치단서=${signals.hasMetrics}, S/T/A/R=${signals.hasSituationCues}/${signals.hasTaskCues}/${signals.hasActionCues}/${signals.hasResultCues})

평가 기준 (criteriaResults에 code 전부):
${criteriaBlock}

인용 후보 (paragraphFeedback.quote는 여기서만 고르고, 서로 다른 번호 사용):
${quoteBlock || "(후보 부족 — 원문에서 직접 짧게 인용)"}

자소서 요약:
- summary: ${resumeSummary.summary}
- skills: ${resumeSummary.skills.join(", ")}
- experiences: ${resumeSummary.experiences.join(" | ")}
${evidenceContext ? `\nclaim↔역량:\n${evidenceContext}` : ""}
${performanceContext ? `\n면접 역량 수준:\n${performanceContext}` : ""}

원문:
${sanitizeResumeForLlm(resumeRawText).slice(0, 5000)}
`.trim();

  if (!process.env.GEMINI_API_KEY) {
    console.warn("[resume-review] GEMINI_API_KEY 없음 → heuristic fallback");
    return fallback;
  }

  // Pro thinking이 출력을 삼키지 않도록 maxOutputTokens는 quality helper 기본(16384) 사용
  const { text: content, modelUsed } = await generateGeminiQualityText({
    systemInstruction: REVIEW_SYSTEM,
    userPrompt,
    temperature: 0.45,
    timeoutMs: 55_000,
  });

  if (!content) {
    console.warn("[resume-review] LLM 본문 없음 → heuristic fallback");
    return fallback;
  }
  console.info("[resume-review] narrative model:", modelUsed);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[resume-review] JSON 추출 실패 → heuristic fallback");
    return fallback;
  }

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

    let overallSummary =
      typeof parsed.overallSummary === "string" && parsed.overallSummary.trim()
        ? parsed.overallSummary.trim()
        : "";
    if (!overallSummary || looksNumericDump(overallSummary) || GENERIC_GAP.test(overallSummary)) {
      console.warn("[resume-review] overallSummary 품질 부족 → 축 기반 문장으로 대체");
      overallSummary = buildNaturalOverallSummary(dimensionScores, criteriaResults, ctx);
    } else {
      overallSummary = cleanNote(overallSummary);
    }

    const llmParagraphs = Array.isArray(parsed.paragraphFeedback)
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
          .map((p) => ({
            quote: p.quote.trim(),
            issue: p.issue.trim(),
            suggestion: p.suggestion.trim(),
          }))
      : [];

    const paragraphFeedback = dedupeParagraphFeedback(
      llmParagraphs.length > 0
        ? llmParagraphs
        : buildEvidenceParagraphFeedback(criteriaResults, quotes, ctx),
      quotes
    );

    const improvementPlan = Array.isArray(parsed.improvementPlan)
      ? parsed.improvementPlan
          .filter((p): p is ImprovementPlanItem => {
            if (!p || typeof p !== "object") return false;
            const row = p as Record<string, unknown>;
            return typeof row.gapLabel === "string" && typeof row.suggestion === "string";
          })
          .map((p) => ({
            gapLabel: p.gapLabel.trim(),
            suggestion: cleanNote(p.suggestion),
          }))
          .filter((p) => !GENERIC_GAP.test(p.suggestion))
          .slice(0, 6)
      : [];

    const suggestedCompetencies = parseCompetencyCodes(parsed.suggestedCompetencies);
    const usedLlmProse =
      llmParagraphs.length > 0 ||
      (typeof parsed.overallSummary === "string" &&
        parsed.overallSummary.trim().length > 80 &&
        !looksNumericDump(parsed.overallSummary));

    return {
      overallSummary,
      paragraphFeedback:
        paragraphFeedback.length > 0
          ? paragraphFeedback
          : buildEvidenceParagraphFeedback(criteriaResults, quotes, ctx),
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
      narrativeSource: usedLlmProse ? "llm" : "heuristic",
      narrativeModel: modelUsed,
    };
  } catch (e) {
    console.error("[resume-review] JSON parse 실패:", e);
    return fallback;
  }
}

export function buildResumeKeywordPool(summary: ResumeSummary): string[] {
  return collectResumeKeywords(summary);
}

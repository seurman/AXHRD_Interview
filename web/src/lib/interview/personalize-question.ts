/**
 * 자소서·회사 맥락으로 면접 질문 개인화
 * (자체 문항 + LLM 재작성 — 타사 특허 문항 DB 미사용)
 *
 * 같은 세션 안에서 동일한 자소서 사례를 여러 질문에 반복 인용하지 않도록
 * 이미 사용한 문장(excludeHighlights)을 제외하고 후보를 뽑는다. 후보가 남아있지
 * 않으면(=자소서가 짧거나 이미 다 인용함) 억지로 재활용하지 않고 일반 질문으로 되돌린다.
 *
 * 질문 생성과 동시에 해당 질문 전용 채점 루브릭도 함께 만든다(클라이언트에는 노출 안 함).
 */

import { competencyLabel, jobRoleLabel } from "@/lib/labels";
import { buildNcsRubric } from "@/lib/competency/ncs-rubric";
import { generateGeminiText } from "@/lib/gemini/client";
import type { ResumeSummary, ResumeChunk } from "@/lib/interview/resume-summary";
import type { JdRequirements } from "@/lib/company/jd-mapper";

const PERSONALIZE_SYSTEM = `당신은 한국 기업 면접관입니다.
기본 질문을 지원자 자소서에 **실제로 적힌 사실만** 인용해 한 문장으로 다시 쓰고, 채점 루브릭도 만듭니다.

절대 규칙 (위반 시 무효):
- 자소서 핵심 문장에 **없는** 프로젝트명·회사명·수치·역할을 지어내지 마세요.
- 질문 한 문장 안에 제공된 「자소서 핵심 문장」에서 가져온 **고유 명사 또는 구절을 최소 1개** 큰따옴표 또는 「」로 그대로 넣으세요.
- 기본 질문의 평가 의도(역량)는 유지하되, 막연한 "자소서에 적으신 경험" 같은 표현만으로는 부족합니다.
- 존댓말, 90자 이내 권장.
- 루브릭 3~4개: 자소서에서 인용한 그 경험을 검증하는 기준을 포함.
- JSON만: {"question":"...","rubric":["기준1","기준2","기준3"],"citedPhrase":"질문에 넣은 자소서 구절"}`;

export interface PersonalizeResult {
  text: string;
  rubric: string[];
  /** 이번에 실제로 인용에 사용한 자소서 문장 — 세션의 used-highlight 목록에 누적시켜야 함 */
  usedHighlight?: string;
  /** 이번에 인용한 JD 키워드/스킬 — usedJdTerms에 누적 */
  usedJdTerm?: string;
  /** UI에 보여줄 자소서 근거 구절(질문과 연결 증명) */
  resumeAnchors?: string[];
}

/** JD/인재상 매핑으로 뽑힌(또는 프리셋의) 면접 스타일 — 질문 톤·루브릭에 반영 */
export interface InterviewStyleHint {
  tone: string;
  focus: string[];
}

const COMPETENCY_HINTS: Record<string, RegExp> = {
  COMMUNICATION: /발표|설득|전달|보고|협의|커뮤니|설명|소통|문서/,
  PROBLEM_SOLVING: /문제|해결|분석|개선|효율|원인|과제|난관|어려/,
  JOB_FIT: /직무|업무|프로젝트|개발|마케|영업|실무|담당|성과|매출|기술/,
  ORG_FIT: /팀|협업|조직|문화|동료|갈등|소속|함께|부서/,
  LEADERSHIP: /리더|주도|이끌|장|대표|팀원|조직|책임|주장|발의/,
  GROWTH: /배움|성장|회고|피드백|학습|개발|자격|공부|도전|실패/,
};

export async function personalizeQuestion(params: {
  template: string;
  competency: string;
  companyName?: string;
  jobRole?: string;
  /** 자소서 원문 대신 정리된 요약(lib/interview/resume-summary.ts)을 우선 사용한다 —
   *  원문을 그대로 인용하면 OCR/추출 오류가 그대로 질문에 섞여 나올 수 있기 때문. */
  resumeSummary?: ResumeSummary | null;
  /** 레거시 폴백 — parsedTags(요약)가 아직 없는 옛날 자소서 레코드용. 요약이 있으면 무시됨. */
  legacyResumeText?: string;
  excludeHighlights?: string[];
  /** 이미 질문에 쓴 JD 키워드/스킬 제외 */
  excludeJdTerms?: string[];
  /** 자소서 인용이 없거나 소진됐을 때 JD 요구사항으로 그라운딩 */
  jdRequirements?: JdRequirements | null;
  interviewStyle?: InterviewStyleHint;
  /** 온톨로지 claim 순위 + 답변 수준 밴드 — 있으면 역량 매칭 청크 우선 */
  ontologyHints?: {
    preferredChunks?: ResumeChunk[];
    preferredExperiences?: string[];
    performanceBand?: string;
  };
}): Promise<PersonalizeResult> {
  const genericRubric = buildGenericRubric(params.competency);
  const exclude = new Set(params.excludeHighlights ?? []);
  const excludeJd = new Set(params.excludeJdTerms ?? []);

  const summaryExperiences =
    params.ontologyHints?.preferredExperiences?.length
      ? params.ontologyHints.preferredExperiences
      : (params.resumeSummary?.experiences ?? []);
  const summaryChunks =
    params.ontologyHints?.preferredChunks?.length
      ? params.ontologyHints.preferredChunks
      : (params.resumeSummary?.chunks ?? []);
  const hasSummary = summaryExperiences.length > 0 || summaryChunks.length > 0;
  const legacyText = !hasSummary ? params.legacyResumeText?.trim() ?? "" : "";

  const chunkCandidates = rankChunksByCompetency(summaryChunks, params.competency).filter(
    (c) => !exclude.has(c.markdown) && !exclude.has(c.title),
  );

  // 답변 수준이 약하면 수치 있는 claim을, 강하면 역량 점수 높은 claim을 앞에
  const band = params.ontologyHints?.performanceBand;
  const orderedChunks =
    band === "weak"
      ? [...chunkCandidates].sort((a, b) => Number(/\d/.test(b.markdown)) - Number(/\d/.test(a.markdown)))
      : chunkCandidates;

  const highlights = hasSummary
    ? orderedChunks.length > 0
      ? orderedChunks.map((c) => excerptForCitation(c.markdown))
      : rankExperiencesByCompetency(summaryExperiences, params.competency).filter(
          (h) => !exclude.has(h),
        )
    : legacyText
      ? extractResumeHighlights(legacyText, params.competency).filter((h) => !exclude.has(h))
      : [];

  const jdTerms = rankJdTermsByCompetency(params.jdRequirements, params.competency).filter(
    (t) => !excludeJd.has(t)
  );

  // 인용할 만한 새 사례가 없다 — JD 키워드로 폴백, 그것도 없으면 일반 질문
  if (highlights.length === 0 && jdTerms.length === 0) {
    return { text: params.template, rubric: genericRubric };
  }

  const useJdOnly = highlights.length === 0;
  const anchor = useJdOnly ? jdTerms[0] : highlights[0];
  const anchorChunk = !useJdOnly && orderedChunks.length > 0 ? orderedChunks[0] : null;
  const groundingTerms = useJdOnly ? jdTerms : highlights;
  // 인용하려는 자소서 경험이 이번 질문의 역량 주제와 실제로 겹치는지 — 겹치지 않으면(=이
  // 역량과 관련된 경험이 소진돼 무관한 경험을 어쩔 수 없이 앵커로 쓴 경우) heuristic 폴백에서
  // 원래 질문 템플릿을 억지로 이어붙이지 않고, 방금 인용한 그 경험 자체를 캐묻는 질문으로 잇는다.
  const anchorRelevantToCompetency =
    useJdOnly || highlights.length === 0
      ? true
      : (COMPETENCY_HINTS[params.competency] ?? /./).test(highlights[0]);

  const performanceNote =
    band === "weak"
      ? "지원자의 해당 역량 면접 답변 수준이 아직 낮습니다. 자소서 수치·역할을 구체적으로 검증하되 존중하는 톤으로."
      : band === "strong"
        ? "해당 역량 면접 답변 수준이 높습니다. 자소서 claim의 의사결정·트레이드오프를 더 깊게 캐물으세요."
        : "";

  if (process.env.GEMINI_API_KEY) {
    const llm = await personalizeWithGemini(
      {
        ...params,
        resumeContext: hasSummary
          ? [
              params.resumeSummary?.summary,
              ...orderedChunks.map((c) => `${c.title}: ${c.markdown}`),
              ...summaryExperiences,
              performanceNote,
            ]
              .filter(Boolean)
              .join(" ")
          : legacyText.slice(0, 1500),
        useJdOnly,
        jdTerms,
        performanceNote,
      },
      groundingTerms
    );
    if (llm && isQuestionGroundedInTerms(llm.question, groundingTerms)) {
      const anchors = pickDisplayedAnchors(groundingTerms, llm.citedPhrase, anchorChunk);
      return {
        text: llm.question,
        rubric: llm.rubric.length > 0 ? llm.rubric : heuristicRubric(params.competency, groundingTerms, useJdOnly),
        usedHighlight: useJdOnly ? undefined : anchorChunk ? anchorChunk.markdown : anchor,
        usedJdTerm: useJdOnly ? anchor : undefined,
        resumeAnchors: anchors,
      };
    }
  }

  const heuristicText = useJdOnly
    ? heuristicJdPersonalize(params.template, jdTerms, params.companyName, params.jobRole)
    : heuristicPersonalize(
        params.template,
        highlights,
        params.companyName,
        params.jobRole,
        anchorRelevantToCompetency,
      );
  return {
    text: heuristicText,
    rubric: heuristicRubric(params.competency, groundingTerms, useJdOnly),
    usedHighlight: useJdOnly ? undefined : anchorChunk ? anchorChunk.markdown : anchor,
    usedJdTerm: useJdOnly ? anchor : undefined,
    resumeAnchors: pickDisplayedAnchors(groundingTerms, undefined, anchorChunk),
  };
}

/** 질문 텍스트가 그라운딩 소스(자소서/JD) 토큰을 포함하는지 */
function isQuestionGroundedInTerms(question: string, terms: string[]): boolean {
  return isQuestionGroundedInHighlights(question, terms);
}

/** @deprecated — isQuestionGroundedInTerms 사용 */
function isQuestionGroundedInHighlights(question: string, highlights: string[]): boolean {
  const q = question.replace(/\s+/g, "");
  for (const h of highlights) {
    const tokens = extractGroundingTokens(h);
    if (tokens.some((t) => q.includes(t.replace(/\s+/g, "")))) return true;
  }
  // 「…」 또는 "…" 인용이 있고, 그 내용이 highlight 부분문자열이면 OK
  const quoted = [...question.matchAll(/[「"]([^」"]{4,40})[」"]/g)].map((m) => m[1]);
  for (const quote of quoted) {
    if (highlights.some((h) => h.includes(quote) || quote.length >= 6 && h.replace(/\s+/g, "").includes(quote.replace(/\s+/g, "")))) {
      return true;
    }
  }
  return false;
}

function extractGroundingTokens(highlight: string): string[] {
  const tokens: string[] = [];
  const metrics = highlight.match(/\d+(\.\d+)?\s*(%|퍼센트|명|건|억|만\s?원|배|회)/g);
  if (metrics) tokens.push(...metrics.map((m) => m.replace(/\s+/g, "")));
  // 2글자 이상 한글·영문 연속 구 (조사 많은 짧은 단어 제외)
  const words = highlight.match(/[A-Za-z][A-Za-z0-9_+-]{2,}|[가-힣]{3,}/g) ?? [];
  tokens.push(...words.filter((w) => !/^(그리고|하지만|그래서|했습니다|하였습니다|입니다)$/.test(w)));
  return [...new Set(tokens)].slice(0, 8);
}

function pickDisplayedAnchors(
  highlights: string[],
  citedPhrase?: string | null,
  chunk?: ResumeChunk | null,
): string[] {
  const out: string[] = [];
  if (chunk) {
    out.push(`[${chunk.title}] ${excerptForCitation(chunk.markdown, 120)}`);
  }
  if (citedPhrase?.trim()) {
    const c = citedPhrase.trim();
    out.push(c.length > 72 ? `${c.slice(0, 70)}…` : c);
  }
  for (const h of highlights) {
    const short = h.length > 72 ? `${h.slice(0, 70)}…` : h;
    if (!out.some((a) => a === short || h.includes(a) || a.includes(h.slice(0, 20)))) {
      out.push(short);
    }
    if (out.length >= 2) break;
  }
  return out;
}

function excerptForCitation(markdown: string, max = 85): string {
  const flat = markdown.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function rankChunksByCompetency(chunks: ResumeChunk[], competency: string): ResumeChunk[] {
  const hint = COMPETENCY_HINTS[competency] ?? /./;
  const matched = chunks.filter(
    (c) => hint.test(c.markdown) || (c.tags ?? []).some((t) => hint.test(t)),
  );
  const rest = chunks.filter((c) => !matched.includes(c));
  return [...matched, ...rest];
}

/** 정리된 경험 목록(요약 단계에서 이미 뽑아둔 것) 중 이 역량과 관련성 높은 것을 앞으로 정렬 */
function rankExperiencesByCompetency(experiences: string[], competency: string): string[] {
  const hint = COMPETENCY_HINTS[competency] ?? /./;
  const matched = experiences.filter((e) => hint.test(e));
  const rest = experiences.filter((e) => !hint.test(e));
  return [...new Set([...matched, ...rest])].slice(0, 3);
}

function rankJdTermsByCompetency(
  jd: JdRequirements | null | undefined,
  competency: string
): string[] {
  if (!jd) return [];
  const hint = COMPETENCY_HINTS[competency] ?? /./;
  const terms = [...(jd.skills ?? []), ...(jd.keywords ?? [])]
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const matched = terms.filter((t) => hint.test(t));
  const rest = terms.filter((t) => !hint.test(t));
  return [...new Set([...matched, ...rest])].slice(0, 5);
}

async function personalizeWithGemini(
  params: {
    template: string;
    competency: string;
    companyName?: string;
    jobRole?: string;
    resumeContext: string;
    interviewStyle?: InterviewStyleHint;
    useJdOnly?: boolean;
    jdTerms?: string[];
    performanceNote?: string;
  },
  highlights: string[]
): Promise<{ question: string; rubric: string[]; citedPhrase?: string } | null> {
  const sourceLabel = params.useJdOnly ? "JD 요구사항" : "자소서 핵심 문장";
  const userPrompt = `
역량: ${competencyLabel(params.competency)}
지원 회사: ${params.companyName ?? "미정"}
지원 직무: ${params.jobRole ? jobRoleLabel(params.jobRole) : "미정"}
${params.interviewStyle ? `면접 스타일: ${params.interviewStyle.tone} (중점 평가 역량: ${params.interviewStyle.focus.join(", ")})` : ""}
${params.performanceNote ? `답변 수준 힌트: ${params.performanceNote}` : ""}
기본 질문(평가 의도 유지): ${params.template}

★ 반드시 아래에서만 인용하세요. 아래에 없는 사실은 질문·citedPhrase에 넣지 마세요.
${sourceLabel}:
${highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}
${params.useJdOnly ? "" : `\n자소서 요약(참고용 — 핵심 문장에 없는 사실은 쓰지 말 것):\n${params.resumeContext}`}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: PERSONALIZE_SYSTEM,
    userPrompt,
    temperature: 0.25,
    maxOutputTokens: 640,
    timeoutMs: 40_000,
    task: "personalize_question",
    responseMimeType: "application/json",
  });

  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          question?: string;
          rubric?: string[];
          citedPhrase?: string;
        };
        if (parsed.question?.trim()) {
          return {
            question: parsed.question.trim(),
            rubric: Array.isArray(parsed.rubric) ? parsed.rubric.filter(Boolean) : [],
            citedPhrase: typeof parsed.citedPhrase === "string" ? parsed.citedPhrase : undefined,
          };
        }
      } catch (e) {
        console.error("[Gemini personalize] JSON parse 실패:", e);
      }
    }
  }

  return null;
}

// 마침표/느낌표/물음표 뒤에 공백이 있을 때만 문장 경계로 본다.
// "2026.02"처럼 숫자 앞 마침표는 뒤에 공백이 없어 자동으로 걸러진다.
const SENTENCE_SPLIT = /(?<=[.!?])\s+|。+/g;

// 실제 경험 서술이 아닌 안내문/메타 문구(테스트용 더미 자소서 등)는 인용 대상에서 제외
const META_LINE = /^[※*]|테스트\s*목적|샘플\s*자기소개서|가상\s*인물|더미\s*(데이터|자소서)/;

// 이메일·전화번호가 포함된 줄은 100% 인적사항 — 경험 서술일 수 없다.
const CONTACT_INFO = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}|01[016789][-\s]?\d{3,4}[-\s]?\d{4}/;
// "성명 OOO 지원 부문 OOO 학력 OOO 연락처 OOO" 처럼 이력서 상단 인적사항 블록이
// 문장 구분자(마침표 등) 없이 한 줄로 붙어버리는 경우가 있다 — 헤더 라벨이 2개
// 이상 한 줄에 나오면 서술문이 아니라 인적사항 블록으로 보고 제외한다.
const HEADER_LABEL = /성명|이름|지원\s*(부문|분야)|학력|연락처|생년월일|전화번호|이메일/g;

function isHeaderMetaLine(line: string): boolean {
  if (CONTACT_INFO.test(line)) return true;
  const labelMatches = line.match(HEADER_LABEL);
  return !!labelMatches && labelMatches.length >= 2;
}

// 실제 "성과"로 인용할 만한 수치인지 판단 — 단순히 숫자가 있다고 다 성과는 아니다
// (졸업연도 "2026.2", 이메일 속 숫자 등은 성과 지표가 아니다). 단위가 붙은 경우만 인정.
const METRIC_PATTERN =
  /\d+(\.\d+)?\s*(%|퍼센트|명|건|억|만\s?원|천만\s?원|배|시간|일|개월|주년?|회)/;

/** PDF/DOCX에서 추출한 텍스트는 단어 중간에도 줄바꿈이 생길 수 있어(자간 조정용),
 *  단일 개행은 실제 문장 구분이 아니라 그냥 공백으로 합친다. 이걸 문장 경계로 오인하면
 *  "를 작성하는 것을 넘어…" 처럼 조사로 시작하는 잘린 문장이 인용문으로 뽑히는 버그가 생긴다. */
function normalizeResumeText(resume: string): string {
  return resume
    .replace(/\s*\n+\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitResumeSentences(resume: string): string[] {
  return normalizeResumeText(resume)
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && !META_LINE.test(s) && !isHeaderMetaLine(s));
}

function extractResumeHighlights(resume: string, competency: string): string[] {
  const lines = splitResumeSentences(resume);

  const hint = COMPETENCY_HINTS[competency] ?? /./;
  const matched = lines.filter((s) => hint.test(s));
  const withMetrics = lines.filter((s) => METRIC_PATTERN.test(s));

  return [...new Set([...matched, ...withMetrics, ...lines])]
    .slice(0, 3)
    .map((s) => (s.length > 85 ? `${s.slice(0, 82)}…` : s));
}

function heuristicJdPersonalize(
  template: string,
  jdTerms: string[],
  companyName?: string,
  jobRole?: string
): string {
  const anchor = jdTerms[0];
  const companyBit = companyName ? `${companyName} ` : "";
  const roleBit = jobRole ? `${jobRoleLabel(jobRole)} 직무 관점에서 ` : "";
  const intro = `${companyBit}${roleBit}채용공고의 「${anchor}」 요구사항과 연결해 여쭤봅니다.`;
  return `${intro} ${template}`;
}

function heuristicPersonalize(
  template: string,
  highlights: string[],
  companyName?: string,
  jobRole?: string,
  anchorRelevant = true,
): string {
  const anchor = highlights[0];
  const metric = highlights.find((h) => METRIC_PATTERN.test(h) && h !== anchor);
  const companyBit = companyName ? `${companyName} ` : "";
  const roleBit = jobRole ? `${jobRoleLabel(jobRole)} 직무 관점에서 ` : "";

  // 인용한 자소서 경험이 이번 질문의 역량 주제와 안 겹치면(=이 역량에 맞는 경험이 소진돼
  // 어쩔 수 없이 무관한 경험을 앵커로 쓴 경우), 원래 질문 템플릿을 억지로 이어붙이지 않는다.
  // "60% 병목을 확인했다"고 인용해놓고 "피드백 받고 행동 바꾼 경험은?" 같은 안 어울리는
  // 질문이 뒤따르는 걸 막고, 대신 방금 인용한 그 경험 자체를 더 캐묻는 질문으로 자연스럽게 잇는다.
  if (!anchorRelevant) {
    return metric
      ? `${companyBit}${roleBit}자소서에 적어 주신 「${anchor}」 경험과 「${metric}」 성과를 바탕으로 여쭤봅니다. 그 결과를 어떤 방법과 과정으로 확인하고 만들어내셨는지 구체적으로 말씀해 주세요.`
      : `${companyBit}${roleBit}자소서에 적어 주신 「${anchor}」 경험을 바탕으로 여쭤봅니다. 그 과정에서 본인이 구체적으로 어떤 역할을 맡아 어떻게 진행하셨는지 말씀해 주세요.`;
  }

  // 원본 질문 템플릿은 문장 수·문장부호가 제각각이라 뒤에 문구를 이어붙이면
  // "~말씀해 주세요.에 대해" 같은 비문이 생긴다. 대신 맥락 문장을 앞에 붙이고
  // 템플릿은 손대지 않고 그대로 뒤에 둔다.
  const intro = metric
    ? `${companyBit}${roleBit}자소서에 적어 주신 「${anchor}」 경험과 「${metric}」 성과를 바탕으로 여쭤봅니다.`
    : `${companyBit}${roleBit}자소서에 적어 주신 「${anchor}」 경험을 바탕으로 여쭤봅니다.`;

  return `${intro} ${template}`;
}

function heuristicRubric(competency: string, terms: string[], fromJd = false): string[] {
  const rubric = buildNcsRubric(competency).slice(0, 3);
  const anchor = terms[0];
  if (anchor) {
    const label = fromJd ? "공고 요구사항" : "자소서";
    rubric.push(`${label}에 언급된 "${anchor.slice(0, 40)}"와 연결지어 답변했는가`);
  }
  return rubric;
}

export function buildGenericRubric(competency: string): string[] {
  return buildNcsRubric(competency);
}

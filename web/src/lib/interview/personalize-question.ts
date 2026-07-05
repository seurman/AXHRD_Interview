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
import { generateGeminiText } from "@/lib/gemini/client";

const PERSONALIZE_SYSTEM = `당신은 한국 기업 면접관입니다.
기본 질문을 지원자 자소서 내용에 맞게 **한 문장**으로 다시 쓰고, 이 질문을 채점할 루브릭도 만듭니다.

규칙:
- 질문: 자소서에 나온 프로젝트·회사·역할·성과·숫자 중 **최소 2가지를 구체적으로 인용**, 지원 회사/직무와 연결, 존댓말, 90자 내외
- 루브릭: 이 질문에 대한 좋은 답변이 갖춰야 할 기준 3~4개(지원자에게는 보여주지 않고 채점에만 사용)
- JSON만: {"question":"...", "rubric":["기준1","기준2","기준3"]}`;

export interface PersonalizeResult {
  text: string;
  rubric: string[];
  /** 이번에 실제로 인용에 사용한 자소서 문장 — 세션의 used-highlight 목록에 누적시켜야 함 */
  usedHighlight?: string;
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
  resumeText?: string;
  excludeHighlights?: string[];
}): Promise<PersonalizeResult> {
  const resume = params.resumeText?.trim() ?? "";
  const genericRubric = buildGenericRubric(params.competency);

  if (!resume) {
    return { text: params.template, rubric: genericRubric };
  }

  const exclude = new Set(params.excludeHighlights ?? []);
  const highlights = extractResumeHighlights(resume, params.competency).filter(
    (h) => !exclude.has(h)
  );

  // 인용할 만한 새 사례가 없다(자소서가 짧거나, 이미 다 우려먹었다) — 억지로 재활용하지 않고
  // 일반 질문으로 되돌린다. 이게 오히려 자연스럽다.
  if (highlights.length === 0) {
    return { text: params.template, rubric: genericRubric };
  }

  const anchor = highlights[0];

  if (process.env.GEMINI_API_KEY) {
    const llm = await personalizeWithGemini(
      { ...params, resumeText: resume },
      highlights
    );
    if (llm) {
      return {
        text: llm.question,
        rubric: llm.rubric.length > 0 ? llm.rubric : heuristicRubric(params.competency, highlights),
        usedHighlight: anchor,
      };
    }
  }

  return {
    text: heuristicPersonalize(params.template, highlights, params.companyName, params.jobRole),
    rubric: heuristicRubric(params.competency, highlights),
    usedHighlight: anchor,
  };
}

async function personalizeWithGemini(
  params: {
    template: string;
    competency: string;
    companyName?: string;
    jobRole?: string;
    resumeText: string;
  },
  highlights: string[]
): Promise<{ question: string; rubric: string[] } | null> {
  const userPrompt = `
역량: ${competencyLabel(params.competency)}
지원 회사: ${params.companyName ?? "미정"}
지원 직무: ${params.jobRole ? jobRoleLabel(params.jobRole) : "미정"}
기본 질문: ${params.template}
자소서 핵심 문장(이번에 인용 가능한 것만): ${highlights.join(" / ")}

자소서 전문:
${params.resumeText.slice(0, 1500)}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: PERSONALIZE_SYSTEM,
    userPrompt,
    temperature: 0.35,
    maxOutputTokens: 320,
    timeoutMs: 6000,
  });

  if (content) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { question?: string; rubric?: string[] };
        if (parsed.question?.trim()) {
          return {
            question: parsed.question.trim(),
            rubric: Array.isArray(parsed.rubric) ? parsed.rubric.filter(Boolean) : [],
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

function heuristicPersonalize(
  template: string,
  highlights: string[],
  companyName?: string,
  jobRole?: string
): string {
  const anchor = highlights[0];
  const metric = highlights.find((h) => METRIC_PATTERN.test(h) && h !== anchor);
  const companyBit = companyName ? `${companyName} ` : "";
  const roleBit = jobRole ? `${jobRoleLabel(jobRole)} 직무 관점에서 ` : "";

  // 원본 질문 템플릿은 문장 수·문장부호가 제각각이라 뒤에 문구를 이어붙이면
  // "~말씀해 주세요.에 대해" 같은 비문이 생긴다. 대신 맥락 문장을 앞에 붙이고
  // 템플릿은 손대지 않고 그대로 뒤에 둔다.
  const intro = metric
    ? `${companyBit}${roleBit}자소서에 적어 주신 「${anchor}」 경험과 「${metric}」 성과를 바탕으로 여쭤봅니다.`
    : `${companyBit}${roleBit}자소서에 적어 주신 「${anchor}」 경험을 바탕으로 여쭤봅니다.`;

  return `${intro} ${template}`;
}

function heuristicRubric(competency: string, highlights: string[]): string[] {
  const label = competencyLabel(competency);
  const anchor = highlights[0];
  const rubric = [
    `${label}과 관련된 구체적 상황·과제를 설명했는가`,
    "본인이 직접 수행한 행동을 명확히 서술했는가",
    "수치나 결과로 성과를 뒷받침했는가",
  ];
  if (anchor) {
    rubric.push(`자소서에 언급된 "${anchor.slice(0, 40)}" 경험과 연결지어 답변했는가`);
  }
  return rubric;
}

function buildGenericRubric(competency: string): string[] {
  const label = competencyLabel(competency);
  return [
    `${label}과 관련된 구체적 사례(상황·과제)를 제시했는가`,
    "본인이 직접 수행한 행동을 명확히 서술했는가",
    "수치나 결과로 성과를 뒷받침했는가",
  ];
}

/**
 * JD(채용공고)·인재상 매핑 — 세션 시작 시 1회만 호출.
 * 톤·라운드·중점 역량 + 기업 규모 + 요구 스킬/키워드를 함께 추출한다.
 */

import { generateGeminiText } from "@/lib/gemini/client";
import type { CompanyContext } from "@/types";
import {
  inferCompanySizeFromText,
  type CompanySizeCode,
} from "@/lib/company/company-size-presets";

export type JdRequirements = {
  skills: string[];
  keywords: string[];
};

export type JDMapResult = {
  interviewStyle: CompanyContext["interviewStyle"];
  companySize: CompanySizeCode | null;
  requirements: JdRequirements;
};

const JD_MAP_SYSTEM = `당신은 한국 기업 채용공고(JD)·인재상 자료를 분석해 모의 면접 스타일을 요약하는 도우미입니다.
주어진 원문에서 이 회사/직무의 면접 톤, 예상 면접 라운드, 중점적으로 평가할 역량 키워드를 뽑고,
요구 스킬·자격·키워드도 함께 추출하세요.
원문에 스타트업·중견·대기업·공공기관·공사 등 기업 규모 단서가 있으면 companySize도 추정하세요.
아래 JSON 형식으로만 답하세요. 원문에 실제로 있는 내용만 근거로 삼고, 지어낸 회사 실명을 추가하지 마세요.

{
  "tone": "면접 톤을 15자 내외로 요약",
  "rounds": ["예상 면접 라운드 1~4개"],
  "focus": ["중점 평가 역량 키워드 2~5개"],
  "companySize": "LARGE | MID | SMALL | STARTUP | PUBLIC 중 하나 또는 null",
  "requirements": {
    "skills": ["요구 스킬·툴·자격 2~8개"],
    "keywords": ["JD 핵심 키워드·역량·업무 3~10개"]
  }
}`;

const VALID_SIZES = new Set<CompanySizeCode>([
  "LARGE",
  "MID",
  "SMALL",
  "STARTUP",
  "PUBLIC",
]);

function parseStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
}

function requirementsFromFocus(focus: string[]): JdRequirements {
  return {
    skills: focus.slice(0, 6),
    keywords: focus,
  };
}

export async function deriveInterviewStyleFromJD(params: {
  jdText: string;
  industryLabel: string;
}): Promise<JDMapResult | null> {
  const jd = params.jdText.trim();
  if (!jd || jd.length < 15) return null;

  const keywordSize = inferCompanySizeFromText(jd);
  const fallback = fallbackStyle();

  if (!process.env.GEMINI_API_KEY) {
    if (!keywordSize) return null;
    return {
      interviewStyle: fallback,
      companySize: keywordSize,
      requirements: requirementsFromFocus(fallback.focus),
    };
  }

  const userPrompt = `
산업군: ${params.industryLabel}
채용공고/인재상 원문:
${jd.slice(0, 2000)}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: JD_MAP_SYSTEM,
    userPrompt,
    temperature: 0.3,
    maxOutputTokens: 450,
    timeoutMs: 6000,
  });

  if (!content) {
    if (!keywordSize) return null;
    return {
      interviewStyle: fallback,
      companySize: keywordSize,
      requirements: requirementsFromFocus(fallback.focus),
    };
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      tone?: unknown;
      rounds?: unknown;
      focus?: unknown;
      companySize?: unknown;
      requirements?: { skills?: unknown; keywords?: unknown };
    };

    const tone = typeof parsed.tone === "string" ? parsed.tone.trim().slice(0, 60) : "";
    const rounds = parseStringList(parsed.rounds, 4);
    const focus = parseStringList(parsed.focus, 6);

    let companySize: CompanySizeCode | null = keywordSize;
    if (
      typeof parsed.companySize === "string" &&
      VALID_SIZES.has(parsed.companySize as CompanySizeCode)
    ) {
      companySize = parsed.companySize as CompanySizeCode;
    }

    const reqSkills = parseStringList(parsed.requirements?.skills, 8);
    const reqKeywords = parseStringList(parsed.requirements?.keywords, 10);
    const requirements: JdRequirements = {
      skills: reqSkills.length > 0 ? reqSkills : focus.slice(0, 6),
      keywords:
        reqKeywords.length > 0
          ? reqKeywords
          : [...new Set([...focus, ...reqSkills])],
    };

    if (!tone || rounds.length === 0 || focus.length === 0) {
      if (!companySize) return null;
      return {
        interviewStyle: fallback,
        companySize,
        requirements: requirementsFromFocus(fallback.focus),
      };
    }

    return {
      interviewStyle: { tone, rounds, focus },
      companySize,
      requirements,
    };
  } catch (e) {
    console.error("[Gemini JD mapper] JSON parse 실패:", e);
    if (!keywordSize) return null;
    return {
      interviewStyle: fallback,
      companySize: keywordSize,
      requirements: requirementsFromFocus(fallback.focus),
    };
  }
}

function fallbackStyle(): CompanyContext["interviewStyle"] {
  return {
    tone: "균형형 (인성+직무)",
    rounds: ["1차 실무", "2차 임원"],
    focus: ["의사소통", "문제해결", "조직적합"],
  };
}

export function parseJdRequirements(raw: unknown): JdRequirements | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { skills?: unknown; keywords?: unknown };
  const skills = parseStringList(obj.skills, 20);
  const keywords = parseStringList(obj.keywords, 30);
  if (skills.length === 0 && keywords.length === 0) return null;
  return { skills, keywords };
}

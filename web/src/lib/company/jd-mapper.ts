/**
 * JD(채용공고)·인재상 매핑 — 세션 시작 시 1회만 호출.
 * 톤·라운드·중점 역량 + 기업 규모 단서를 함께 추출한다.
 */

import { generateGeminiText } from "@/lib/gemini/client";
import type { CompanyContext } from "@/types";
import {
  inferCompanySizeFromText,
  type CompanySizeCode,
} from "@/lib/company/company-size-presets";

export type JDMapResult = {
  interviewStyle: CompanyContext["interviewStyle"];
  companySize: CompanySizeCode | null;
};

const JD_MAP_SYSTEM = `당신은 한국 기업 채용공고(JD)·인재상 자료를 분석해 모의 면접 스타일을 요약하는 도우미입니다.
주어진 원문에서 이 회사/직무의 면접 톤, 예상 면접 라운드, 중점적으로 평가할 역량 키워드를 뽑고,
원문에 스타트업·중견·대기업·공공기관·공사 등 기업 규모 단서가 있으면 companySize도 추정하세요.
아래 JSON 형식으로만 답하세요. 원문에 실제로 있는 내용만 근거로 삼고, 지어낸 회사 실명을 추가하지 마세요.

{
  "tone": "면접 톤을 15자 내외로 요약",
  "rounds": ["예상 면접 라운드 1~4개"],
  "focus": ["중점 평가 역량 키워드 2~5개"],
  "companySize": "LARGE | MID | SMALL | STARTUP | PUBLIC 중 하나 또는 null"
}`;

const VALID_SIZES = new Set<CompanySizeCode>([
  "LARGE",
  "MID",
  "SMALL",
  "STARTUP",
  "PUBLIC",
]);

export async function deriveInterviewStyleFromJD(params: {
  jdText: string;
  industryLabel: string;
}): Promise<JDMapResult | null> {
  const jd = params.jdText.trim();
  if (!jd || jd.length < 15) return null;

  const keywordSize = inferCompanySizeFromText(jd);

  if (!process.env.GEMINI_API_KEY) {
    return keywordSize
      ? { interviewStyle: fallbackStyle(), companySize: keywordSize }
      : null;
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
    maxOutputTokens: 350,
    timeoutMs: 6000,
  });

  if (!content) {
    return keywordSize
      ? { interviewStyle: fallbackStyle(), companySize: keywordSize }
      : null;
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      tone?: unknown;
      rounds?: unknown;
      focus?: unknown;
      companySize?: unknown;
    };

    const tone = typeof parsed.tone === "string" ? parsed.tone.trim().slice(0, 60) : "";
    const rounds = Array.isArray(parsed.rounds)
      ? parsed.rounds
          .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
          .slice(0, 4)
      : [];
    const focus = Array.isArray(parsed.focus)
      ? parsed.focus
          .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
          .slice(0, 6)
      : [];

    let companySize: CompanySizeCode | null = keywordSize;
    if (
      typeof parsed.companySize === "string" &&
      VALID_SIZES.has(parsed.companySize as CompanySizeCode)
    ) {
      companySize = parsed.companySize as CompanySizeCode;
    }

    if (!tone || rounds.length === 0 || focus.length === 0) {
      return companySize
        ? { interviewStyle: fallbackStyle(), companySize }
        : null;
    }

    return {
      interviewStyle: { tone, rounds, focus },
      companySize,
    };
  } catch (e) {
    console.error("[Gemini JD mapper] JSON parse 실패:", e);
    return keywordSize
      ? { interviewStyle: fallbackStyle(), companySize: keywordSize }
      : null;
  }
}

function fallbackStyle(): CompanyContext["interviewStyle"] {
  return {
    tone: "균형형 (인성+직무)",
    rounds: ["1차 실무", "2차 임원"],
    focus: ["의사소통", "문제해결", "조직적합"],
  };
}

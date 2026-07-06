/**
 * JD(채용공고)·인재상 매핑 — HR 담당자/지원자가 채용공고 원문이나 인재상 키워드를 붙여넣으면
 * 그 회사·직무 전용 면접 스타일(톤·라운드·중점 역량)을 뽑아 TargetCompany.interviewStyle에
 * 저장한다. 세션 시작 시(질문마다가 아니라) 1회만 호출하므로 비용 원칙에 어긋나지 않는다.
 *
 * 실패하거나 API 키가 없으면 null을 반환 — 호출측은 기존 산업군/회사 프리셋으로 폴백한다.
 */

import { generateGeminiText } from "@/lib/gemini/client";
import type { CompanyContext } from "@/types";

const JD_MAP_SYSTEM = `당신은 한국 기업 채용공고(JD)·인재상 자료를 분석해 모의 면접 스타일을 요약하는 도우미입니다.
주어진 원문에서 이 회사/직무의 면접 톤, 예상 면접 라운드, 중점적으로 평가할 역량 키워드를 뽑아
아래 JSON 형식으로만 답하세요. 원문에 실제로 있는 내용만 근거로 삼고, 근거가 부족한 항목은
일반적인 값으로 채우세요. 지어낸 회사 실명이나 없는 사실을 추가하지 마세요.

{
  "tone": "면접 톤을 10자 내외로 요약 (예: 실무·데이터 중심)",
  "rounds": ["예상 면접 라운드 1~3개 (예: 실무 면접, 임원 면접)"],
  "focus": ["중점 평가 역량 키워드 2~4개 (예: 문제해결, 협업, 주도성)"]
}`;

export async function deriveInterviewStyleFromJD(params: {
  jdText: string;
  industryLabel: string;
}): Promise<CompanyContext["interviewStyle"] | null> {
  const jd = params.jdText.trim();
  if (!jd || jd.length < 15 || !process.env.GEMINI_API_KEY) return null;

  const userPrompt = `
산업군: ${params.industryLabel}
채용공고/인재상 원문:
${jd.slice(0, 2000)}
`.trim();

  const content = await generateGeminiText({
    systemInstruction: JD_MAP_SYSTEM,
    userPrompt,
    temperature: 0.3,
    maxOutputTokens: 300,
    timeoutMs: 6000,
  });

  if (!content) return null;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      tone?: unknown;
      rounds?: unknown;
      focus?: unknown;
    };

    const tone = typeof parsed.tone === "string" ? parsed.tone.trim().slice(0, 40) : "";
    const rounds = Array.isArray(parsed.rounds)
      ? parsed.rounds.filter((r): r is string => typeof r === "string" && r.trim()).slice(0, 4)
      : [];
    const focus = Array.isArray(parsed.focus)
      ? parsed.focus.filter((f): f is string => typeof f === "string" && f.trim()).slice(0, 5)
      : [];

    if (!tone || rounds.length === 0 || focus.length === 0) return null;

    return { tone, rounds, focus };
  } catch (e) {
    console.error("[Gemini JD mapper] JSON parse 실패:", e);
    return null;
  }
}

/**
 * 자소서 경험 문장 기반 보너스 질문 — 은행에 없는 즉석 질문(IRT 미포함).
 * jd-bonus-question.ts와 동일한 구조, 소스만 experiences.
 */

import { competencyLabel } from "@/lib/labels";
import { generateGeminiText } from "@/lib/gemini/client";
import { EXPERIENCE_METRIC_PATTERN, prioritizeExperiences } from "@/lib/interview/resume-summary";

const CLAIM_SYSTEM = `당신은 한국 기업 면접관입니다.
지원자 자소서에 적힌 경험 문장 중 하나를 골라, 그 안의 구체적 주장(수치·역할·성과)을
더 깊이 캐묻는 BEI(행동사건면접) 방식 질문 한 문장을 만듭니다.

절대 규칙:
- 제공된 경험 문장 목록에 **실제로 있는** 내용만 인용하세요. 없는 내용을 지어내지 마세요.
- "정말이냐/거짓말 아니냐" 같은 추궁 톤이 아니라, 실무 면접관이 디테일을 확인할 때 쓰는
  중립적이고 존중하는 톤으로 쓰세요("~에 대해 조금 더 구체적으로 말씀해 주시겠어요" 류).
- 질문 한 문장 안에 인용한 경험 문장의 핵심 구절을 「」로 그대로 넣으세요.
- 본인이 직접 한 행동·의사결정·수치를 끌어내는 질문이어야 합니다(단순 재진술 요구 금지).
- 존댓말, 100자 이내 권장.
- JSON만: {"question":"...","groundedClaim":"인용한 경험 문장 원문 그대로"}`;

export async function generateResumeClaimQuestion(params: {
  experiences: string[];
  competency: string;
}): Promise<{ question: string; groundedClaim: string } | null> {
  const candidates = prioritizeExperiences(params.experiences);
  if (candidates.length === 0) return null;

  const userPrompt = `
역량: ${competencyLabel(params.competency)}
자소서 경험 문장(아래에서 하나를 반드시 인용):
${candidates.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`.trim();

  if (!process.env.GEMINI_API_KEY) {
    const pick =
      candidates.find((e) => EXPERIENCE_METRIC_PATTERN.test(e)) ?? candidates[0];
    const snippet = pick.length > 36 ? `${pick.slice(0, 36)}…` : pick;
    return {
      question: `자소서에 적으신 「${snippet}」 경험에 대해, 본인이 직접 한 행동과 결과를 조금 더 구체적으로 말씀해 주시겠어요?`,
      groundedClaim: pick,
    };
  }

  const content = await generateGeminiText({
    systemInstruction: CLAIM_SYSTEM,
    userPrompt,
    temperature: 0.25,
    maxOutputTokens: 280,
    timeoutMs: 8000,
  });

  if (!content) return null;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      question?: string;
      groundedClaim?: string;
    };
    const question = parsed.question?.trim();
    const groundedClaim = parsed.groundedClaim?.trim();
    if (!question || !groundedClaim) return null;
    if (
      !isGroundedInExperiences(question, candidates) &&
      !candidates.some(
        (e) => groundedClaim.includes(e) || e.includes(groundedClaim),
      )
    ) {
      return null;
    }
    return { question, groundedClaim };
  } catch {
    return null;
  }
}

function isGroundedInExperiences(question: string, experiences: string[]): boolean {
  const q = question.replace(/\s+/g, "");
  for (const exp of experiences) {
    const compact = exp.replace(/\s+/g, "");
    if (compact.length >= 8 && q.includes(compact.slice(0, Math.min(compact.length, 24)))) {
      return true;
    }
    const quoted = [...question.matchAll(/[「"]([^」"]{3,50})[」"]/g)].map((m) => m[1]);
    if (
      quoted.some(
        (quote) =>
          exp.includes(quote) ||
          quote.includes(exp.slice(0, Math.min(exp.length, 12))),
      )
    ) {
      return true;
    }
  }
  return false;
}

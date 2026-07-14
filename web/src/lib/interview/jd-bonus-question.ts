/**
 * JD 요구사항 기반 보너스 질문 — 은행에 없는 즉석 질문(IRT 미포함).
 */

import { competencyLabel } from "@/lib/labels";
import { generateGeminiText } from "@/lib/gemini/client";
import type { JdRequirements } from "@/lib/company/jd-mapper";

const BONUS_SYSTEM = `당신은 한국 기업 면접관입니다.
채용공고(JD) 요구사항 중 하나를 인용해, 해당 역량을 검증하는 면접 질문 한 문장을 만듭니다.

절대 규칙:
- 제공된 JD 요구사항 목록에 **실제로 있는** 기술·키워드·역할만 인용하세요. 없는 내용을 지어내지 마세요.
- 질문 한 문장 안에 인용한 요구사항을 「」 또는 큰따옴표로 그대로 넣으세요.
- 존댓말, 100자 이내 권장.
- JSON만: {"question":"...","groundedRequirement":"인용한 JD 요구사항 한 줄"}`;

export async function generateJdBonusQuestion(params: {
  jdRequirements: JdRequirements;
  competency: string;
}): Promise<{ question: string; groundedRequirement: string } | null> {
  const terms = [
    ...params.jdRequirements.skills,
    ...params.jdRequirements.keywords,
  ].filter((t) => typeof t === "string" && t.trim().length >= 2);

  if (terms.length === 0) return null;

  const userPrompt = `
역량: ${competencyLabel(params.competency)}
JD 요구사항(아래에서 하나를 반드시 인용):
${terms.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`.trim();

  if (!process.env.GEMINI_API_KEY) {
    const pick = terms[0];
    return {
      question: `공고에 적힌 「${pick}」 요구사항과 관련해, 본인 경험을 구체적으로 말씀해 주세요.`,
      groundedRequirement: pick,
    };
  }

  const content = await generateGeminiText({
    systemInstruction: BONUS_SYSTEM,
    userPrompt,
    temperature: 0.25,
    maxOutputTokens: 320,
    timeoutMs: 18_000,
    task: "jd_bonus_question",
    responseMimeType: "application/json",
  });

  if (!content) return null;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      question?: string;
      groundedRequirement?: string;
    };
    const question = parsed.question?.trim();
    const groundedRequirement = parsed.groundedRequirement?.trim();
    if (!question || !groundedRequirement) return null;
    if (
      !isGroundedInJdTerms(question, terms) &&
      !terms.some(
        (t) => groundedRequirement.includes(t) || t.includes(groundedRequirement)
      )
    ) {
      return null;
    }
    return { question, groundedRequirement };
  } catch {
    return null;
  }
}

function isGroundedInJdTerms(question: string, terms: string[]): boolean {
  const q = question.replace(/\s+/g, "");
  for (const term of terms) {
    const compact = term.replace(/\s+/g, "");
    if (compact.length >= 3 && q.includes(compact)) return true;
    const quoted = [...question.matchAll(/[「"]([^」"]{3,50})[」"]/g)].map((m) => m[1]);
    if (
      quoted.some(
        (quote) =>
          term.includes(quote) ||
          quote.includes(term.slice(0, Math.min(term.length, 12)))
      )
    ) {
      return true;
    }
  }
  return false;
}

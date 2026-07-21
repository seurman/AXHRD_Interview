import { generateGeminiText } from "@/lib/gemini/client";
import { COMPANY_SIZE_PRESETS } from "@/lib/company/company-size-presets";
import { buildTripleLexiconHints } from "@/lib/competency/lexicon";
import { competencyLabel } from "@/lib/labels";

export type TripleLens = "LARGE" | "PUBLIC" | "STARTUP";

export interface TripleFeedbackCard {
  lens: TripleLens;
  verdict: string;
  comment: string;
}

export type TripleFeedbackResult = Record<TripleLens, TripleFeedbackCard>;

const LENSES: TripleLens[] = ["LARGE", "PUBLIC", "STARTUP"];

const LENS_UI_LABEL: Record<TripleLens, string> = {
  LARGE: "대기업",
  PUBLIC: "공공기관",
  STARTUP: "스타트업",
};

function buildSystemPrompt(competencyCode: string): string {
  const presetBlock = LENSES.map((lens) => {
    const p = COMPANY_SIZE_PRESETS[lens].interviewStyle;
    return `${lens} (${LENS_UI_LABEL[lens]}): tone="${p.tone}", focus=[${p.focus.join(", ")}]`;
  }).join("\n");

  const lexiconHints = buildTripleLexiconHints(competencyCode);

  return `당신은 한국 취업 면접 코치입니다. 동일한 면접 답변을 세 가지 조직 유형의 면접관 관점에서 각각 평가합니다.
점수(score)는 만들지 마세요 — verdict(한 줄 총평)와 comment(2~3문장 코칭)만 작성하세요.

관점 프리셋 (반드시 각 관점의 tone·focus를 반영해 서로 다르게 쓸 것):
${presetBlock}

역량 단어장 신호 (NCS·역량사전 기반 — 각 렌즈 comment에 해당 신호어/숙어를 1개 이상 명시):
${lexiconHints || "(일반 역량 신호 사용)"}

반드시 JSON만 출력:
{
  "LARGE": { "lens": "LARGE", "verdict": "...", "comment": "..." },
  "PUBLIC": { "lens": "PUBLIC", "verdict": "...", "comment": "..." },
  "STARTUP": { "lens": "STARTUP", "verdict": "...", "comment": "..." }
}`;
}

function fallbackTripleFeedback(params: {
  question: string;
  answer: string;
  competency: string;
}): TripleFeedbackResult {
  const label = competencyLabel(params.competency);
  const excerpt = params.answer.trim().slice(0, 80) || "(답변 없음)";
  const result = {} as TripleFeedbackResult;
  const hints = buildTripleLexiconHints(params.competency);

  for (const lens of LENSES) {
    const style = COMPANY_SIZE_PRESETS[lens].interviewStyle;
    const focusPhrase = style.focus.slice(0, 3).join("·");
    const lensLine =
      hints
        .split("\n")
        .find((l) => l.startsWith(`${lens}(`))
        ?.replace(/^[^:]+:\s*/, "") ?? focusPhrase;
    result[lens] = {
      lens,
      verdict: `${LENS_UI_LABEL[lens]} 관점 — ${label} 답변을 ${focusPhrase} 기준으로 검토했습니다.`,
      comment: `${style.tone}에 맞게, 답변("${excerpt}${params.answer.length > 80 ? "…" : ""}")에서 ${style.focus[0]}을(를) 보강하세요. 이 렌즈 신호: ${lensLine}`,
    };
  }

  return result;
}

function parseTripleJson(text: string): TripleFeedbackResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Record<string, Partial<TripleFeedbackCard>>;
    const result = {} as TripleFeedbackResult;
    for (const lens of LENSES) {
      const card = raw[lens];
      if (!card?.verdict?.trim() || !card?.comment?.trim()) return null;
      result[lens] = {
        lens,
        verdict: card.verdict.trim(),
        comment: card.comment.trim(),
      };
    }
    return result;
  } catch {
    return null;
  }
}

export async function generateTripleFeedback(params: {
  question: string;
  answer: string;
  competency: string;
}): Promise<TripleFeedbackResult> {
  const userPrompt = JSON.stringify(
    {
      competency: competencyLabel(params.competency),
      competencyCode: params.competency,
      question: params.question,
      answer: params.answer,
    },
    null,
    2,
  );

  const content = await generateGeminiText({
    systemInstruction: buildSystemPrompt(params.competency),
    userPrompt,
    temperature: 0.45,
    maxOutputTokens: 1200,
    timeoutMs: 45_000,
    task: "triple_feedback",
    responseMimeType: "application/json",
  });

  if (!content) {
    return fallbackTripleFeedback(params);
  }

  const parsed = parseTripleJson(content);
  return parsed ?? fallbackTripleFeedback(params);
}

export { LENS_UI_LABEL };

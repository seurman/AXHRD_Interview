/**
 * Web Speech API STT 오인식 교정 (예: "병목" → "병 먹고").
 * 원문(transcript)은 DB에 그대로 보존하고, 채점·인용 직전에만
 * 문맥상 가장 자연스러운 교정본을 만들어 사용한다.
 * 의미를 바꾸거나 내용을 보태지 않고, 발음이 비슷해 잘못 인식된
 * 단어만 문맥에 맞게 고치는 것이 목적이다.
 */

import { generateGeminiText } from "@/lib/gemini/client";

const CORRECT_SYSTEM = `당신은 한국어 음성 인식(STT) 오류 교정기입니다.
아래 텍스트는 브라우저 음성 인식으로 받아쓴 면접 답변이라 발음이 비슷한 단어로 잘못
인식된 부분이 있을 수 있습니다(예: "병목"이 "병 먹고"로, "구간"이 "간"으로 잘못 인식).

규칙:
- 명백한 오인식만 문맥에 맞게 교정하세요. 내용을 추가하거나 문장을 매끄럽게 다듬지 마세요.
- 의미가 이미 통하는 문장은 그대로 두세요.
- 답변에 실제로 없는 정보를 지어내지 마세요.
- 교정된 텍스트만 출력하세요. 설명이나 따옴표를 붙이지 마세요.`;

export async function correctTranscript(raw: string): Promise<string> {
  const text = raw?.trim();
  if (!text || text.length < 8) return raw;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return raw;

  const corrected = await generateGeminiText({
    systemInstruction: CORRECT_SYSTEM,
    userPrompt: text,
    temperature: 0.1,
    maxOutputTokens: Math.max(256, Math.ceil(text.length * 1.5)),
    timeoutMs: 8_000,
    task: "transcript_correct",
  });

  // 결과가 비정상적으로 짧거나(잘림) 너무 길면(내용 추가 의심) 원문을 그대로 사용
  if (!corrected) return raw;
  if (corrected.length < text.length * 0.5 || corrected.length > text.length * 1.8) {
    return raw;
  }

  return corrected;
}

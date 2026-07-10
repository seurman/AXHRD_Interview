/**
 * Gemini 2.5 Flash-Lite — 텍스트 생성 공용 클라이언트 (저비용 실시간 작업용)
 * generateContent REST 엔드포인트 사용 (Interactions API는 신규 프로젝트 권장이지만,
 * 원시 fetch 통합에는 응답 스키마가 안정적으로 문서화된 generateContent가 더 적합)
 * @see https://ai.google.dev/gemini-api/docs/generate-content/text-generation
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function generateGeminiText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash-lite";

  try {
    const res = await fetchWithTimeout(
      `${GEMINI_BASE}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
          systemInstruction: { parts: [{ text: params.systemInstruction }] },
          generationConfig: {
            temperature: params.temperature ?? 0.3,
            maxOutputTokens: params.maxOutputTokens ?? 512,
          },
        }),
        timeoutMs: params.timeoutMs ?? 8000,
        retries: 1,
      }
    );

    if (!res.ok) {
      console.error("[Gemini text] HTTP", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim() || null;
  } catch (e) {
    console.error("[Gemini text] 요청 실패(타임아웃/네트워크):", e);
    return null;
  }
}

/** 채용공고 이미지 등 — 멀티모달 OCR/텍스트 추출 */
export async function generateGeminiVisionText(params: {
  systemInstruction: string;
  userPrompt: string;
  imageBase64: string;
  mimeType: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_VISION_MODEL ?? process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash-lite";

  try {
    const res = await fetchWithTimeout(
      `${GEMINI_BASE}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: params.userPrompt },
                {
                  inlineData: {
                    mimeType: params.mimeType,
                    data: params.imageBase64,
                  },
                },
              ],
            },
          ],
          systemInstruction: { parts: [{ text: params.systemInstruction }] },
          generationConfig: {
            temperature: params.temperature ?? 0.1,
            maxOutputTokens: params.maxOutputTokens ?? 4096,
          },
        }),
        timeoutMs: params.timeoutMs ?? 25_000,
        retries: 0,
      },
    );

    if (!res.ok) {
      console.error("[Gemini vision] HTTP", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim() || null;
  } catch (e) {
    console.error("[Gemini vision] 요청 실패:", e);
    return null;
  }
}

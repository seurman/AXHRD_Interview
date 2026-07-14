/**
 * Gemini 텍스트/비전 공용 클라이언트.
 * 기본 모델은 flash-lite(저비용). 문장 품질이 중요한 첨삭은 generateGeminiQualityText(Pro) 사용.
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function generateGeminiText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** 생략 시 GEMINI_TEXT_MODEL 또는 flash-lite. 첨삭·고품질 서술 등은 상위 모델 지정. */
  model?: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model =
    params.model?.trim() ||
    process.env.GEMINI_TEXT_MODEL?.trim() ||
    "gemini-2.5-flash-lite";

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
      console.error("[Gemini text]", model, "HTTP", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim() || null;
  } catch (e) {
    console.error("[Gemini text]", model, "요청 실패(타임아웃/네트워크):", e);
    return null;
  }
}

/** 자소서 첨삭 등 문장 품질이 중요한 작업 — Pro 우선, 실패 시 Flash. */
export async function generateGeminiQualityText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string | null; modelUsed: string | null }> {
  const primary =
    process.env.GEMINI_RESUME_REVIEW_MODEL?.trim() || "gemini-2.5-pro";
  const fallback =
    process.env.GEMINI_RESUME_REVIEW_FALLBACK_MODEL?.trim() || "gemini-2.5-flash";
  const timeoutMs = params.timeoutMs ?? 45_000;

  const text = await generateGeminiText({ ...params, model: primary, timeoutMs });
  if (text) return { text, modelUsed: primary };

  if (fallback !== primary) {
    console.warn(`[Gemini] ${primary} 실패 → fallback ${fallback}`);
    const fb = await generateGeminiText({
      ...params,
      model: fallback,
      timeoutMs: Math.min(timeoutMs, 35_000),
    });
    if (fb) return { text: fb, modelUsed: fallback };
  }

  return { text: null, modelUsed: null };
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

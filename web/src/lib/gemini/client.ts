/**
 * Gemini 텍스트/비전 공용 클라이언트.
 * 기본 모델은 flash-lite(저비용). 문장 품질이 중요한 첨삭은 generateGeminiQualityText 사용.
 *
 * 주의: gemini-2.5-pro/flash는 thinking이 maxOutputTokens을 잡아먹어
 * 본문이 비는 경우가 많음 → thinkingBudget + 충분한 maxOutputTokens 필수.
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** candidates[].content.parts 에서 thought 아닌 텍스트만 합친다. */
export function extractGeminiVisibleText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const cand = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(cand) || !cand[0] || typeof cand[0] !== "object") return "";
  const content = (cand[0] as { content?: unknown; finishReason?: string }).content;
  if (!content || typeof content !== "object") return "";
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";

  const chunks: string[] = [];
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const p = part as { text?: unknown; thought?: unknown };
    if (p.thought === true) continue;
    if (typeof p.text === "string" && p.text.trim()) chunks.push(p.text);
  }
  return chunks.join("").trim();
}

function finishReasonOf(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const cand = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(cand) || !cand[0] || typeof cand[0] !== "object") return null;
  const fr = (cand[0] as { finishReason?: unknown }).finishReason;
  return typeof fr === "string" ? fr : null;
}

/**
 * Pro는 thinkingBudget 0 불가(최소 128). Flash 계열은 0으로 끌 수 있음.
 */
export function resolveThinkingBudget(model: string, requested?: number): number | undefined {
  const m = model.toLowerCase();
  if (requested != null && Number.isFinite(requested)) {
    if (m.includes("pro") && requested < 128) return 128;
    return Math.max(0, Math.floor(requested));
  }
  if (m.includes("pro")) return 1024;
  if (m.includes("flash-lite")) return undefined; // 기본 off
  if (m.includes("flash")) return 0; // 품질 경로에서 flash는 thinking 끄고 출력 확보
  return undefined;
}

export async function generateGeminiText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** 생략 시 GEMINI_TEXT_MODEL 또는 flash-lite */
  model?: string;
  /** JSON 강제 (첨삭 등) */
  responseMimeType?: "application/json" | "text/plain";
  /** thinking 토큰 상한. Pro 최소 128, Flash는 0 가능 */
  thinkingBudget?: number;
  retries?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model =
    params.model?.trim() ||
    process.env.GEMINI_TEXT_MODEL?.trim() ||
    "gemini-2.5-flash-lite";

  const thinkingBudget = resolveThinkingBudget(model, params.thinkingBudget);
  const maxOutputTokens = params.maxOutputTokens ?? 512;

  const generationConfig: Record<string, unknown> = {
    temperature: params.temperature ?? 0.3,
    maxOutputTokens,
  };
  if (params.responseMimeType) {
    generationConfig.responseMimeType = params.responseMimeType;
  }
  if (thinkingBudget != null) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }

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
          generationConfig,
        }),
        timeoutMs: params.timeoutMs ?? 8000,
        retries: params.retries ?? 1,
      }
    );

    if (!res.ok) {
      console.error("[Gemini text]", model, "HTTP", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = extractGeminiVisibleText(data);
    if (!text) {
      console.error(
        "[Gemini text]",
        model,
        "빈 본문",
        "finishReason=",
        finishReasonOf(data),
        "thinkingBudget=",
        thinkingBudget,
        "maxOutputTokens=",
        maxOutputTokens
      );
      return null;
    }
    return text;
  } catch (e) {
    console.error("[Gemini text]", model, "요청 실패(타임아웃/네트워크):", e);
    return null;
  }
}

/**
 * 자소서 첨삭 등 문장 품질 경로.
 * Pro(thinking 제한 + 큰 출력) → 실패 시 Flash(thinking off).
 */
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
  const timeoutMs = params.timeoutMs ?? 55_000;
  // thinking + JSON 본문 여유 (Pro가 thinking에 토큰을 다 쓰는 문제 방지)
  const maxOutputTokens = params.maxOutputTokens ?? 16384;

  const text = await generateGeminiText({
    ...params,
    model: primary,
    timeoutMs,
    maxOutputTokens,
    responseMimeType: "application/json",
    thinkingBudget: resolveThinkingBudget(primary, 1024),
    retries: 0,
  });
  if (text) return { text, modelUsed: primary };

  if (fallback !== primary) {
    console.warn(`[Gemini] ${primary} 실패 → fallback ${fallback}`);
    const fb = await generateGeminiText({
      ...params,
      model: fallback,
      timeoutMs: Math.min(timeoutMs, 40_000),
      maxOutputTokens,
      responseMimeType: "application/json",
      thinkingBudget: 0,
      retries: 0,
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
    const text = extractGeminiVisibleText(data);
    return text || null;
  } catch (e) {
    console.error("[Gemini vision] 요청 실패:", e);
    return null;
  }
}

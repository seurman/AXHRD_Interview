/**
 * Gemini 텍스트/비전 공용 클라이언트.
 *
 * 첨삭(고품질)은 generateGeminiQualityText 사용.
 * 2026-07 기준 일부 키에서 gemini-2.5-pro는 429, gemini-2.5-flash는 404가 나므로
 * flash-latest / 3.1-flash-lite 등 가용 모델 체인을 탄다.
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** candidates[].content.parts 에서 thought 아닌 텍스트만 합친다. */
export function extractGeminiVisibleText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const cand = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(cand) || !cand[0] || typeof cand[0] !== "object") return "";
  const content = (cand[0] as { content?: unknown }).content;
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
 * Pro 계열에 thinkingBudget 적용.
 * gemini-pro-latest / 3.x pro 별칭 포함. flash에는 넣지 않음.
 */
export function resolveThinkingBudget(model: string, requested?: number): number | undefined {
  const m = model.toLowerCase();
  const isFlash = m.includes("flash");
  const isPro =
    (!isFlash && m.includes("pro")) ||
    m === "gemini-pro-latest" ||
    m.includes("pro-preview") ||
    m.includes("pro-latest");
  if (!isPro) {
    if (requested === 0 && m.includes("2.5-flash") && !m.includes("lite")) {
      return 0;
    }
    return undefined;
  }
  if (requested != null && Number.isFinite(requested)) {
    return Math.max(128, Math.floor(requested));
  }
  return 1024;
}

export type GeminiTextAttempt = {
  text: string | null;
  model: string;
  status: number | null;
  error: string | null;
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function generateGeminiTextAttempt(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  model?: string;
  responseMimeType?: "application/json" | "text/plain";
  thinkingBudget?: number;
  retries?: number;
}): Promise<GeminiTextAttempt> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model =
    params.model?.trim() ||
    process.env.GEMINI_TEXT_MODEL?.trim() ||
    "gemini-flash-lite-latest";

  if (!apiKey) {
    return { text: null, model, status: null, error: "GEMINI_API_KEY missing" };
  }

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

  const retries = params.retries ?? 1;
  let lastStatus: number | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
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
          retries: 0,
        }
      );

      lastStatus = res.status;
      const raw = await res.text();
      if (!res.ok) {
        lastError = raw.slice(0, 240).replace(/\s+/g, " ");
        const retryable = res.status === 429 || res.status === 503;
        if (retryable && attempt < retries) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        console.error("[Gemini text]", model, "HTTP", res.status, lastError);
        return { text: null, model, status: res.status, error: `HTTP ${res.status}` };
      }

      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return { text: null, model, status: res.status, error: "invalid JSON body" };
      }

      const text = extractGeminiVisibleText(data);
      if (!text) {
        const fr = finishReasonOf(data);
        lastError = `empty body finishReason=${fr}`;
        console.error("[Gemini text]", model, lastError, "maxOutputTokens=", maxOutputTokens);
        return { text: null, model, status: res.status, error: lastError };
      }
      return { text, model, status: res.status, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error("[Gemini text]", model, "요청 실패:", lastError);
      if (attempt < retries) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      return { text: null, model, status: lastStatus, error: lastError };
    }
  }

  return { text: null, model, status: lastStatus, error: lastError };
}

export async function generateGeminiText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  model?: string;
  responseMimeType?: "application/json" | "text/plain";
  thinkingBudget?: number;
  retries?: number;
}): Promise<string | null> {
  const result = await generateGeminiTextAttempt(params);
  return result.text;
}

/** 첨삭용 모델 체인 — Pro(latest) 우선, 실패 시 flash 계열로 폴백. */
export function resumeReviewModelChain(): string[] {
  const preferred = process.env.GEMINI_RESUME_REVIEW_MODEL?.trim();
  const fallback = process.env.GEMINI_RESUME_REVIEW_FALLBACK_MODEL?.trim();
  const chain = [
    // gemini-2.5-pro는 신규 키에서 404인 경우가 많음 → pro-latest가 유료 Pro 엔트리
    preferred || "gemini-pro-latest",
    "gemini-3.1-pro-preview",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    fallback || "gemini-flash-lite-latest",
  ].filter((m): m is string => Boolean(m && m.length > 0));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of chain) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

/**
 * 자소서 첨삭 등 문장 품질 경로 — 가용 모델을 순서대로 시도.
 */
export async function generateGeminiQualityText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string | null; modelUsed: string | null; attempts: string }> {
  const models = resumeReviewModelChain();
  const maxOutputTokens = params.maxOutputTokens ?? 8192;
  const baseTimeout = params.timeoutMs ?? 70_000;
  const attemptLogs: string[] = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    // 뒤쪽 lite는 짧게, 앞쪽 quality는 길게
    const timeoutMs = i === 0 ? baseTimeout : Math.min(45_000, baseTimeout);
    const attempt = await generateGeminiTextAttempt({
      ...params,
      model,
      timeoutMs,
      maxOutputTokens,
      responseMimeType: "application/json",
      retries: model.includes("lite") ? 1 : 0,
    });

    if (attempt.text) {
      console.info("[Gemini quality] ok:", model);
      return { text: attempt.text, modelUsed: model, attempts: attemptLogs.join(" | ") };
    }

    const log = `${model}:${attempt.error ?? "fail"}`;
    attemptLogs.push(log);
    console.warn("[Gemini quality] skip", log);
  }

  return {
    text: null,
    modelUsed: null,
    attempts: attemptLogs.join(" | ") || "no models",
  };
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

  const model =
    process.env.GEMINI_VISION_MODEL ??
    process.env.GEMINI_TEXT_MODEL ??
    "gemini-flash-lite-latest";

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

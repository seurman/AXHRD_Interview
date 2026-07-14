/**
 * Gemini 텍스트/비전 공용 클라이언트.
 *
 * 티어 라우팅: lib/gemini/model-tiers.ts
 * - lite / standard / pro (면접·자소서 체감 품질은 Pro)
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import {
  defaultMaxTokensForTier,
  defaultTimeoutForTier,
  modelChainForTier,
  GEMINI_TASK_TIER,
  type GeminiModelTier,
  type GeminiTask,
} from "@/lib/gemini/model-tiers";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export {
  GEMINI_TASK_TIER,
  modelChainForTier,
  type GeminiModelTier,
  type GeminiTask,
} from "@/lib/gemini/model-tiers";

/** @deprecated → modelChainForTier("pro") */
export function resumeReviewModelChain(): string[] {
  return modelChainForTier("pro");
}
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
  tier?: GeminiModelTier;
  task?: GeminiTask;
}): Promise<string | null> {
  if (params.tier || params.task) {
    const result = await generateGeminiForTier({
      systemInstruction: params.systemInstruction,
      userPrompt: params.userPrompt,
      tier: params.tier,
      task: params.task,
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
      timeoutMs: params.timeoutMs,
      responseMimeType: params.responseMimeType,
    });
    return result.text;
  }
  const result = await generateGeminiTextAttempt(params);
  return result.text;
}

/**
 * 티어 체인으로 텍스트 생성.
 */
export async function generateGeminiForTier(params: {
  systemInstruction: string;
  userPrompt: string;
  tier?: GeminiModelTier;
  task?: GeminiTask;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseMimeType?: "application/json" | "text/plain";
}): Promise<{
  text: string | null;
  modelUsed: string | null;
  attempts: string;
  tier: GeminiModelTier;
}> {
  const tier: GeminiModelTier =
    params.tier ?? (params.task ? GEMINI_TASK_TIER[params.task] : "lite");
  const models = modelChainForTier(tier);
  const maxOutputTokens = params.maxOutputTokens ?? defaultMaxTokensForTier(tier);
  const baseTimeout = params.timeoutMs ?? defaultTimeoutForTier(tier);
  const attemptLogs: string[] = [];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const timeoutMs =
      i === 0 ? baseTimeout : Math.min(baseTimeout, tier === "pro" ? 45_000 : 20_000);
    const attempt = await generateGeminiTextAttempt({
      systemInstruction: params.systemInstruction,
      userPrompt: params.userPrompt,
      temperature: params.temperature,
      model,
      timeoutMs,
      maxOutputTokens,
      responseMimeType: params.responseMimeType,
      retries: model.includes("lite") ? 1 : 0,
    });

    if (attempt.text) {
      console.info(`[Gemini ${tier}] ok:`, model);
      return {
        text: attempt.text,
        modelUsed: model,
        attempts: attemptLogs.join(" | "),
        tier,
      };
    }
    const log = `${model}:${attempt.error ?? "fail"}`;
    attemptLogs.push(log);
    console.warn(`[Gemini ${tier}] skip`, log);
  }

  return {
    text: null,
    modelUsed: null,
    attempts: attemptLogs.join(" | ") || "no models",
    tier,
  };
}

/** 첨삭 등 — Pro 티어 */
export async function generateGeminiQualityText(params: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string | null; modelUsed: string | null; attempts: string }> {
  const result = await generateGeminiForTier({
    ...params,
    tier: "pro",
    maxOutputTokens: params.maxOutputTokens ?? 8192,
    timeoutMs: params.timeoutMs ?? 70_000,
    responseMimeType: "application/json",
  });
  return {
    text: result.text,
    modelUsed: result.modelUsed,
    attempts: result.attempts,
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
    modelChainForTier("lite")[0] ??
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

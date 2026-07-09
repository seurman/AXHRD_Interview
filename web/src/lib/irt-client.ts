import {
  COMPETENCY_SESSION_MAX_ITEMS,
  COMPETENCY_SESSION_MIN_ITEMS,
} from "@/lib/interview/session-limits";
import type {
  CompetencyState,
  CompetencySummary,
  ItemParams,
  NextItem,
  SessionSummary,
  SubmitResponseResult,
} from "@/types";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const IRT_BASE = process.env.IRT_ENGINE_URL ?? "http://localhost:8000";

/** Render Free tier 슬립 후 첫 요청은 30~60초 걸릴 수 있음 */
const IRT_TIMEOUT_MS = 55_000;
const IRT_RETRIES = 2;

async function irtFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${IRT_BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs: IRT_TIMEOUT_MS,
    retries: IRT_RETRIES,
    retryDelayMs: 800,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IRT Engine error: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function initIrtSession(
  params: {
    sessionId: string;
    competencies: string[];
    itemPool: ItemParams[];
    priorTheta?: Record<string, number>;
    focusCompetency?: string;
    mode?: "competency" | "full";
    minItems?: number;
    maxItems?: number;
  },
  opts?: { timeoutMs?: number; retries?: number },
): Promise<{
  competency_states: Record<string, CompetencyState>;
  next_item: NextItem | null;
}> {
  const timeoutMs = opts?.timeoutMs ?? IRT_TIMEOUT_MS;
  const retries = opts?.retries ?? IRT_RETRIES;
  const res = await fetchWithTimeout(`${IRT_BASE}/api/v1/session/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: params.sessionId,
      competencies: params.competencies,
      item_pool: params.itemPool,
      prior_theta: params.priorTheta ?? {},
      focus_competency: params.focusCompetency,
      mode: params.mode ?? "competency",
      min_items: params.minItems ?? COMPETENCY_SESSION_MIN_ITEMS,
      max_items: params.maxItems ?? COMPETENCY_SESSION_MAX_ITEMS,
    }),
    timeoutMs,
    retries,
    retryDelayMs: 800,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IRT Engine error: ${res.status} ${text}`);
  }

  return res.json() as Promise<{
    competency_states: Record<string, CompetencyState>;
    next_item: NextItem | null;
  }>;
}

export async function submitIrtResponse(params: {
  sessionId: string;
  itemId: string;
  competency: string;
  rubricScore: number;
  itemPool: ItemParams[];
  administeredIds: string[];
  competencyStates: Record<string, CompetencyState>;
  focusCompetency?: string;
  mode?: "competency" | "full";
  minItems?: number;
  maxItems?: number;
}): Promise<SubmitResponseResult> {
  return irtFetch("/session/respond", {
    session_id: params.sessionId,
    item_id: params.itemId,
    competency: params.competency,
    rubric_score: params.rubricScore,
    item_pool: params.itemPool,
    administered_ids: params.administeredIds,
    competency_states: params.competencyStates,
    focus_competency: params.focusCompetency,
    mode: params.mode ?? "competency",
    min_items: params.minItems ?? 2,
    max_items: params.maxItems ?? 3,
  });
}

export async function getIrtSessionSummary(params: {
  sessionId: string;
  competencyStates: Record<string, CompetencyState>;
}): Promise<SessionSummary> {
  return irtFetch("/session/summary", {
    session_id: params.sessionId,
    competency_states: params.competencyStates,
  });
}

export async function checkIrtHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${IRT_BASE}/api/v1/health`, {
      timeoutMs: IRT_TIMEOUT_MS,
      retries: IRT_RETRIES,
      retryDelayMs: 800,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function warmIrtEngine(): Promise<{ ok: boolean; elapsedMs: number }> {
  const started = Date.now();
  const ok = await checkIrtHealth();
  return { ok, elapsedMs: Date.now() - started };
}

export type { CompetencySummary };

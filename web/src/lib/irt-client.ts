import type {
  CompetencyState,
  CompetencySummary,
  ItemParams,
  NextItem,
  SessionSummary,
  SubmitResponseResult,
} from "@/types";

const IRT_BASE = process.env.IRT_ENGINE_URL ?? "http://localhost:8000";

async function irtFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${IRT_BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IRT Engine error: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function initIrtSession(params: {
  sessionId: string;
  competencies: string[];
  itemPool: ItemParams[];
  priorTheta?: Record<string, number>;
  focusCompetency?: string;
  mode?: "competency" | "full";
  minItems?: number;
  maxItems?: number;
}): Promise<{
  competency_states: Record<string, CompetencyState>;
  next_item: NextItem | null;
}> {
  return irtFetch("/session/init", {
    session_id: params.sessionId,
    competencies: params.competencies,
    item_pool: params.itemPool,
    prior_theta: params.priorTheta ?? {},
    focus_competency: params.focusCompetency,
    mode: params.mode ?? "competency",
    min_items: params.minItems ?? 2,
    max_items: params.maxItems ?? 3,
  });
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
    const res = await fetch(`${IRT_BASE}/api/v1/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export type { CompetencySummary };

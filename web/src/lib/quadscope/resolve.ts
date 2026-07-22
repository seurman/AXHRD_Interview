/**
 * Resolve QuadScope for a competency code.
 * Prefer lexicon.scorecardScope; fall back to COMPETENCY_TO_QUADSCOPE.
 * Safe for server + admin; client badges can use COMPETENCY_TO_QUADSCOPE directly.
 */
import { COMPETENCY_TO_QUADSCOPE, type QuadScopeId } from "@/lib/quadscope/scopes";

const VALID: QuadScopeId[] = ["judgment", "delivery", "relations", "anchor"];

function asScope(v: unknown): QuadScopeId | null {
  return typeof v === "string" && (VALID as string[]).includes(v)
    ? (v as QuadScopeId)
    : null;
}

export function resolveQuadScope(competencyCode: string): QuadScopeId | null {
  try {
    // Dynamic import avoided — lexicon is JSON SSoT used on server/admin
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLexiconEntry } = require("@/lib/competency/lexicon") as typeof import("@/lib/competency/lexicon");
    const entry = getLexiconEntry(competencyCode);
    const fromLex = asScope(entry?.scorecardScope);
    if (fromLex) return fromLex;
  } catch {
    /* client bundle without lexicon path */
  }
  return COMPETENCY_TO_QUADSCOPE[competencyCode] ?? null;
}

/** Client-safe resolver (map only) */
export function resolveQuadScopeClient(competencyCode: string): QuadScopeId | null {
  return COMPETENCY_TO_QUADSCOPE[competencyCode] ?? null;
}

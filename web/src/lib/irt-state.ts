import type { CompetencyState } from "@/types";

export interface PersonalizedQuestionEntry {
  text: string;
  /** 이 질문을 채점할 때 사용할 맞춤 루브릭(3~4개 기준). 클라이언트에는 노출하지 않는다. */
  rubric?: string[];
}

export interface StoredIrtState {
  competencies: Record<string, CompetencyState>;
  nextItemId?: string;
  administeredIds: string[];
  focusCompetency?: string;
  planId?: string;
  personalizedQuestions?: Record<string, PersonalizedQuestionEntry>;
  /** 세션 전체에서 이미 질문에 인용된 자소서 문장 — 동일 사례 반복 인용을 막기 위해 추적 */
  usedHighlights?: string[];
}

function normalizePersonalizedQuestions(
  raw: unknown
): Record<string, PersonalizedQuestionEntry> | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const entries = Object.entries(raw as Record<string, unknown>).map(([id, val]) => {
    // 레거시 포맷: externalId -> string
    if (typeof val === "string") return [id, { text: val }] as const;
    if (val && typeof val === "object" && "text" in val) {
      return [id, val as PersonalizedQuestionEntry] as const;
    }
    return [id, { text: "" }] as const;
  });

  return Object.fromEntries(entries);
}

export function parseIrtState(raw: unknown): StoredIrtState {
  if (!raw || typeof raw !== "object") {
    return { competencies: {}, administeredIds: [] };
  }

  const obj = raw as Record<string, unknown>;

  // New wrapped format
  if ("competencies" in obj && typeof obj.competencies === "object") {
    return {
      competencies: obj.competencies as Record<string, CompetencyState>,
      nextItemId: obj.nextItemId as string | undefined,
      administeredIds: (obj.administeredIds as string[]) ?? [],
      focusCompetency: obj.focusCompetency as string | undefined,
      planId: obj.planId as string | undefined,
      personalizedQuestions: normalizePersonalizedQuestions(obj.personalizedQuestions),
      usedHighlights: (obj.usedHighlights as string[]) ?? [],
    };
  }

  // Legacy: flat competency map
  const competencies = obj as Record<string, CompetencyState>;
  return { competencies, administeredIds: [] };
}

export function serializeIrtState(state: StoredIrtState): object {
  return {
    competencies: state.competencies,
    nextItemId: state.nextItemId,
    administeredIds: state.administeredIds,
    focusCompetency: state.focusCompetency,
    planId: state.planId,
    personalizedQuestions: state.personalizedQuestions,
    usedHighlights: state.usedHighlights,
  };
}

export function defaultCompetencyStates(
  codes: readonly string[]
): Record<string, CompetencyState> {
  return Object.fromEntries(
    codes.map((c) => [
      c,
      {
        competency: c,
        theta: 0,
        standard_error: 1,
        current_level: 2,
        response_count: 0,
      },
    ])
  );
}

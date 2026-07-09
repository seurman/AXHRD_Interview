import type { CompetencyState } from "@/types";
import type { RubricResult } from "@/lib/gemini/evaluate";

export interface PersonalizedQuestionEntry {
  text: string;
  /** 이 질문을 채점할 때 사용할 맞춤 루브릭(3~4개 기준). 클라이언트에는 노출하지 않는다. */
  rubric?: string[];
  /** 자소서 인용으로 실제 개인화된 문항인지(true) — 일반 질문(스킵)이면 false/undefined.
   *  "자소서 맞춤 질문" 배지 표시 여부를 텍스트 비교가 아니라 이 값으로 판단한다. */
  resumePersonalized?: boolean;
  /** UI에 보여줄 자소서 근거 구절(질문↔자소서 연결 증명) */
  resumeAnchors?: string[];
}

/** 현재 문항에 대해 꼬리질문을 낸 뒤, 그 답변을 기다리는 동안의 임시 상태.
 *  꼬리질문 답변이 제출되면 이 값을 사용해 원 답변 + 꼬리질문 답변을 함께
 *  최종 평가하고, IRT 엔진 호출 및 기록을 남긴 뒤 비운다. */
export interface PendingFollowUp {
  questionId: string;
  followUpQuestion: string;
  originalTranscript: string;
  originalCorrectedTranscript: string | null;
  originalScore: number;
  originalDimensions: RubricResult["dimensions"];
  originalBriefFeedback: string;
  originalDurationSec: number | null;
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
  /** 세션 전체에서 이미 질문에 인용된 JD 키워드/스킬 */
  usedJdTerms?: string[];
  /** JD 보너스 질문 대기 중(정규 문항 종료 후) */
  pendingBonusQuestion?: {
    question: string;
    groundedRequirement: string;
  };
  /** 보너스 질문을 이미 제시했는지 */
  bonusQuestionOffered?: boolean;
  /** 진행 중인 꼬리질문이 있으면 채워짐, 없으면 undefined */
  pendingFollowUp?: PendingFollowUp;
  /** 세션에서 이미 꼬리질문을 한 번 썼는지 — 세션당 최대 1회 */
  followUpUsed?: boolean;
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
      usedJdTerms: (obj.usedJdTerms as string[]) ?? [],
      pendingBonusQuestion: obj.pendingBonusQuestion as StoredIrtState["pendingBonusQuestion"],
      bonusQuestionOffered: obj.bonusQuestionOffered === true,
      pendingFollowUp: obj.pendingFollowUp as PendingFollowUp | undefined,
      followUpUsed: obj.followUpUsed === true,
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
    usedJdTerms: state.usedJdTerms,
    pendingBonusQuestion: state.pendingBonusQuestion,
    bonusQuestionOffered: state.bonusQuestionOffered,
    pendingFollowUp: state.pendingFollowUp,
    followUpUsed: state.followUpUsed,
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

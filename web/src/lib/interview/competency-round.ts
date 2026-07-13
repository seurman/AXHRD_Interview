import { competencyLabel } from "@/lib/labels";
import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";
import {
  clampQuestionCount,
  questionsPerCompetencyForRound,
  type TimeBudgetMinutes,
} from "@/lib/interview/session-limits";

export type PrepMode = "COMPETENCY_SET" | "COMPANY_TARGET";

export type RoundBrief = {
  competencies: string[];
  timeBudgetMinutes: number | null;
  prepMode: PrepMode | null;
  completedAt: string;
  strengthsText: string;
  improvementsText: string;
  strengthBullets: string[];
  improvementBullets: string[];
};

export function parseCompetencyQueue(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    .map((c) => c.trim().toUpperCase());
}

export function filterQueueByProgress(
  queue: readonly string[],
  progress: Array<{ competency: string; status: string }>,
): string[] {
  const completed = new Set(
    progress.filter((p) => p.status === "COMPLETED").map((p) => p.competency),
  );
  return queue.filter((code) => !completed.has(code));
}

export function resolveRoundQuestionCount(params: {
  timeBudgetMinutes?: number | null;
  questionCount?: number | null;
  roundSize: number;
}): number {
  if (params.timeBudgetMinutes && params.roundSize > 0) {
    return questionsPerCompetencyForRound(
      params.timeBudgetMinutes as TimeBudgetMinutes,
      params.roundSize,
    );
  }
  return clampQuestionCount(params.questionCount ?? undefined);
}

export function buildRoundBriefFromFeedbacks(
  feedbacks: Array<{
    competency: string;
    strengths: unknown;
    improvements: unknown;
    summary: string;
  }>,
  meta: {
    competencies: string[];
    timeBudgetMinutes: number | null;
    prepMode: PrepMode | null;
  },
): RoundBrief {
  const strengthBullets: string[] = [];
  const improvementBullets: string[] = [];

  for (const fb of feedbacks) {
    const strengths = Array.isArray(fb.strengths)
      ? (fb.strengths as string[]).filter(Boolean)
      : [];
    const improvements = Array.isArray(fb.improvements)
      ? (fb.improvements as string[]).filter(Boolean)
      : [];
    if (strengths[0]) {
      strengthBullets.push(`[${competencyLabel(fb.competency)}] ${strengths[0]}`);
    }
    if (improvements[0]) {
      improvementBullets.push(`[${competencyLabel(fb.competency)}] ${improvements[0]}`);
    }
  }

  const strengthsText =
    strengthBullets.length > 0
      ? strengthBullets.join(" ")
      : "이번 차수에서 두드러진 강점 패턴을 더 쌓아 보세요.";
  const improvementsText =
    improvementBullets.length > 0
      ? improvementBullets.join(" ")
      : "다음 차수에서는 답변에 수치·본인 행동·결과를 한 문장씩 더 넣어 보세요.";

  return {
    competencies: meta.competencies,
    timeBudgetMinutes: meta.timeBudgetMinutes,
    prepMode: meta.prepMode,
    completedAt: new Date().toISOString(),
    strengthsText,
    improvementsText,
    strengthBullets,
    improvementBullets,
  };
}

export function isValidPrepMode(value: unknown): value is PrepMode {
  return value === "COMPETENCY_SET" || value === "COMPANY_TARGET";
}

export function inferPrepMode(params: {
  prepMode?: unknown;
  hasCompanyTarget: boolean;
}): PrepMode {
  if (isValidPrepMode(params.prepMode)) return params.prepMode;
  return params.hasCompanyTarget ? "COMPANY_TARGET" : "COMPETENCY_SET";
}

export function normalizeRoundCompetencies(
  focus: string | undefined,
  queued: string[] | undefined,
  allowed?: readonly string[],
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (code: string | undefined) => {
    const c = code?.trim().toUpperCase();
    if (!c || seen.has(c)) return;
    if (allowed && !allowed.includes(c)) return;
    if (!COMPETENCY_CODES.includes(c as CompetencyCode)) return;
    seen.add(c);
    ordered.push(c);
  };
  push(focus);
  for (const code of queued ?? []) push(code);
  return ordered;
}

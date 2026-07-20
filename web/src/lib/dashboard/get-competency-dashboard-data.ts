import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";
import { getUserStrengthDeck } from "@/lib/discover/user-strengths";
import { buildCareerQuests } from "@/lib/dashboard/quests";
import { buildDimensionTimeline } from "@/lib/dashboard/dimension-timeline";
import {
  averageDimensions,
  normalizeAnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import type { RoundBrief } from "@/lib/interview/competency-round";
import { interviewSessionHref } from "@/lib/interview/session-href";
import type { QuestItem } from "@/components/dashboard/QuestPanel";
import type { CoachInsightsPayload } from "@/components/dashboard/CoachInsightsPanel";
import type { DiscoverInterviewAdvice, DiscoverStrengthItem } from "@/types/discover";
import type { DimensionSessionPoint } from "@/lib/dashboard/dimension-timeline";

export type CompetencyLatest = {
  theta: number;
  percentile: number;
  levelEst: number;
  assessed: boolean;
};

export type CompetencySnapshotRow = {
  competency: string;
  theta: number;
  percentile: number;
  recordedAt: string;
  sessionNumber: number;
};

export type CompetencyDashboardPayload = {
  userName: string;
  snapshots: CompetencySnapshotRow[];
  latestByCompetency: Record<string, CompetencyLatest>;
  sessionCount: number;
  dimensionTimeline: DimensionSessionPoint[];
  quests: QuestItem[];
  totalXp: number;
  level: number;
  strengthDeck: {
    strengths: DiscoverStrengthItem[];
    interviewAdvice: DiscoverInterviewAdvice[];
    totalDiscovered: number;
    reportHref: string;
  } | null;
  hasDashboardContent: boolean;
  coachInsights: CoachInsightsPayload;
};

/** 개인 홈 대시보드·기관 코칭 뷰가 공유하는 역량 데이터 조회 */
export async function getCompetencyDashboardData(
  userId: string,
): Promise<CompetencyDashboardPayload | null> {
  const full = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sessions: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 6,
        select: {
          id: true,
          sessionNumber: true,
          completedAt: true,
          startedAt: true,
          createdAt: true,
          focusCompetency: true,
        },
      },
      competencyLogs: { orderBy: { recordedAt: "asc" } },
      selfDiscoverySessions: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 4,
      },
    },
  });

  if (!full) return null;

  const strengthDeck = await getUserStrengthDeck(userId);

  const dimensionResponses = await prisma.responseRecord.findMany({
    where: {
      session: { userId, status: "COMPLETED" },
      isBonusQuestion: false,
      dimensions: { not: Prisma.DbNull },
    },
    select: {
      dimensions: true,
      session: { select: { sessionNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const dimensionTimeline = buildDimensionTimeline(
    dimensionResponses.map((r) => ({
      dimensions: r.dimensions,
      sessionNumber: r.session.sessionNumber,
    })),
  );

  const sessionIds = [...new Set(full.competencyLogs.map((log) => log.sessionId))];
  const sessions =
    sessionIds.length > 0
      ? await prisma.interviewSession.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, sessionNumber: true },
        })
      : [];
  const sessionNumberById = new Map(sessions.map((s) => [s.id, s.sessionNumber]));

  const snapshots: CompetencySnapshotRow[] = full.competencyLogs.map((log) => ({
    competency: log.competency,
    theta: log.theta,
    percentile: log.percentile,
    recordedAt: log.recordedAt.toISOString(),
    sessionNumber: sessionNumberById.get(log.sessionId) ?? 0,
  }));

  const latestByCompetency: Record<string, CompetencyLatest> = {};

  for (const log of [...full.competencyLogs].reverse()) {
    if (!latestByCompetency[log.competency]) {
      latestByCompetency[log.competency] = {
        theta: log.theta,
        percentile: log.percentile,
        levelEst: log.levelEst,
        assessed: true,
      };
    }
  }

  for (const code of COMPETENCY_CODES) {
    if (!latestByCompetency[code]) {
      latestByCompetency[code] = {
        theta: 0,
        percentile: 0,
        levelEst: 0,
        assessed: false,
      };
    }
  }

  const assessedEntries = Object.entries(latestByCompetency).filter(([, v]) => v.assessed);
  const weakest = assessedEntries.sort((a, b) => a[1].percentile - b[1].percentile)[0];

  const { quests, totalXp, level } = buildCareerQuests({
    sessionCount: full.sessions.length,
    hasDiscover: full.selfDiscoverySessions.length > 0,
    weakestCompetency: weakest ? competencyLabel(weakest[0]) : undefined,
  });

  const firstSnapshotByCompetency = new Map<string, number>();
  for (const log of full.competencyLogs) {
    if (!firstSnapshotByCompetency.has(log.competency)) {
      firstSnapshotByCompetency.set(log.competency, log.percentile);
    }
  }

  const competencyDeltas = COMPETENCY_CODES.map((code) => {
    const latest = latestByCompetency[code];
    const first = firstSnapshotByCompetency.get(code);
    return {
      competency: code,
      percentile: latest.percentile,
      delta:
        latest.assessed && first != null ? latest.percentile - first : null,
      levelEst: latest.levelEst,
      assessed: latest.assessed,
    };
  });

  const latestDimensionResponses = dimensionResponses.slice(-12);
  const normalizedDims = latestDimensionResponses
    .map((r) => normalizeAnswerDimensions(r.dimensions))
    .filter((d): d is NonNullable<typeof d> => d !== null);
  const latestDimensions =
    normalizedDims.length > 0 ? averageDimensions(normalizedDims) : null;

  const recentPlans = await prisma.interviewPlan.findMany({
    where: { userId, roundBrief: { not: Prisma.DbNull } },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { roundBrief: true, roundCompetencyCodes: true, timeBudgetMinutes: true },
  });
  const recentRounds = recentPlans
    .map((p) => p.roundBrief as RoundBrief | null)
    .filter((b): b is RoundBrief => Boolean(b));

  const inProgressSessions = await prisma.interviewSession.findMany({
    where: { userId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    orderBy: { startedAt: "desc" },
    take: 8,
    select: {
      id: true,
      sessionNumber: true,
      focusCompetency: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      mode: true,
      planId: true,
      status: true,
    },
  });

  const accessLog = [
    ...inProgressSessions.map((s) => ({
      id: s.id,
      kind: "interview" as const,
      label: s.focusCompetency
        ? `${competencyLabel(s.focusCompetency)} 면접 #${s.sessionNumber}`
        : `모의면접 #${s.sessionNumber}`,
      href: interviewSessionHref(s),
      at: (s.startedAt ?? s.createdAt).toISOString(),
    })),
    ...full.selfDiscoverySessions.map((s) => ({
      id: s.id,
      kind: "discover" as const,
      label: "자기발견 인터뷰",
      href: `/discover/${s.id}/report`,
      at: (s.completedAt ?? s.startedAt).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return {
    userName: full.name,
    snapshots,
    latestByCompetency,
    sessionCount: full.sessions.length,
    dimensionTimeline,
    quests,
    totalXp,
    level,
    strengthDeck: strengthDeck
      ? {
          strengths: strengthDeck.strengths,
          interviewAdvice: strengthDeck.interviewAdvice,
          totalDiscovered: strengthDeck.totalDiscovered,
          reportHref: `/discover/${strengthDeck.sessionId}/report`,
        }
      : null,
    hasDashboardContent: full.sessions.length > 0 || !!strengthDeck,
    coachInsights: {
      competencyDeltas,
      latestDimensions: latestDimensions as Record<string, number> | null,
      recentRounds,
      accessLog,
    },
  };
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { competencyLabel, dimensionLabel } from "@/lib/labels";
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
import {
  listPathOverview,
  type PathCompetencySummary,
} from "@/lib/learning/path";
import {
  recommendWeaknessDrill,
  type WeaknessRecommendation,
} from "@/lib/learning/weakness";
import { COMPETENCY_LEARNING_META } from "@/lib/learning/catalog";
import {
  getResumeableInterviewSessions,
  type ResumeableInterviewSession,
} from "@/lib/interview/get-resumeable-sessions";

/** Cap history so dashboards stay fast as users accumulate sessions. */
const LOG_TAKE = 96;
const DIMENSION_TAKE = 48;
const STRENGTH_PREVIEW = 3;
const ROUND_TAKE = 2;
const ACCESS_TAKE = 8;

export type CompetencyLatest = {
  theta: number;
  percentile: number;
  levelEst: number;
  assessed: boolean;
  unlockedStage: number;
  masteryScore: number;
  pathCertified: boolean;
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
  learningPath: {
    weakness: WeaknessRecommendation;
    competencies: PathCompetencySummary[];
  };
  /** Optional — when requested, avoids a second sessions round-trip on the page. */
  resumeable?: ResumeableInterviewSession[];
};

export type CompetencyDashboardLoadOptions = {
  /** jobseeker skips lesson-catalog seed + weakness bank; mock keeps learning card. */
  persona?: "jobseeker" | "mock";
  includeResumeable?: boolean;
};

function emptyLatestByCompetency(): Record<string, CompetencyLatest> {
  const latestByCompetency: Record<string, CompetencyLatest> = {};
  for (const code of COMPETENCY_CODES) {
    latestByCompetency[code] = {
      theta: 0,
      percentile: 0,
      levelEst: 0,
      assessed: false,
      unlockedStage: 0,
      masteryScore: 0,
      pathCertified: false,
    };
  }
  return latestByCompetency;
}

function emptyWeakness(): WeaknessRecommendation {
  const competency = "COMMUNICATION" as const;
  const meta = COMPETENCY_LEARNING_META[competency];
  return {
    competency,
    titleKo: meta.title,
    dimension: "delivery",
    dimensionLabelKo: dimensionLabel("delivery"),
    tip: meta.dimensionTips.delivery ?? meta.principle,
    prompt: meta.weaknessPrompt,
    sampleQuestion: meta.sampleQuestion,
    practiceQuestions: [],
    source: "default",
    href: `/practice/path/${competency.toLowerCase()}`,
    swipeHref: `/practice/swipe?competency=${encodeURIComponent(competency)}`,
  };
}

/** Safe fallback when learning-path / Prisma joins fail — mirrors EMPTY_WORKER_DASHBOARD. */
export function emptyCompetencyDashboard(
  userName = "",
): CompetencyDashboardPayload {
  const latestByCompetency = emptyLatestByCompetency();
  return {
    userName,
    snapshots: [],
    latestByCompetency,
    sessionCount: 0,
    dimensionTimeline: [],
    quests: [],
    totalXp: 0,
    level: 1,
    strengthDeck: null,
    hasDashboardContent: false,
    coachInsights: {
      competencyDeltas: COMPETENCY_CODES.map((code) => ({
        competency: code,
        percentile: 0,
        delta: null,
        levelEst: 0,
        assessed: false,
      })),
      latestDimensions: null,
      recentRounds: [],
      accessLog: [],
    },
    learningPath: {
      weakness: emptyWeakness(),
      competencies: [],
    },
    resumeable: [],
  };
}

/** 구직자/모의면접 페르소나 대시보드·기관 코칭 뷰가 공유하는 역량 데이터 조회 */
export async function getCompetencyDashboardData(
  userId: string,
  opts: CompetencyDashboardLoadOptions = {},
): Promise<CompetencyDashboardPayload | null> {
  try {
    return await loadCompetencyDashboardData(userId, opts);
  } catch (e) {
    console.error("[getCompetencyDashboardData]", e);
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (!user) return null;
      return emptyCompetencyDashboard(user.name);
    } catch {
      return emptyCompetencyDashboard();
    }
  }
}

async function loadCompetencyDashboardData(
  userId: string,
  opts: CompetencyDashboardLoadOptions,
): Promise<CompetencyDashboardPayload | null> {
  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);

  const [
    user,
    sessionCount,
    competencyLogs,
    strengthDeck,
    dimensionResponsesDesc,
    pathProgressRows,
    recentPlans,
    accessSessions,
    resumeable,
    activity,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        careerTrack: true,
        selfDiscoverySessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 4,
          select: { id: true, completedAt: true, startedAt: true },
        },
      },
    }),
    prisma.interviewSession.count({
      where: { userId, status: "COMPLETED" },
    }),
    prisma.competencySnapshot.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take: LOG_TAKE,
      select: {
        competency: true,
        theta: true,
        percentile: true,
        levelEst: true,
        recordedAt: true,
        sessionId: true,
      },
    }),
    getUserStrengthDeck(userId),
    prisma.responseRecord.findMany({
      where: {
        session: { userId, status: "COMPLETED" },
        isBonusQuestion: false,
        dimensions: { not: Prisma.DbNull },
      },
      select: {
        dimensions: true,
        session: { select: { sessionNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: DIMENSION_TAKE,
    }),
    prisma.learningPathProgress.findMany({
      where: { userId },
      select: {
        competency: true,
        unlockedStage: true,
        masteryScore: true,
        track: true,
      },
    }),
    prisma.interviewPlan.findMany({
      where: { userId, roundBrief: { not: Prisma.DbNull } },
      orderBy: { updatedAt: "desc" },
      take: ROUND_TAKE,
      select: { roundBrief: true },
    }),
    prisma.interviewSession.findMany({
      where: { userId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
      orderBy: { startedAt: "desc" },
      take: ACCESS_TAKE,
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
    }),
    opts.includeResumeable
      ? getResumeableInterviewSessions(userId)
      : Promise.resolve([] as ResumeableInterviewSession[]),
    loadActivityCounts(userId, startOfUtcDay),
  ]);

  if (!user) return null;

  const sessionIds = [...new Set(competencyLogs.map((log) => log.sessionId))];
  const sessionNumberRows =
    sessionIds.length > 0
      ? await prisma.interviewSession.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, sessionNumber: true },
        })
      : [];
  const sessionNumberById = new Map(
    sessionNumberRows.map((s) => [s.id, s.sessionNumber]),
  );

  // Logs were fetched newest-first; chronological for first/delta + timeline.
  const logsChronological = [...competencyLogs].reverse();

  const snapshots: CompetencySnapshotRow[] = logsChronological.map((log) => ({
    competency: log.competency,
    theta: log.theta,
    percentile: log.percentile,
    recordedAt: log.recordedAt.toISOString(),
    sessionNumber: sessionNumberById.get(log.sessionId) ?? 0,
  }));

  const latestByCompetency = emptyLatestByCompetency();
  for (const log of competencyLogs) {
    const row = latestByCompetency[log.competency];
    if (!row || row.assessed) continue;
    latestByCompetency[log.competency] = {
      theta: log.theta,
      percentile: log.percentile,
      levelEst: log.levelEst,
      assessed: true,
      unlockedStage: 0,
      masteryScore: 0,
      pathCertified: false,
    };
  }

  const track = user.careerTrack;
  const pathForTrack = pathProgressRows.filter((p) => p.track === track);
  const pathByCode = new Map(pathForTrack.map((c) => [c.competency, c]));
  for (const code of COMPETENCY_CODES) {
    const path = pathByCode.get(code);
    const row = latestByCompetency[code];
    row.unlockedStage = path?.unlockedStage ?? 0;
    row.masteryScore = path?.masteryScore ?? 0;
    row.pathCertified = (path?.unlockedStage ?? 0) >= 5;
  }

  let weakness: WeaknessRecommendation = emptyWeakness();
  let pathCompetencies: PathCompetencySummary[] = [];

  try {
    const [weaknessRec, pathRows] = await Promise.all([
      recommendWeaknessDrill(userId),
      listPathOverview(userId, track),
    ]);
    weakness = weaknessRec;
    pathCompetencies = pathRows;
  } catch (e) {
    console.error("[getCompetencyDashboardData] learning-path", e);
    pathCompetencies = COMPETENCY_CODES.map((competency) => {
      const progress = pathByCode.get(competency);
      return {
        competency,
        titleKo: COMPETENCY_LEARNING_META[competency]?.title ?? competency,
        unlockedStage: progress?.unlockedStage ?? 0,
        masteryScore: progress?.masteryScore ?? 0,
        streakDays: 0,
        lastDrillAt: null,
        nextLesson: null,
      };
    });
  }

  const assessedEntries = Object.entries(latestByCompetency).filter(
    ([, v]) => v.assessed,
  );
  const weakest = assessedEntries.sort(
    (a, b) => a[1].percentile - b[1].percentile,
  )[0];

  const { quests, totalXp, level } = buildCareerQuests({
    sessionCount,
    hasDiscover: user.selfDiscoverySessions.length > 0,
    hasSwipeToday: activity.swipeToday > 0,
    hasPathDrillToday: activity.pathDrillToday > 0,
    hasGameToday: activity.gameToday > 0,
    pathCertifiedCount: activity.certifyCount,
    weakestCompetency: weakest ? competencyLabel(weakest[0]) : undefined,
  });

  const firstSnapshotByCompetency = new Map<string, number>();
  for (const log of logsChronological) {
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

  const dimensionResponses = [...dimensionResponsesDesc].reverse();
  const dimensionTimeline = buildDimensionTimeline(
    dimensionResponses.map((r) => ({
      dimensions: r.dimensions,
      sessionNumber: r.session.sessionNumber,
    })),
  );

  const latestDimensionResponses = dimensionResponses.slice(-12);
  const normalizedDims = latestDimensionResponses
    .map((r) => normalizeAnswerDimensions(r.dimensions))
    .filter((d): d is NonNullable<typeof d> => d !== null);
  const latestDimensions =
    normalizedDims.length > 0 ? averageDimensions(normalizedDims) : null;

  const recentRounds = recentPlans
    .map((p) => p.roundBrief)
    .filter((b): b is RoundBrief => {
      if (!b || typeof b !== "object" || Array.isArray(b)) return false;
      return true;
    });

  const accessLog = [
    ...accessSessions.map((s) => ({
      id: s.id,
      kind: "interview" as const,
      label: s.focusCompetency
        ? `${competencyLabel(s.focusCompetency)} 면접 #${s.sessionNumber}`
        : `모의면접 #${s.sessionNumber}`,
      href: interviewSessionHref(s),
      at: (s.startedAt ?? s.createdAt ?? new Date()).toISOString(),
    })),
    ...user.selfDiscoverySessions.map((s) => ({
      id: s.id,
      kind: "discover" as const,
      label: "자기발견 인터뷰",
      href: `/discover/${s.id}/report`,
      at: (s.completedAt ?? s.startedAt ?? new Date()).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, ACCESS_TAKE);

  const slimStrengths = strengthDeck
    ? strengthDeck.strengths.slice(0, STRENGTH_PREVIEW)
    : [];
  const slimAdvice = strengthDeck
    ? strengthDeck.interviewAdvice.slice(0, STRENGTH_PREVIEW)
    : [];

  return {
    userName: user.name,
    snapshots,
    latestByCompetency,
    sessionCount,
    dimensionTimeline,
    quests,
    totalXp,
    level,
    strengthDeck: strengthDeck
      ? {
          strengths: slimStrengths,
          interviewAdvice: slimAdvice,
          totalDiscovered: strengthDeck.totalDiscovered,
          reportHref: `/discover/${strengthDeck.sessionId}/report`,
        }
      : null,
    hasDashboardContent:
      sessionCount > 0 || !!strengthDeck || activity.pathDrillToday > 0,
    learningPath: {
      weakness,
      competencies: pathCompetencies,
    },
    coachInsights: {
      competencyDeltas,
      latestDimensions: latestDimensions as Record<string, number> | null,
      recentRounds,
      accessLog,
    },
    resumeable,
  };
}

async function loadActivityCounts(
  userId: string,
  startOfUtcDay: Date,
): Promise<{
  swipeToday: number;
  pathDrillToday: number;
  gameToday: number;
  certifyCount: number;
}> {
  const [swipeToday, pathDrillToday, gameToday, certifyCount] =
    await Promise.all([
      prisma.swipeAction.count({
        where: { userId, updatedAt: { gte: startOfUtcDay } },
      }),
      prisma.drillAttempt.count({
        where: {
          userId,
          kind: { not: "game" },
          createdAt: { gte: startOfUtcDay },
        },
      }),
      prisma.drillAttempt.count({
        where: {
          userId,
          kind: "game",
          createdAt: { gte: startOfUtcDay },
        },
      }),
      prisma.lessonCompletion.count({
        where: {
          userId,
          score: { gte: 0.7 },
          lesson: { kind: "CERTIFY" },
        },
      }),
    ]);

  return { swipeToday, pathDrillToday, gameToday, certifyCount };
}

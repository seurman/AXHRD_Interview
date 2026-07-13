import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  averageDimensions,
  normalizeAnswerDimensions,
  normalizeCompetencyDimensions,
  type CompetencyReportDimensions,
} from "@/lib/interview/answer-dimensions";

export type DimensionsHealthSummary = {
  responseTotal: number;
  responseWithDimensions: number;
  responseWithoutDimensions: number;
  competencyFeedbackTotal: number;
  competencyFeedbackWithDimensions: number;
};

export type RecentDimensionRow = {
  id: string;
  sessionId: string;
  createdAt: Date;
  competency: string;
  isBonusQuestion: boolean;
  rubricScore: number;
  hasDimensions: boolean;
  dimensions: ReturnType<typeof normalizeAnswerDimensions>;
  userEmail: string;
  userName: string | null;
};

export type CompetencyDimensionCheck = {
  feedbackId: string;
  sessionId: string;
  competency: string;
  generatedAt: Date;
  stored: CompetencyReportDimensions | null;
  measured: CompetencyReportDimensions | null;
  match: boolean | null;
  responseCount: number;
  responseWithDimensions: number;
};

function dimensionsMatch(
  stored: CompetencyReportDimensions | null,
  measured: CompetencyReportDimensions | null,
): boolean | null {
  if (!stored || !measured) return null;
  const keys = ["starStructure", "questionIntent", "logic", "delivery"] as const;
  return keys.every((key) => Math.abs(stored[key] - measured[key]) <= 1);
}

export async function getDimensionsHealthSummary(): Promise<DimensionsHealthSummary> {
  const [
    responseTotal,
    responseWithDimensions,
    competencyFeedbackTotal,
    competencyFeedbackWithDimensions,
  ] = await Promise.all([
    prisma.responseRecord.count(),
    prisma.responseRecord.count({ where: { dimensions: { not: Prisma.DbNull } } }),
    prisma.competencyFeedback.count(),
    prisma.competencyFeedback.count({ where: { dimensions: { not: Prisma.DbNull } } }),
  ]);

  return {
    responseTotal,
    responseWithDimensions,
    responseWithoutDimensions: responseTotal - responseWithDimensions,
    competencyFeedbackTotal,
    competencyFeedbackWithDimensions,
  };
}

export async function getRecentResponseDimensionRows(
  limit = 30,
): Promise<RecentDimensionRow[]> {
  const rows = await prisma.responseRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      session: {
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  return rows.map((r) => {
    const dimensions = normalizeAnswerDimensions(r.dimensions);
    return {
      id: r.id,
      sessionId: r.sessionId,
      createdAt: r.createdAt,
      competency: r.competency,
      isBonusQuestion: r.isBonusQuestion,
      rubricScore: r.rubricScore,
      hasDimensions: dimensions !== null,
      dimensions,
      userEmail: r.session.user.email,
      userName: r.session.user.name,
    };
  });
}

export async function getCompetencyDimensionChecks(
  limit = 20,
): Promise<CompetencyDimensionCheck[]> {
  const feedbacks = await prisma.competencyFeedback.findMany({
    orderBy: { generatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      dimensions: true,
      generatedAt: true,
      progress: { select: { competency: true } },
    },
  });

  if (feedbacks.length === 0) return [];

  const sessions = await prisma.interviewSession.findMany({
    where: { id: { in: feedbacks.map((f) => f.sessionId) } },
    include: {
      responses: {
        where: { isBonusQuestion: false },
        select: { dimensions: true },
      },
    },
  });
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  return feedbacks.map((f) => {
    const session = sessionById.get(f.sessionId);
    const perTurn = (session?.responses ?? [])
      .map((r) => normalizeAnswerDimensions(r.dimensions))
      .filter((d): d is NonNullable<typeof d> => d !== null);

    const measured =
      perTurn.length > 0
        ? normalizeCompetencyDimensions(averageDimensions(perTurn)!)
        : null;
    const stored = normalizeCompetencyDimensions(f.dimensions);

    return {
      feedbackId: f.id,
      sessionId: f.sessionId,
      competency: f.progress.competency,
      generatedAt: f.generatedAt,
      stored,
      measured,
      match: dimensionsMatch(stored, measured),
      responseCount: session?.responses.length ?? 0,
      responseWithDimensions: perTurn.length,
    };
  });
}

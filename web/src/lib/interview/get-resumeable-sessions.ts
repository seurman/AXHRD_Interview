import { prisma } from "@/lib/prisma";

export type ResumeableInterviewSession = {
  id: string;
  focusCompetency: string | null;
  sessionNumber: number;
  startedAt: Date | null;
  timeBudgetMinutes: number | null;
  planId: string | null;
};

/** 사용자가 이어서 볼 수 있는 IN_PROGRESS 면접 (최신순) */
export async function getResumeableInterviewSessions(
  userId: string,
  take = 3,
): Promise<ResumeableInterviewSession[]> {
  return prisma.interviewSession.findMany({
    where: { userId, status: "IN_PROGRESS" },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      focusCompetency: true,
      sessionNumber: true,
      startedAt: true,
      timeBudgetMinutes: true,
      planId: true,
    },
  });
}

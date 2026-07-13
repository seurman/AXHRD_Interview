import { prisma } from "@/lib/prisma";
import type { OrgStatus } from "@prisma/client";
import { COHORT_MEMBER_ROLES } from "@/lib/auth/roles";

export interface CohortMemberRow {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  completedSessions: number;
  avgPercentile: number | null;
  lastActiveAt: string | null;
  coachingConsent: boolean;
}

export interface CohortCompetencyRow {
  competency: string;
  avgTheta: number;
  avgPercentile: number;
  memberCount: number;
}

export interface CohortData {
  organizationName: string;
  joinCode: string;
  status: OrgStatus;
  memberCount: number;
  totalCompletedSessions: number;
  integritySignalSessions: number;
  overallAvgPercentile: number | null;
  competencies: CohortCompetencyRow[]; // avgPercentile 오름차순 — 취약 역량이 먼저
  members: CohortMemberRow[];
}

/** 기관 소속 구성원(학생·직장인·지원자) 결과 집계 */
export async function getCohortData(organizationId: string): Promise<CohortData | null> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return null;

  const students = await prisma.user.findMany({
    where: { organizationId, orgRole: { in: [...COHORT_MEMBER_ROLES] } },
    select: { id: true, name: true, email: true, createdAt: true, orgCoachingConsent: true },
  });
  const studentIds = students.map((s) => s.id);

  if (studentIds.length === 0) {
    return {
      organizationName: org.name,
      joinCode: org.joinCode,
      status: org.status,
      memberCount: 0,
      totalCompletedSessions: 0,
      integritySignalSessions: 0,
      overallAvgPercentile: null,
      competencies: [],
      members: [],
    };
  }

  const [sessions, snapshots] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId: { in: studentIds }, status: "COMPLETED" },
      select: { userId: true, completedAt: true, pasteDetected: true, tabSwitchCount: true },
    }),
    prisma.competencySnapshot.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { recordedAt: "asc" },
    }),
  ]);

  // 학생별 최신 역량 스냅샷만 남긴다 (userId, competency) 조합 기준
  const latestByUserCompetency = new Map<
    string,
    { userId: string; competency: string; theta: number; percentile: number }
  >();
  for (const snap of snapshots) {
    latestByUserCompetency.set(`${snap.userId}:${snap.competency}`, snap);
  }
  const latestSnapshots = Array.from(latestByUserCompetency.values());

  // 역량별 집계
  const byCompetency = new Map<string, { thetaSum: number; pctSum: number; count: number }>();
  for (const snap of latestSnapshots) {
    const agg = byCompetency.get(snap.competency) ?? { thetaSum: 0, pctSum: 0, count: 0 };
    agg.thetaSum += snap.theta;
    agg.pctSum += snap.percentile;
    agg.count += 1;
    byCompetency.set(snap.competency, agg);
  }
  const competencies: CohortCompetencyRow[] = Array.from(byCompetency.entries())
    .map(([competency, agg]) => ({
      competency,
      avgTheta: agg.thetaSum / agg.count,
      avgPercentile: agg.pctSum / agg.count,
      memberCount: agg.count,
    }))
    .sort((a, b) => a.avgPercentile - b.avgPercentile);

  // 학생별 요약
  const completedByUser = new Map<string, { count: number; lastActiveAt: Date | null }>();
  for (const s of sessions) {
    const entry = completedByUser.get(s.userId) ?? { count: 0, lastActiveAt: null };
    entry.count += 1;
    if (s.completedAt && (!entry.lastActiveAt || s.completedAt > entry.lastActiveAt)) {
      entry.lastActiveAt = s.completedAt;
    }
    completedByUser.set(s.userId, entry);
  }
  const percentilesByUser = new Map<string, number[]>();
  for (const snap of latestSnapshots) {
    const arr = percentilesByUser.get(snap.userId) ?? [];
    arr.push(snap.percentile);
    percentilesByUser.set(snap.userId, arr);
  }

  const members: CohortMemberRow[] = students
    .map((s) => {
      const completed = completedByUser.get(s.id);
      const pcts = percentilesByUser.get(s.id) ?? [];
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        joinedAt: s.createdAt.toISOString(),
        completedSessions: completed?.count ?? 0,
        avgPercentile: pcts.length
          ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
          : null,
        lastActiveAt: completed?.lastActiveAt?.toISOString() ?? null,
        coachingConsent: s.orgCoachingConsent,
      };
    })
    .sort((a, b) => b.completedSessions - a.completedSessions);

  const overallAvgPercentile = competencies.length
    ? Math.round(
        competencies.reduce((s, c) => s + c.avgPercentile, 0) / competencies.length
      )
    : null;

  const integritySignalSessions = sessions.filter(
    (s) => s.pasteDetected || s.tabSwitchCount >= 3,
  ).length;

  return {
    organizationName: org.name,
    joinCode: org.joinCode,
    status: org.status,
    memberCount: students.length,
    totalCompletedSessions: sessions.length,
    integritySignalSessions,
    overallAvgPercentile,
    competencies,
    members,
  };
}

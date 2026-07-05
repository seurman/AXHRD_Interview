import { prisma } from "@/lib/prisma";

/**
 * 기관(학교) 간 퍼포먼스 비교.
 *
 * 프라이버시 원칙(코호트 대시보드와 동일): 개인 답변 원문은 절대 다루지 않고
 * 집계 수치만 사용한다. 추가로 여기서는 "기관 간" 비교이므로 한 단계 더 —
 * 담당자(ADMIN/STAFF) 화면에서는 다른 학교의 이름을 노출하지 않고 익명화된
 * 평균/순위만 보여준다. 실명이 붙은 전체 비교표는 슈퍼어드민 전용 화면에서만 제공한다.
 *
 * 소규모 기관이 평균 하나로 특정되는 것을 막기 위해, 익명 평균(peer average)
 * 계산에는 학생 수가 MIN_PEER_MEMBERS 이상인 기관만 포함한다.
 */

export const MIN_PEER_MEMBERS = 3;

export interface OrgCompetencyAggregate {
  competency: string;
  avgPercentile: number;
  avgTheta: number;
  memberCount: number;
}

export interface OrgAggregate {
  memberCount: number;
  /** 완료된 면접이 1개 이상 있는 학생 수 */
  activeMemberCount: number;
  /** 학생들의 (역량별 진행 완료 수 / 전체 역량 수) 평균 — 0~100(%) */
  completionRate: number | null;
  /** 역량별 avgPercentile의 평균 */
  overallAvgPercentile: number | null;
  competencies: OrgCompetencyAggregate[];
}

function average(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

/** 기관 하나의 집계 통계 — 코호트 대시보드(lib/org/cohort.ts)와 별개로,
 *  전체 기관을 순회하며 가볍게 계산하기 위한 최소 쿼리 버전. */
export async function computeOrgAggregate(organizationId: string): Promise<OrgAggregate> {
  const students = await prisma.user.findMany({
    where: { organizationId, orgRole: "STUDENT" },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  if (studentIds.length === 0) {
    return {
      memberCount: 0,
      activeMemberCount: 0,
      completionRate: null,
      overallAvgPercentile: null,
      competencies: [],
    };
  }

  const [completedSessionUsers, progress, snapshots] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId: { in: studentIds }, status: "COMPLETED" },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.competencyProgress.findMany({
      where: { userId: { in: studentIds } },
      select: { status: true },
    }),
    prisma.competencySnapshot.findMany({
      where: { userId: { in: studentIds } },
      orderBy: { recordedAt: "asc" },
    }),
  ]);

  const completionRate = progress.length
    ? Math.round(
        (progress.filter((p) => p.status === "COMPLETED").length / progress.length) * 100
      )
    : null;

  // 학생별 최신 역량 스냅샷만 남긴다 (코호트 대시보드와 동일한 방식)
  const latestByUserCompetency = new Map<
    string,
    { competency: string; theta: number; percentile: number }
  >();
  for (const snap of snapshots) {
    latestByUserCompetency.set(`${snap.userId}:${snap.competency}`, snap);
  }

  const byCompetency = new Map<string, { thetaSum: number; pctSum: number; count: number }>();
  for (const snap of latestByUserCompetency.values()) {
    const agg = byCompetency.get(snap.competency) ?? { thetaSum: 0, pctSum: 0, count: 0 };
    agg.thetaSum += snap.theta;
    agg.pctSum += snap.percentile;
    agg.count += 1;
    byCompetency.set(snap.competency, agg);
  }

  const competencies: OrgCompetencyAggregate[] = Array.from(byCompetency.entries()).map(
    ([competency, agg]) => ({
      competency,
      avgPercentile: agg.pctSum / agg.count,
      avgTheta: agg.thetaSum / agg.count,
      memberCount: agg.count,
    })
  );

  const overallAvgPercentile = competencies.length
    ? Math.round(competencies.reduce((s, c) => s + c.avgPercentile, 0) / competencies.length)
    : null;

  return {
    memberCount: studentIds.length,
    activeMemberCount: completedSessionUsers.length,
    completionRate,
    overallAvgPercentile,
    competencies,
  };
}

export interface PeerCompetencyBenchmark {
  competency: string;
  ownAvgPercentile: number | null;
  ownMemberCount: number;
  peerAvgPercentile: number | null;
}

export interface OrgBenchmarkView {
  organizationName: string;
  ownMemberCount: number;
  ownActiveMemberCount: number;
  ownCompletionRate: number | null;
  ownOverallAvgPercentile: number | null;
  /** 익명 평균에 포함된 다른 기관 수(자기 제외, 최소 학생 수 충족한 기관만) */
  peerOrgCount: number;
  peerAvgCompletionRate: number | null;
  peerAvgOverallPercentile: number | null;
  /** 전체 승인 기관(자기 포함) 중 상위 몇 %인지 — 표시 없이 값만, formatPercentile로 렌더링 */
  rankPercentile: number | null;
  competencies: PeerCompetencyBenchmark[];
  /** 비교할 다른 기관이 충분하지 않을 때(모두 소규모이거나 승인된 기관이 자기뿐일 때) true */
  insufficientPeerData: boolean;
}

/** 기관 담당자(ADMIN/STAFF)용 — 다른 기관 이름은 절대 노출하지 않고 익명 평균/순위만 반환 */
export async function getOrgBenchmark(organizationId: string): Promise<OrgBenchmarkView | null> {
  const orgs = await prisma.organization.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
  });
  const self = orgs.find((o) => o.id === organizationId);
  if (!self) return null;

  const aggregates = await Promise.all(
    orgs.map(async (o) => ({ id: o.id, ...(await computeOrgAggregate(o.id)) }))
  );

  const own = aggregates.find((a) => a.id === organizationId);
  if (!own) return null;

  const peers = aggregates.filter(
    (a) => a.id !== organizationId && a.memberCount >= MIN_PEER_MEMBERS
  );

  const peerAvgCompletionRate = average(
    peers.map((p) => p.completionRate).filter((v): v is number => v != null)
  );
  const peerAvgOverallPercentile = average(
    peers.map((p) => p.overallAvgPercentile).filter((v): v is number => v != null)
  );

  const ranked = aggregates.filter((a) => a.overallAvgPercentile != null);
  let rankPercentile: number | null = null;
  if (own.overallAvgPercentile != null && ranked.length > 1) {
    const notBetter = ranked.filter(
      (a) => a.overallAvgPercentile! <= own.overallAvgPercentile!
    ).length;
    rankPercentile = Math.round((notBetter / ranked.length) * 100);
  }

  const compCodes = new Set<string>();
  aggregates.forEach((a) => a.competencies.forEach((c) => compCodes.add(c.competency)));

  const competencies: PeerCompetencyBenchmark[] = Array.from(compCodes)
    .map((code) => {
      const ownRow = own.competencies.find((c) => c.competency === code);
      const peerVals = peers
        .map((p) => p.competencies.find((c) => c.competency === code)?.avgPercentile)
        .filter((v): v is number => v != null);
      return {
        competency: code,
        ownAvgPercentile: ownRow?.avgPercentile ?? null,
        ownMemberCount: ownRow?.memberCount ?? 0,
        peerAvgPercentile: average(peerVals),
      };
    })
    .sort((a, b) => (a.ownAvgPercentile ?? 999) - (b.ownAvgPercentile ?? 999));

  return {
    organizationName: self.name,
    ownMemberCount: own.memberCount,
    ownActiveMemberCount: own.activeMemberCount,
    ownCompletionRate: own.completionRate,
    ownOverallAvgPercentile: own.overallAvgPercentile,
    peerOrgCount: peers.length,
    peerAvgCompletionRate,
    peerAvgOverallPercentile,
    rankPercentile,
    competencies,
    insufficientPeerData: peers.length === 0,
  };
}

export interface OrgBenchmarkRow {
  id: string;
  name: string;
  memberCount: number;
  activeMemberCount: number;
  completionRate: number | null;
  overallAvgPercentile: number | null;
}

/** 슈퍼어드민용 — 실명이 붙은 전체 기관 비교표. 평균 백분위 내림차순 정렬. */
export async function getAllOrgBenchmarks(): Promise<OrgBenchmarkRow[]> {
  const orgs = await prisma.organization.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
  });

  const rows = await Promise.all(
    orgs.map(async (o) => ({ id: o.id, name: o.name, ...(await computeOrgAggregate(o.id)) }))
  );

  return rows.sort((a, b) => (b.overallAvgPercentile ?? -1) - (a.overallAvgPercentile ?? -1));
}

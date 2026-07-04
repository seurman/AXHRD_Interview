import { prisma } from "@/lib/prisma";

export interface CertificateCompetencyRow {
  competency: string;
  theta: number;
  percentile: number;
  levelEst: number;
  recordedAt: string;
}

export interface CertificateData {
  name: string;
  memberSince: string;
  sessionCount: number;
  overallPercentile: number | null;
  competencies: CertificateCompetencyRow[];
  issuedAt: string;
}

/** 사용자의 최신 역량 스냅샷을 모아 인증서용 데이터로 정리한다.
 *  본인 프로필 페이지(/profile/certificate)와 공개 공유 페이지(/c/[slug])가 함께 사용한다. */
export async function getCertificateData(userId: string): Promise<CertificateData | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const logs = await prisma.competencySnapshot.findMany({
    where: { userId },
    orderBy: { recordedAt: "asc" },
  });

  const latestByCompetency = new Map<string, CertificateCompetencyRow>();
  for (const log of logs) {
    latestByCompetency.set(log.competency, {
      competency: log.competency,
      theta: log.theta,
      percentile: log.percentile,
      levelEst: log.levelEst,
      recordedAt: log.recordedAt.toISOString(),
    });
  }

  const sessionCount = await prisma.interviewSession.count({
    where: { userId, status: "COMPLETED" },
  });

  const competencies = Array.from(latestByCompetency.values()).sort(
    (a, b) => b.percentile - a.percentile
  );

  const overallPercentile = competencies.length
    ? Math.round(
        competencies.reduce((s, c) => s + c.percentile, 0) / competencies.length
      )
    : null;

  return {
    name: user.name,
    memberSince: user.createdAt.toISOString(),
    sessionCount,
    overallPercentile,
    competencies,
    issuedAt: new Date().toISOString(),
  };
}

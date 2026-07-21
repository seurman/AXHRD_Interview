import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES } from "@/types";
import { competencyLabel } from "@/lib/labels";

export interface CertificateCompetencyRow {
  competency: string;
  theta: number;
  percentile: number;
  levelEst: number;
  recordedAt: string;
}

export interface PathBadgeRow {
  competency: string;
  titleKo: string;
  masteryScore: number;
  certifiedAt: string;
}

export interface CertificateData {
  name: string;
  memberSince: string;
  sessionCount: number;
  overallPercentile: number | null;
  competencies: CertificateCompetencyRow[];
  pathBadges: PathBadgeRow[];
  issuedAt: string;
}

/** 사용자의 최신 역량 스냅샷을 모아 인증서용 데이터로 정리한다.
 *  본인 프로필 페이지(/profile/certificate)와 공개 공유 페이지(/c/[slug])가 함께 사용한다. */
export async function getCertificateData(userId: string): Promise<CertificateData | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const [logs, sessionCount, pathProgress, certifyLessons, certifyCompletions] =
    await Promise.all([
      prisma.competencySnapshot.findMany({
        where: { userId },
        orderBy: { recordedAt: "asc" },
      }),
      prisma.interviewSession.count({
        where: { userId, status: "COMPLETED" },
      }),
      prisma.learningPathProgress.findMany({
        where: { userId, unlockedStage: { gte: 5 } },
      }),
      prisma.competencyLesson.findMany({
        where: { kind: "CERTIFY", published: true },
        select: { id: true, competency: true },
      }),
      prisma.lessonCompletion.findMany({
        where: {
          userId,
          score: { gte: 0.7 },
        },
        select: { lessonId: true, score: true, createdAt: true },
      }),
    ]);

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

  const competencies = Array.from(latestByCompetency.values()).sort(
    (a, b) => b.percentile - a.percentile,
  );

  const overallPercentile = competencies.length
    ? Math.round(
        competencies.reduce((s, c) => s + c.percentile, 0) / competencies.length,
      )
    : null;

  const certifyByComp = new Map(certifyLessons.map((l) => [l.competency, l.id]));
  const completionByLesson = new Map(
    certifyCompletions.map((c) => [c.lessonId, c] as const),
  );
  const progressByComp = new Map(pathProgress.map((p) => [p.competency, p]));

  const pathBadges: PathBadgeRow[] = [];
  for (const code of COMPETENCY_CODES) {
    const lessonId = certifyByComp.get(code);
    const completion = lessonId ? completionByLesson.get(lessonId) : undefined;
    const progress = progressByComp.get(code);
    if (!completion || !progress || progress.unlockedStage < 5) continue;
    pathBadges.push({
      competency: code,
      titleKo: competencyLabel(code),
      masteryScore: progress.masteryScore,
      certifiedAt: completion.createdAt.toISOString(),
    });
  }

  return {
    name: user.name,
    memberSince: user.createdAt.toISOString(),
    sessionCount,
    overallPercentile,
    competencies,
    pathBadges,
    issuedAt: new Date().toISOString(),
  };
}

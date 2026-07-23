import type { PrismaClient, Prisma } from "@prisma/client";
import type { PrepMode, RoundBrief } from "@/lib/interview/competency-round";
import type { AnswerDimensions } from "@/lib/interview/answer-dimensions";
import type { SessionReportData } from "@/types";
import { hashPassword } from "@/lib/auth/password";
import pack from "@/data/demo/personal-dashboard.pack.json";
import access from "@/data/demo/demo-access.json";

const DEMO_MARKER = "[AXHRD_DEMO_PACKAGE]";

type PackResponse = {
  transcript: string;
  rubricScore: number;
  dimensions: AnswerDimensions;
};

type PackSession = {
  focusCompetency: string;
  daysAgo: number;
  theta: number;
  percentile: number;
  levelEst: number;
  responses: PackResponse[];
  report: {
    summary: string;
    strengths: string[];
    improvements: string[];
    score: number;
  };
};

type PackRound = {
  prepMode: PrepMode;
  timeBudgetMinutes: number;
  competencies: string[];
  roundBrief: Omit<RoundBrief, "competencies" | "timeBudgetMinutes" | "prepMode" | "completedAt">;
  sessions: PackSession[];
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function wipePersonalDemoData(db: PrismaClient, userId: string) {
  await db.competencySnapshot.deleteMany({ where: { userId } });
  await db.interviewSession.deleteMany({ where: { userId } });
  await db.interviewPlan.deleteMany({ where: { userId } });
  await db.selfDiscoverySession.deleteMany({ where: { userId } });
  await db.resume.deleteMany({ where: { userId } });
}

function buildRoundBrief(round: PackRound, completedAt: Date): RoundBrief {
  return {
    competencies: round.competencies,
    timeBudgetMinutes: round.timeBudgetMinutes,
    prepMode: round.prepMode,
    completedAt: completedAt.toISOString(),
    strengthsText: round.roundBrief.strengthsText,
    improvementsText: round.roundBrief.improvementsText,
    strengthBullets: round.roundBrief.strengthBullets,
    improvementBullets: round.roundBrief.improvementBullets,
  };
}

function buildSessionReport(session: PackSession): SessionReportData {
  return {
    summary: session.report.summary,
    sections: [
      {
        title: session.focusCompetency,
        content: session.report.summary,
        score: session.report.score,
        suggestions: session.report.improvements,
      },
    ],
    strengths: session.report.strengths,
    improvements: session.report.improvements,
    nextSteps: session.report.improvements.slice(0, 2),
  };
}

/** JSON 팩 → 개인 대시보드·코칭 인사이트 데모 데이터 */
export async function seedPersonalDashboardFromPack(client: PrismaClient) {
  const account = access.accounts.find((a) => a.id === "personal_dashboard");
  const password =
    account && "password" in account && account.password
      ? account.password
      : access.defaultPassword;

  const user = await client.user.upsert({
    where: { email: pack.user.email },
    update: {
      name: pack.user.name,
      passwordHash: hashPassword(password),
      dataUseConsentAt: new Date(),
    },
    create: {
      email: pack.user.email,
      name: pack.user.name,
      passwordHash: hashPassword(password),
      dataUseConsentAt: new Date(),
      profile: {
        create: {
          careerYears: pack.user.profile.careerYears,
          education: pack.user.profile.education,
          desiredJobRole: pack.user.profile.desiredJobRole as "MARKETING",
        },
      },
    },
    include: { profile: true },
  });

  if (!user.profile) {
    await client.userProfile.create({
      data: {
        userId: user.id,
        careerYears: pack.user.profile.careerYears,
        education: pack.user.profile.education,
        desiredJobRole: pack.user.profile.desiredJobRole as "MARKETING",
      },
    });
  } else {
    await client.userProfile.update({
      where: { userId: user.id },
      data: {
        careerYears: pack.user.profile.careerYears,
        education: pack.user.profile.education,
        desiredJobRole: pack.user.profile.desiredJobRole as "MARKETING",
      },
    });
  }

  await wipePersonalDemoData(client, user.id);

  const packResume = (pack as { resume?: { fileName: string; rawText: string; parsedTags: unknown } })
    .resume;
  if (packResume) {
    await client.resume.deleteMany({ where: { userId: user.id } });
    await client.resume.create({
      data: {
        userId: user.id,
        fileName: packResume.fileName,
        rawText: packResume.rawText,
        parsedTags: packResume.parsedTags as Prisma.InputJsonValue,
      },
    });
  }

  let sessionNumber = 0;
  let totalResponses = 0;
  const rounds = pack.rounds as PackRound[];

  for (const round of rounds) {
    const lastSessionDaysAgo = Math.min(...round.sessions.map((s) => s.daysAgo));
    const roundCompletedAt = daysAgo(lastSessionDaysAgo);

    const plan = await client.interviewPlan.create({
      data: {
        userId: user.id,
        jobRole: "MARKETING",
        status: "COMPLETED",
        prepMode: round.prepMode,
        timeBudgetMinutes: round.timeBudgetMinutes,
        roundCompetencyCodes: round.competencies,
        queuedCompetencyCodes: [],
        roundBrief: buildRoundBrief(round, roundCompletedAt),
      },
    });

    for (const competency of round.competencies) {
      await client.competencyProgress.create({
        data: {
          planId: plan.id,
          userId: user.id,
          competency,
          status: "COMPLETED",
        },
      });
    }

    for (const sessionDef of round.sessions) {
      sessionNumber += 1;
      const startedAt = daysAgo(sessionDef.daysAgo + 1);
      const completedAt = daysAgo(sessionDef.daysAgo);

      const session = await client.interviewSession.create({
        data: {
          userId: user.id,
          planId: plan.id,
          sessionNumber,
          status: "COMPLETED",
          jobRole: "MARKETING",
          mode: "COMPETENCY",
          focusCompetency: sessionDef.focusCompetency,
          setupSelectionText: DEMO_MARKER,
          startedAt,
          completedAt,
          overallTheta: sessionDef.theta,
          timeBudgetMinutes: round.timeBudgetMinutes,
          queuedCompetencyCodes: [],
        },
      });

      for (const response of sessionDef.responses) {
        await client.responseRecord.create({
          data: {
            sessionId: session.id,
            competency: sessionDef.focusCompetency,
            level: sessionDef.levelEst,
            transcript: response.transcript,
            rubricScore: response.rubricScore,
            dimensions: response.dimensions,
          },
        });
        totalResponses += 1;
      }

      await client.competencySnapshot.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          competency: sessionDef.focusCompetency,
          theta: sessionDef.theta,
          se: 0.32,
          levelEst: sessionDef.levelEst,
          percentile: sessionDef.percentile,
          recordedAt: completedAt,
        },
      });

      await client.competencyProgress.update({
        where: { planId_competency: { planId: plan.id, competency: sessionDef.focusCompetency } },
        data: {
          status: "COMPLETED",
          latestTheta: sessionDef.theta,
          percentile: sessionDef.percentile,
          levelEst: sessionDef.levelEst,
          lastSessionId: session.id,
        },
      });

      const reportData = buildSessionReport(sessionDef);
      await client.sessionReport.create({
        data: {
          sessionId: session.id,
          summaryHtml: `<p>${reportData.summary}</p>`,
          summaryJson: reportData as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  const sd = pack.selfDiscovery;
  const discoverStarted = daysAgo(sd.daysAgo + 1);
  const discoverCompleted = daysAgo(sd.daysAgo);

  const discoverSession = await client.selfDiscoverySession.create({
    data: {
      userId: user.id,
      status: "COMPLETED",
      startedAt: discoverStarted,
      completedAt: discoverCompleted,
      profile: {
        create: {
          strengths: sd.profile.strengths,
          weaknesses: sd.profile.weaknesses,
          values: sd.profile.values,
          competencySignals: sd.profile.competencySignals,
          interviewAdvice: sd.profile.interviewAdvice,
          narrativeSummary: sd.profile.narrativeSummary,
        },
      },
    },
  });

  return {
    userId: user.id,
    email: user.email,
    password,
    sessions: sessionNumber,
    responses: totalResponses,
    rounds: rounds.length,
    discoverSessionId: discoverSession.id,
    dashboardUrl: "/dashboard/jobseeker",
  };
}

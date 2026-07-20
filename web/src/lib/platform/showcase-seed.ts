import type { PrismaClient } from "@prisma/client";
import { COMPETENCY_CODES } from "@/types";
import { createDiagnosticWave } from "@/lib/diagnostic/campaigns";
import { SHOWCASE_ORG_NAME, ensureShowcaseOrganization } from "@/lib/platform/showcase-org";
import { generateJoinCode } from "@/lib/org/join-code";

const DEMO_ORG_TAG = "SHOWCASE_DEMO_SEED";

type DemoOrgSpec = {
  name: string;
  kind: "CAREER_CENTER" | "HR_ENTERPRISE";
  percentileBase: number;
  memberNames: string[];
};

const PEER_ORGS: DemoOrgSpec[] = [
  {
    name: "[데모] 한빛공공기관",
    kind: "HR_ENTERPRISE",
    percentileBase: 62,
    memberNames: ["김민수", "이서연", "박준호", "최유진", "정하늘"],
  },
  {
    name: "[데모] 데모대학 취업지원센터",
    kind: "CAREER_CENTER",
    percentileBase: 71,
    memberNames: ["한지우", "오민재", "송다은", "임태양", "류수빈", "강예린"],
  },
  {
    name: "[데모] 넥스트테크 채용팀",
    kind: "HR_ENTERPRISE",
    percentileBase: 79,
    memberNames: ["윤도현", "신채원", "조현우", "배서준", "문지아"],
  },
];

const SHOWCASE_MEMBERS = [
  "데모관리자",
  "이하은",
  "김태민",
  "박서윤",
  "최민호",
  "정수아",
  "한지훈",
];

function emailFor(orgKey: string, index: number) {
  return `showcase-${orgKey}-m${index}@demo.axhrd.local`;
}

async function uniqueJoinCode(db: PrismaClient) {
  for (let i = 0; i < 12; i++) {
    const code = generateJoinCode();
    const exists = await db.organization.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new Error("join code");
}

async function ensureDemoOrg(db: PrismaClient, spec: DemoOrgSpec) {
  const existing = await db.organization.findFirst({ where: { name: spec.name } });
  if (existing) {
    return db.organization.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedAt: existing.approvedAt ?? new Date(),
        diagnosticEnabled: true,
        interviewEnabled: true,
        saasPersonalizationEnabled: true,
        adminNotes: DEMO_ORG_TAG,
      },
    });
  }
  return db.organization.create({
    data: {
      name: spec.name,
      kind: spec.kind,
      joinCode: await uniqueJoinCode(db),
      status: "APPROVED",
      approvedAt: new Date(),
      diagnosticEnabled: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      adminNotes: DEMO_ORG_TAG,
    },
  });
}

function percentileForMember(base: number, index: number, competencyIndex: number) {
  const jitter = ((index * 7 + competencyIndex * 3) % 11) - 5;
  return Math.min(95, Math.max(42, Math.round(base + jitter)));
}

function thetaFromPercentile(pct: number) {
  return (pct - 50) / 25;
}

async function seedOrgCohort(
  db: PrismaClient,
  orgId: string,
  orgKey: string,
  spec: { percentileBase: number; memberNames: string[] },
  opts?: { firstIsAdmin?: boolean },
) {
  let sessions = 0;

  for (let i = 0; i < spec.memberNames.length; i++) {
    const name = spec.memberNames[i];
    const email = emailFor(orgKey, i);
    const isAdmin = opts?.firstIsAdmin && i === 0;

    const user = await db.user.upsert({
      where: { email },
      update: {
        name,
        organizationId: orgId,
        orgRole: isAdmin ? "ADMIN" : "MEMBER",
      },
      create: {
        email,
        name,
        organizationId: orgId,
        orgRole: isAdmin ? "ADMIN" : "MEMBER",
        dataUseConsentAt: new Date(),
      },
    });

    const existingPlan = await db.interviewPlan.findFirst({
      where: { userId: user.id, status: "IN_PROGRESS" },
    });
    const plan =
      existingPlan ??
      (await db.interviewPlan.create({
        data: { userId: user.id, jobRole: "HR", status: "IN_PROGRESS" },
      }));

    const sessionCount = await db.interviewSession.count({ where: { userId: user.id } });
    const hasCompleted = await db.interviewSession.findFirst({
      where: { userId: user.id, status: "COMPLETED" },
    });

    if (!hasCompleted) {
      await db.interviewSession.create({
        data: {
          userId: user.id,
          planId: plan.id,
          sessionNumber: sessionCount + 1,
          status: "COMPLETED",
          jobRole: "HR",
          mode: "COMPETENCY",
          startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          kitOrganizationId: orgId,
        },
      });
      sessions += 1;
    }

    for (let c = 0; c < COMPETENCY_CODES.length; c++) {
      const competency = COMPETENCY_CODES[c];
      const pct = percentileForMember(spec.percentileBase, i, c);
      const theta = thetaFromPercentile(pct);
      const completed = c < 4;

      await db.competencyProgress.upsert({
        where: { planId_competency: { planId: plan.id, competency } },
        update: {
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          latestTheta: theta,
          percentile: pct,
          levelEst: Math.min(5, Math.max(1, Math.round(pct / 20))),
        },
        create: {
          planId: plan.id,
          userId: user.id,
          competency,
          status: completed ? "COMPLETED" : "IN_PROGRESS",
          latestTheta: theta,
          percentile: pct,
          levelEst: Math.min(5, Math.max(1, Math.round(pct / 20))),
        },
      });

      const snapExists = await db.competencySnapshot.findFirst({
        where: { userId: user.id, competency },
      });
      if (!snapExists) {
        await db.competencySnapshot.create({
          data: {
            userId: user.id,
            sessionId: `showcase-${user.id}-${competency}`,
            competency,
            theta,
            se: 0.35,
            levelEst: Math.min(5, Math.max(1, Math.round(pct / 20))),
            percentile: pct,
            recordedAt: new Date(Date.now() - (c + 1) * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  return { members: spec.memberNames.length, sessions };
}

async function seedDiagnosticWave(db: PrismaClient, organizationId: string) {
  const instrument = await db.diagnosticInstrument.findFirst({
    where: { code: "ARC_INDEX" },
  });
  if (!instrument) {
    return { waveId: null, responses: 0, reason: "ARC_INDEX not seeded" };
  }

  const label = "2026 고객 시연 웨이브";
  let wave = await db.diagnosticWave.findFirst({
    where: { organizationId, label },
    include: { teams: true },
  });

  if (!wave) {
    const created = await createDiagnosticWave({
      organizationId,
      instrumentId: instrument.id,
      label,
      status: "OPEN",
      opensAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      closesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      teams: [
        { name: "경영기획실", department: "본부" },
        { name: "인사·조직팀", department: "HR" },
        { name: "DX추진단", department: "혁신" },
      ],
    });
    wave = await db.diagnosticWave.findUniqueOrThrow({
      where: { id: created.id },
      include: { teams: true },
    });
  }

  const items = await db.diagnosticItem.findMany({
    where: {
      section: { instrumentId: instrument.id },
      isDemographic: false,
      scaleType: { not: "OPEN_TEXT" },
    },
    select: { id: true, hasImportanceAxis: true },
  });

  if (items.length === 0) {
    return { waveId: wave.id, responses: 0, reason: "no items" };
  }

  const teamTargets = [
    { teamName: "경영기획실", base: 4.1 },
    { teamName: "인사·조직팀", base: 3.5 },
    { teamName: "DX추진단", base: 4.4 },
  ];

  let responseCount = 0;

  for (const target of teamTargets) {
    const team = wave.teams.find((t) => t.name === target.teamName);
    if (!team) continue;

    for (let r = 0; r < 8; r++) {
      const token = `showcase-${wave.id}-${team.id}-${r}`;
      const existing = await db.diagnosticResponse.findUnique({
        where: { respondentToken: token },
      });
      if (existing?.submittedAt) {
        responseCount += 1;
        continue;
      }

      const response =
        existing ??
        (await db.diagnosticResponse.create({
          data: {
            waveId: wave.id,
            teamId: team.id,
            respondentToken: token,
            demographics: {
              DM01: "4~5급(중간관리)",
              DM02: "3~7년",
              DM03: "지원·행정",
              DM04: "30대",
              DM05: "주 1~2회",
            },
          },
        }));

      const valueShift = (r % 3) - 1;
      for (const item of items) {
        const v = Math.min(5, Math.max(1, Math.round(target.base + valueShift)));
        await db.diagnosticAnswer.upsert({
          where: {
            responseId_itemId_axis: {
              responseId: response.id,
              itemId: item.id,
              axis: "CURRENT",
            },
          },
          create: {
            responseId: response.id,
            itemId: item.id,
            axis: "CURRENT",
            numericValue: v,
          },
          update: { numericValue: v },
        });
        if (item.hasImportanceAxis) {
          await db.diagnosticAnswer.upsert({
            where: {
              responseId_itemId_axis: {
                responseId: response.id,
                itemId: item.id,
                axis: "IMPORTANCE",
              },
            },
            create: {
              responseId: response.id,
              itemId: item.id,
              axis: "IMPORTANCE",
              numericValue: Math.min(5, v + 1),
            },
            update: { numericValue: Math.min(5, v + 1) },
          });
        }
      }

      await db.diagnosticResponse.update({
        where: { id: response.id },
        data: { consentAt: new Date(), submittedAt: new Date() },
      });
      responseCount += 1;
    }
  }

  return { waveId: wave.id, slug: wave.slug, responses: responseCount };
}

/** 고객 시연용 샘플 — 참여 현황·기관 비교·ARC Index 리포트 */
export async function seedShowcaseDemoData(client?: PrismaClient) {
  const db = client ?? (await import("@/lib/prisma")).prisma;

  const showcase = await ensureShowcaseOrganization();
  const peerOrgs = await Promise.all(PEER_ORGS.map((spec) => ensureDemoOrg(db, spec)));

  let totalMembers = 0;
  let totalSessions = 0;

  for (const spec of PEER_ORGS) {
    const org = peerOrgs.find((o) => o.name === spec.name);
    if (!org) continue;
    const key = spec.name.replace(/[^\w]/g, "").slice(0, 12).toLowerCase();
    const result = await seedOrgCohort(db, org.id, key, spec);
    totalMembers += result.members;
    totalSessions += result.sessions;
  }

  const showcaseResult = await seedOrgCohort(
    db,
    showcase.id,
    "axhrd-showcase",
    {
      percentileBase: 86,
      memberNames: SHOWCASE_MEMBERS,
    },
    { firstIsAdmin: true },
  );
  totalMembers += showcaseResult.members;
  totalSessions += showcaseResult.sessions;

  const diagnostic = await seedDiagnosticWave(db, showcase.id);

  return {
    organizations: peerOrgs.length + 1,
    members: totalMembers,
    interviewSessions: totalSessions,
    showcaseOrgId: showcase.id,
    showcaseOrgName: SHOWCASE_ORG_NAME,
    diagnostic,
  };
}

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { generateKitShareSlug } from "@/lib/org/kit-share";
import { SHOWCASE_ORG_NAME } from "@/lib/platform/showcase-org";
import type { SessionReportData } from "@/types";

const DEMO_SHARE_LABEL = "2026 고객 시연 — 마케팅 신입";
const DEMO_MARKER = "[AXHRD_DEMO_CANDIDATE_SCREENING]";

type ApplicantSeed = {
  email: string;
  name: string;
  focusCompetency: string;
  daysAgo: number;
  transcript: string;
  score: number;
};

const APPLICANTS: ApplicantSeed[] = [
  {
    email: "applicant-demo-1@demo.axhrd.local",
    name: "이준서",
    focusCompetency: "COMMUNICATION",
    daysAgo: 4,
    transcript:
      "신규 브랜드 런칭 시 SNS·오프라인 이벤트 메시지를 통일하기 위해 톤앤매너 가이드를 1페이지로 정리해 팀에 공유했습니다.",
    score: 74,
  },
  {
    email: "applicant-demo-2@demo.axhrd.local",
    name: "박서연",
    focusCompetency: "PROBLEM_SOLVING",
    daysAgo: 2,
    transcript:
      "광고 CTR이 하락했을 때 소재·타겟·랜딩을 분리해 보고, 소재 피로도가 원인임을 확인해 크리에이티브를 교체했습니다.",
    score: 68,
  },
  {
    email: "applicant-demo-3@demo.axhrd.local",
    name: "최민재",
    focusCompetency: "JOB_FIT",
    daysAgo: 1,
    transcript:
      "B2B 마케팅에서 고객 여정 맵을 그려 Pain point별 메시지를 설계한 경험이 지원 직무와 맞닿아 있다고 생각합니다.",
    score: 71,
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function buildReport(seed: ApplicantSeed): SessionReportData {
  return {
    summary: `${seed.name} 지원자의 ${seed.focusCompetency} 역량 면접 요약입니다.`,
    sections: [
      {
        title: seed.focusCompetency,
        content: seed.transcript,
        score: seed.score,
      },
    ],
    strengths: ["구체적 사례 제시"],
    improvements: ["정량 성과 보강"],
    nextSteps: ["STAR 구조로 재정리"],
  };
}

/** 쇼케이스 기관 — 인터뷰 킷 공유 + 완료 지원자 세션 데모 */
export async function seedCandidateScreeningDemo(client: PrismaClient) {
  const org = await client.organization.findFirst({
    where: { name: SHOWCASE_ORG_NAME },
  });
  if (!org) {
    return { seeded: false, reason: "showcase org not found" };
  }
  if (!org.saasPersonalizationEnabled) {
    return { seeded: false, reason: "competency SKU disabled on showcase org" };
  }

  let share = await client.orgInterviewKitShare.findFirst({
    where: { organizationId: org.id, label: DEMO_SHARE_LABEL },
  });

  if (!share) {
    share = await client.orgInterviewKitShare.create({
      data: {
        organizationId: org.id,
        slug: generateKitShareSlug(),
        label: DEMO_SHARE_LABEL,
        competencies: ["COMMUNICATION", "PROBLEM_SOLVING", "JOB_FIT"],
        isActive: true,
      },
    });
  }

  const password = hashPassword("Demo2026!");
  let sessionsCreated = 0;

  for (const applicant of APPLICANTS) {
    const existing = await client.interviewSession.findFirst({
      where: {
        orgKitShareId: share.id,
        user: { email: applicant.email },
        status: "COMPLETED",
      },
    });
    if (existing) continue;

    const user = await client.user.upsert({
      where: { email: applicant.email },
      update: { name: applicant.name },
      create: {
        email: applicant.email,
        name: applicant.name,
        passwordHash: password,
        dataUseConsentAt: new Date(),
      },
    });

    const plan = await client.interviewPlan.create({
      data: { userId: user.id, jobRole: "MARKETING", status: "COMPLETED" },
    });

    const completedAt = daysAgo(applicant.daysAgo);
    const startedAt = daysAgo(applicant.daysAgo + 1);

    const session = await client.interviewSession.create({
      data: {
        userId: user.id,
        planId: plan.id,
        sessionNumber: 1,
        status: "COMPLETED",
        jobRole: "MARKETING",
        mode: "COMPETENCY",
        focusCompetency: applicant.focusCompetency,
        setupSelectionText: DEMO_MARKER,
        startedAt,
        completedAt,
        kitOrganizationId: org.id,
        orgKitShareId: share.id,
      },
    });

    await client.responseRecord.create({
      data: {
        sessionId: session.id,
        competency: applicant.focusCompetency,
        level: 3,
        transcript: applicant.transcript,
        rubricScore: applicant.score / 100,
        dimensions: {
          questionIntent: 0.72,
          situationSpecificity: 0.68,
          individualOwnership: 0.7,
          logic: 0.69,
          outcomeQuantification: 0.55,
          delivery: 0.71,
        },
      },
    });

    const report = buildReport(applicant);
    await client.sessionReport.create({
      data: {
        sessionId: session.id,
        summaryHtml: `<p>${report.summary}</p>`,
        summaryJson: report as unknown as Prisma.InputJsonValue,
      },
    });

    sessionsCreated += 1;
  }

  return {
    seeded: true,
    organizationId: org.id,
    shareId: share.id,
    shareLabel: share.label,
    shareSlug: share.slug,
    sessionsCreated,
    candidatesUrl: "/org/candidates",
  };
}

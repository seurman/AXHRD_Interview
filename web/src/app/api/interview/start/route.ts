import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyContext } from "@/lib/company/enrich";
import { initIrtSession } from "@/lib/irt-client";
import { serializeIrtState } from "@/lib/irt-state";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOrCreateActivePlan,
  nextRecommendedCompetency,
  syncInterviewPlan,
} from "@/lib/candidate/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { COMPETENCY_CODES, INDUSTRY_CODES } from "@/types";
import type { CompetencyCode, IndustryCode, ItemParams } from "@/types";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  // 세션 생성은 회사 enrichment + 자소서 저장 + IRT 초기화를 동반하므로
  // 사용자당 과도한 반복 생성을 막는다.
  const rl = checkRateLimit(`interview:start:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "면접 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json();
  const {
    companyName,
    industry,
    jobRole,
    resumeText,
    resumeFileName,
    planId,
    focusCompetency,
  } = body;

  const industryCode: IndustryCode = INDUSTRY_CODES.includes(industry)
    ? industry
    : "OTHER";

  const companyContext = resolveCompanyContext({
    companyName,
    industry: industryCode,
  });

  const existingPlan = planId
    ? await prisma.interviewPlan.findFirst({
        where: { id: planId, userId: user.id },
        include: { targetCompany: true, resume: true },
      })
    : null;

  let targetCompany;
  if (existingPlan?.targetCompanyId && existingPlan.targetCompany) {
    targetCompany = await prisma.targetCompany.update({
      where: { id: existingPlan.targetCompanyId },
      data: {
        name: companyContext.name,
        industry: companyContext.industry,
        industryCode,
        size: companyContext.size,
        interviewStyle: companyContext.interviewStyle,
        enrichedAt: new Date(),
      },
    });
  } else {
    targetCompany = await prisma.targetCompany.create({
      data: {
        userId: user.id,
        name: companyContext.name,
        industry: companyContext.industry,
        industryCode,
        size: companyContext.size,
        interviewStyle: companyContext.interviewStyle,
        enrichedAt: new Date(),
      },
    });
  }

  // 자소서는 선택 사항 — 입력하지 않으면 일반 질문으로 면접을 진행한다.
  // 같은 플랜에 이미 저장된 자소서가 있는데 이번엔 새로 입력하지 않았다면 기존 것을 재사용한다.
  const trimmedResumeText: string | undefined = resumeText?.trim() || undefined;
  let resume: { id: string } | null = null;
  if (trimmedResumeText) {
    if (existingPlan?.resumeId) {
      resume = await prisma.resume.update({
        where: { id: existingPlan.resumeId },
        data: {
          fileName: resumeFileName?.trim() || "paste.txt",
          rawText: trimmedResumeText,
        },
      });
    } else {
      resume = await prisma.resume.create({
        data: {
          userId: user.id,
          fileName: resumeFileName?.trim() || "paste.txt",
          rawText: trimmedResumeText,
        },
      });
    }
  } else if (existingPlan?.resume) {
    resume = existingPlan.resume;
  }

  const plan = await getOrCreateActivePlan({
    userId: user.id,
    targetCompanyId: targetCompany.id,
    resumeId: resume?.id,
    jobRole: jobRole ?? "OTHER",
    planId,
  });

  await syncInterviewPlan({
    planId: plan.id,
    candidateId: user.id,
    companyName: companyContext.name,
    jobRole: jobRole ?? "OTHER",
  });

  const competency =
    (focusCompetency as CompetencyCode) ??
    nextRecommendedCompetency(plan.competencyProgress);

  if (!competency) {
    return NextResponse.json(
      { error: "모든 역량 면접이 완료되었습니다.", planId: plan.id, allDone: true },
      { status: 400 }
    );
  }

  const progressRow = plan.competencyProgress.find((p) => p.competency === competency);
  if (progressRow?.status === "COMPLETED") {
    return NextResponse.json(
      { error: "이미 완료한 역량입니다. 다른 역량을 선택하세요." },
      { status: 400 }
    );
  }

  await prisma.competencyProgress.updateMany({
    where: { planId: plan.id, competency },
    data: { status: "IN_PROGRESS" },
  });

  const sessionCount = await prisma.interviewSession.count({
    where: { userId: user.id },
  });

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      planId: plan.id,
      targetCompanyId: targetCompany.id,
      resumeId: resume?.id,
      jobRole: jobRole ?? "OTHER",
      focusCompetency: competency,
      mode: "COMPETENCY",
      status: "IN_PROGRESS",
      sessionNumber: sessionCount + 1,
      startedAt: new Date(),
    },
  });

  const questions = await prisma.question.findMany({
    where: { isActive: true, competency: { code: competency } },
    include: { competency: true },
  });

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "해당 역량 문항이 없습니다." },
      { status: 500 }
    );
  }

  const itemPool: ItemParams[] = questions.map((q) => ({
    item_id: q.externalId,
    competency: q.competency.code,
    difficulty: q.difficulty,
    discrimination: q.discrimination,
    level: q.level,
  }));

  const priorSnapshots = await prisma.competencySnapshot.findMany({
    where: { userId: user.id, competency },
    orderBy: { recordedAt: "desc" },
    take: 1,
  });

  const priorTheta: Record<string, number> = {};
  if (priorSnapshots[0]) {
    priorTheta[competency] = priorSnapshots[0].theta;
  }

  const irtResult = await initIrtSession({
    sessionId: session.id,
    competencies: [competency],
    itemPool,
    priorTheta,
    focusCompetency: competency,
    mode: "competency",
    minItems: 2,
    maxItems: 3,
  });

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      irtState: serializeIrtState({
        competencies: irtResult.competency_states,
        nextItemId: irtResult.next_item?.item_id,
        administeredIds: [],
        focusCompetency: competency,
        planId: plan.id,
      }),
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    planId: plan.id,
    focusCompetency: competency,
    userId: user.id,
    totalCompetencies: COMPETENCY_CODES.length,
    completedCount: plan.competencyProgress.filter((p) => p.status === "COMPLETED")
      .length,
  });
}

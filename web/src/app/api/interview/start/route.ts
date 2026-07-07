import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyContext } from "@/lib/company/enrich";
import { deriveInterviewStyleFromJD } from "@/lib/company/jd-mapper";
import { initIrtSession } from "@/lib/irt-client";
import { serializeIrtState } from "@/lib/irt-state";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOrCreateActivePlan,
  nextRecommendedCompetency,
  syncInterviewPlan,
} from "@/lib/candidate/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { matchPersona } from "@/lib/interview/persona-archetype";
import { summarizeResume } from "@/lib/interview/resume-summary";
import { parseResumeSummary } from "@/lib/interview/build-question";
import { filterAndRankQuestionPool } from "@/lib/interview/question-pool";
import { COMPETENCY_CODES, INDUSTRY_CODES, JOB_ROLES, COMPANY_SIZE_CODES } from "@/types";
import type {
  CompanyContext,
  CompetencyCode,
  IndustryCode,
  JobRoleCode,
  ItemParams,
  CompanySizeCode,
} from "@/types";

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
    jdText,
    companySize,
  } = body;

  const industryCode: IndustryCode = INDUSTRY_CODES.includes(industry)
    ? industry
    : "OTHER";
  const jobRoleCode: JobRoleCode = (JOB_ROLES as readonly string[]).includes(jobRole)
    ? jobRole
    : "OTHER";

  const sizeCode: CompanySizeCode = (COMPANY_SIZE_CODES as readonly string[]).includes(
    companySize
  )
    ? companySize
    : industryCode === "PUBLIC"
      ? "PUBLIC"
      : "MID";

  const companyContext = resolveCompanyContext({
    companyName,
    industry: industryCode,
    companySize: sizeCode,
  });

  // 지원자 페르소나 — 산업군+직무 조합만으로 결정되는 순수 함수라 매번 새로 계산해도
  // 비용이 들지 않는다(추가 LLM 호출 없음). 채점에는 영향 없음, 화면 뱃지·리포트 코칭용.
  // Prisma의 Json 필드(InputJsonValue)는 인덱스 시그니처가 없는 커스텀 타입을 그대로
  // 받아들이지 않으므로(persona 필드 저장 시 빌드 타입 에러), JSON 왕복으로 순수 JSON
  // 값(plain object)으로 한 번 변환해 저장한다 — 런타임 값은 동일하다.
  const persona = JSON.parse(JSON.stringify(matchPersona(industryCode, jobRoleCode)));

  const existingPlan = planId
    ? await prisma.interviewPlan.findFirst({
        where: { id: planId, userId: user.id },
        include: { targetCompany: true, resume: true },
      })
    : null;

  // JD/인재상 매핑 — 입력하면 세션 시작 시 1회만 Gemini를 호출해 이 회사·직무 전용
  // 면접 스타일(톤·라운드·중점 역량)을 뽑는다. 실패/미입력 시 산업군·회사명 프리셋으로 폴백.
  // 같은 플랜에서 이미 JD 기반으로 설정해둔 스타일이 있는데 이번엔 새로 입력하지 않았다면
  // (역량 2, 3번째 세션 등) 이전 값을 그대로 유지하고, 새 프리셋으로 덮어쓰지 않는다.
  const trimmedJdText: string = typeof jdText === "string" ? jdText.trim() : "";
  let interviewStyle: CompanyContext["interviewStyle"] = companyContext.interviewStyle;
  let resolvedSize: CompanySizeCode = companyContext.size;
  if (trimmedJdText) {
    const derived = await deriveInterviewStyleFromJD({
      jdText: trimmedJdText,
      industryLabel: companyContext.industry,
    });
    if (derived) {
      interviewStyle = derived.interviewStyle;
      if (derived.companySize) resolvedSize = derived.companySize;
    }
  } else if (existingPlan?.targetCompany?.interviewStyle) {
    interviewStyle = existingPlan.targetCompany.interviewStyle as CompanyContext["interviewStyle"];
  }

  let targetCompany;
  if (existingPlan?.targetCompanyId && existingPlan.targetCompany) {
    targetCompany = await prisma.targetCompany.update({
      where: { id: existingPlan.targetCompanyId },
      data: {
        name: companyContext.name,
        industry: companyContext.industry,
        industryCode,
        size: resolvedSize,
        interviewStyle,
        persona,
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
        size: resolvedSize,
        interviewStyle,
        persona,
        enrichedAt: new Date(),
      },
    });
  }

  // 자소서는 선택 사항 — 입력하지 않으면 일반 질문으로 면접을 진행한다.
  // 같은 플랜에 이미 저장된 자소서가 있는데 이번엔 새로 입력하지 않았다면 기존 것을 재사용한다.
  const trimmedResumeText: string | undefined = resumeText?.trim() || undefined;
  let resume: { id: string; parsedTags?: unknown } | null = null;
  if (trimmedResumeText) {
    // 원문을 문항 생성 프롬프트에 그대로 반복 전달하면 OCR/추출 오류가 매번 재사용되므로,
    // 저장 시점에 딱 1번만 구조화된 요약을 만들어 parsedTags(기존에 있었지만 안 쓰이던
    // 필드)에 저장해둔다 — 이후 질문 개인화·연관도 매칭은 이 요약만 읽는다(추가 호출 없음).
    // Prisma Json 필드는 인덱스 시그니처 없는 커스텀 타입을 그대로 받지 않으므로(persona
    // 필드에서 이미 겪은 빌드 에러와 동일한 원인) JSON 왕복으로 순수 JSON 값으로 변환한다.
    const summary = JSON.parse(JSON.stringify(await summarizeResume(trimmedResumeText)));
    if (existingPlan?.resumeId) {
      resume = await prisma.resume.update({
        where: { id: existingPlan.resumeId },
        data: {
          fileName: resumeFileName?.trim() || "paste.txt",
          rawText: trimmedResumeText,
          parsedTags: summary,
        },
      });
    } else {
      resume = await prisma.resume.create({
        data: {
          userId: user.id,
          fileName: resumeFileName?.trim() || "paste.txt",
          rawText: trimmedResumeText,
          parsedTags: summary,
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
    where: { isActive: true, competency: { code: competency, isActive: true } },
    include: { competency: true },
  });

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "해당 역량 문항이 없습니다." },
      { status: 500 }
    );
  }

  // 이 사용자가 이 역량에서 이미 답했던 문항은 기본적으로 제외하고(반복 출제 방지),
  // 남은 후보 중에서는 자소서 요약·직무·JD 중점 역량과 더 관련 있어 보이는 문항을
  // 우선 남긴다. IRT 엔진 자체의 통계적 선택 로직(2PL 정보량 기반)은 그대로 둔다.
  const rankedQuestions = await filterAndRankQuestionPool({
    userId: user.id,
    competency,
    questions,
    resumeSummary: parseResumeSummary(resume?.parsedTags),
    jobRole,
    interviewStyleFocus: interviewStyle.focus,
  });

  const itemPool: ItemParams[] = rankedQuestions.map((q) => ({
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

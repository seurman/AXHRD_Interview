import { prisma } from "@/lib/prisma";
import { resolveCompanyContext } from "@/lib/company/enrich";
import { deriveInterviewStyleFromJD } from "@/lib/company/jd-mapper";
import { initIrtSession } from "@/lib/irt-client";
import { serializeIrtState } from "@/lib/irt-state";
import {
  getOrCreateActivePlan,
  nextRecommendedCompetency,
  syncInterviewPlan,
} from "@/lib/candidate/service";
import { matchPersona } from "@/lib/interview/persona-archetype";
import { summarizeResume } from "@/lib/interview/resume-summary";
import { parseResumeSummary } from "@/lib/interview/build-question";
import { filterAndRankQuestionPool } from "@/lib/interview/question-pool";
import { filterQuestionsByOrgKit } from "@/lib/org/interview-kit";
import {
  appendUserTextRecord,
  formatInterviewSetupText,
} from "@/lib/user-text-archive";
import { COMPETENCY_CODES, INDUSTRY_CODES, JOB_ROLES, COMPANY_SIZE_CODES } from "@/types";
import type {
  CompanyContext,
  IndustryCode,
  JobRoleCode,
  ItemParams,
  CompanySizeCode,
} from "@/types";

export type StartSessionUser = { id: string; organizationId: string | null };

export type StartSessionBody = {
  companyName?: string;
  industry?: string;
  jobRole?: string;
  resumeText?: string;
  resumeFileName?: string;
  planId?: string;
  focusCompetency?: string;
  jdText?: string;
  /** 채용공고 URL — jdText가 짧거나 비어 있으면 서버에서 본문을 가져온다 */
  jdUrl?: string;
  companySize?: string;
};

/** 공유 링크(OrgInterviewKitShare)로 들어온 세션 등, 사용자 본인 소속 기관과
 *  무관하게 특정 기관의 킷을 적용해야 할 때 넘기는 옵션. 둘 다 비우면 기존과
 *  동일하게 사용자 본인 organizationId 기준으로 동작한다. */
export type StartSessionOpts = {
  /** 문항 필터·루브릭에 쓸 기관 — 없으면 user.organizationId 사용 */
  kitOrganizationId?: string | null;
  /** 선택 가능한 역량 코드(NCS·Global·데모 재료화 코드 모두 허용) */
  allowedCompetencies?: readonly string[];
  /** 이 세션이 어느 공유 링크를 통해 시작됐는지 기록(코호트 집계용) */
  orgKitShareId?: string | null;
  /**
   * true면 CompetencyProgress가 없어도 upsert하고,
   * COMPETENCY_CODES 밖 코드(Global 재료화)도 허용한다.
   */
  allowAnyCompetencyCode?: boolean;
  /** 고객 데모 — JD·자소서 enrichment 생략, 문항 풀 단순화 */
  demoMode?: boolean;
  isPresenterDemo?: boolean;
  demoWorkspaceId?: string | null;
};

export type StartSessionResult =
  | {
      ok: true;
      status: 200;
      body: {
        sessionId: string;
        planId: string;
        focusCompetency: string;
        userId: string;
        totalCompetencies: number;
        completedCount: number;
      };
    }
  | { ok: false; status: number; body: Record<string, unknown> };

/** /api/interview/start(본인 세션)와 /api/kit/[slug]/start(공유 링크 세션)가
 *  공유하는 세션 생성 로직. 회사 enrichment → 자소서 저장 → 문항 풀 구성(기관 킷
 *  필터 포함) → IRT 세션 초기화까지 한 번에 처리한다. */
export async function startInterviewSession(
  user: StartSessionUser,
  body: StartSessionBody,
  opts: StartSessionOpts = {}
): Promise<StartSessionResult> {
  const {
    companyName,
    industry,
    jobRole,
    resumeText,
    resumeFileName,
    planId,
    focusCompetency,
    jdText,
    jdUrl: jdUrlBody,
    companySize,
  } = body;

  const industryCode: IndustryCode = INDUSTRY_CODES.includes(industry as IndustryCode)
    ? (industry as IndustryCode)
    : "OTHER";
  const jobRoleCode: JobRoleCode = (JOB_ROLES as readonly string[]).includes(jobRole ?? "")
    ? (jobRole as JobRoleCode)
    : "OTHER";

  const sizeCode: CompanySizeCode = (COMPANY_SIZE_CODES as readonly string[]).includes(
    companySize ?? ""
  )
    ? (companySize as CompanySizeCode)
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
  const persona = JSON.parse(JSON.stringify(matchPersona(industryCode, jobRoleCode)));

  const existingPlan = planId
    ? await prisma.interviewPlan.findFirst({
        where: { id: planId, userId: user.id },
        include: { targetCompany: true, resume: true },
      })
    : null;

  const trimmedJdTextInput: string = typeof jdText === "string" ? jdText.trim() : "";
  const jdUrl = typeof jdUrlBody === "string" ? jdUrlBody.trim() : "";

  let trimmedJdText = trimmedJdTextInput;
  if ((!trimmedJdText || trimmedJdText.length < 40) && jdUrl) {
    const { resolveJdText } = await import("@/lib/company/fetch-jd-url");
    const resolved = await resolveJdText({ jdText: trimmedJdTextInput, jdUrl });
    if (resolved.text) trimmedJdText = resolved.text;
  }
  let interviewStyle: CompanyContext["interviewStyle"] = companyContext.interviewStyle;
  let resolvedSize: CompanySizeCode = companyContext.size;
  if (!opts.demoMode && trimmedJdText) {
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

  const trimmedResumeText: string | undefined = resumeText?.trim() || undefined;
  let resume: { id: string; parsedTags?: unknown } | null = null;
  if (trimmedResumeText) {
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

  const competencyOrder = opts.allowedCompetencies ?? COMPETENCY_CODES;

  let competency = (focusCompetency?.trim().toUpperCase() || undefined) as string | undefined;
  if (competency && opts.allowedCompetencies && !opts.allowedCompetencies.includes(competency)) {
    return {
      ok: false,
      status: 400,
      body: { error: "이 공유 링크에서 지원하지 않는 역량입니다." },
    };
  }
  if (!competency) {
    competency =
      nextRecommendedCompetency(plan.competencyProgress, competencyOrder) ?? undefined;
  }

  if (!competency) {
    return {
      ok: false,
      status: 400,
      body: { error: "모든 역량 면접이 완료되었습니다.", planId: plan.id, allDone: true },
    };
  }

  if (
    !opts.allowAnyCompetencyCode &&
    !(COMPETENCY_CODES as readonly string[]).includes(competency) &&
    !opts.allowedCompetencies?.includes(competency)
  ) {
    return {
      ok: false,
      status: 400,
      body: { error: "지원하지 않는 역량 코드입니다." },
    };
  }

  const bankComp = await prisma.competency.findFirst({
    where: { code: competency, isActive: true },
    select: { id: true },
  });
  if (!bankComp) {
    return {
      ok: false,
      status: 400,
      body: { error: `역량 「${competency}」가 문항 뱅크에 없습니다.` },
    };
  }

  const progressRow = plan.competencyProgress.find((p) => p.competency === competency);
  if (progressRow?.status === "COMPLETED") {
    return {
      ok: false,
      status: 400,
      body: { error: "이미 완료한 역량입니다. 다른 역량을 선택하세요." },
    };
  }

  await prisma.competencyProgress.upsert({
    where: { planId_competency: { planId: plan.id, competency } },
    create: {
      planId: plan.id,
      userId: user.id,
      competency,
      status: "IN_PROGRESS",
    },
    update: { status: "IN_PROGRESS" },
  });

  const sessionCount = await prisma.interviewSession.count({
    where: { userId: user.id },
  });

  const setupSelectionText = formatInterviewSetupText({
    companyName: companyContext.name,
    industry: industryCode,
    jobRole: jobRoleCode,
    companySize: sizeCode,
    competency,
    hasResume: !!trimmedResumeText || !!existingPlan?.resume,
    hasJd: !!trimmedJdText,
  });

  const kitOrganizationId = opts.kitOrganizationId !== undefined
    ? opts.kitOrganizationId
    : user.organizationId;

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      planId: plan.id,
      targetCompanyId: targetCompany.id,
      resumeId: resume?.id,
      jobRole: jobRoleCode,
      focusCompetency: competency,
      mode: "COMPETENCY",
      status: "IN_PROGRESS",
      sessionNumber: sessionCount + 1,
      setupSelectionText,
      startedAt: new Date(),
      kitOrganizationId: kitOrganizationId ?? null,
      orgKitShareId: opts.orgKitShareId ?? null,
      isPresenterDemo: opts.isPresenterDemo ?? false,
      demoWorkspaceId: opts.demoWorkspaceId ?? null,
    },
  });

  void appendUserTextRecord({
    userId: user.id,
    kind: "INTERVIEW_SETUP",
    content: setupSelectionText,
    sourceType: "interview_session",
    sourceId: session.id,
  });

  const questions = await prisma.question.findMany({
    where: { isActive: true, competency: { code: competency, isActive: true } },
    include: { competency: true },
  });

  if (questions.length === 0) {
    return { ok: false, status: 500, body: { error: "해당 역량 문항이 없습니다." } };
  }

  const kitFilteredQuestions = await filterQuestionsByOrgKit({
    organizationId: kitOrganizationId,
    competency,
    questions,
  });

  const rankedQuestions = opts.demoMode
    ? kitFilteredQuestions
    : await filterAndRankQuestionPool({
        userId: user.id,
        competency,
        questions: kitFilteredQuestions,
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

  let irtResult;
  try {
    irtResult = await initIrtSession(
      {
        sessionId: session.id,
        competencies: [competency],
        itemPool,
        priorTheta,
        focusCompetency: competency,
        mode: "competency",
        minItems: 2,
        maxItems: 3,
      },
      opts.demoMode ? { timeoutMs: 28_000, retries: 1 } : undefined,
    );
  } catch (e) {
    console.error("[start-session] IRT init failed:", e);
    await prisma.interviewSession.delete({ where: { id: session.id } }).catch(() => {});
    const prevStatus = progressRow?.status ?? "NOT_STARTED";
    await prisma.competencyProgress.updateMany({
      where: { planId: plan.id, competency, status: "IN_PROGRESS" },
      data: { status: prevStatus },
    });
    return {
      ok: false,
      status: 503,
      body: {
        error:
          "적응형 면접 엔진을 준비하지 못했습니다. 1분 정도 후 다시 시도해 주세요. (첫 요청은 최대 1분 걸릴 수 있습니다.)",
        code: "IRT_UNAVAILABLE",
      },
    };
  }

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

  return {
    ok: true,
    status: 200,
    body: {
      sessionId: session.id,
      planId: plan.id,
      focusCompetency: competency,
      userId: user.id,
      totalCompetencies: COMPETENCY_CODES.length,
      completedCount: plan.competencyProgress.filter((p) => p.status === "COMPLETED").length,
    },
  };
}

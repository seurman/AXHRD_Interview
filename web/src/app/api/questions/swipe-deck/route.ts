import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { INDUSTRY_CODES, JOB_ROLES, COMPANY_SIZE_CODES } from "@/types";
import type { IndustryCode, JobRoleCode, CompanySizeCode } from "@/types";

/**
 * 질문 카드 스와이프 덱 — 사용자가 명시적으로 고른 산업군·직무 조합을 최우선으로 보여준다.
 * 지금은 조합당 문항이 2~4개뿐이라(총 45문항) 그대로면 몇 장 만에 바닥나므로,
 * 우선순위를 낮춰가며 채워서(같은 산업군 → 같은 직무 → 전체) 카드가 마르지 않게 한다.
 * 그래도 다 봤으면(swiped 제외 후 0장) 같은 조합을 다시 보여주되 recycled=true로 표시한다.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const industryParam = searchParams.get("industry") ?? "";
  const jobRoleParam = searchParams.get("jobRole") ?? "";
  const companySizeParam = searchParams.get("companySize") ?? "";
  const competencyParam = (searchParams.get("competency") ?? "").toUpperCase();
  const competencyFilter =
    competencyParam.length > 0 ? competencyParam : null;

  const industry: IndustryCode | null = (INDUSTRY_CODES as readonly string[]).includes(
    industryParam
  )
    ? (industryParam as IndustryCode)
    : null;
  const jobRole: JobRoleCode | null = (JOB_ROLES as readonly string[]).includes(jobRoleParam)
    ? (jobRoleParam as JobRoleCode)
    : null;

  const companySize: CompanySizeCode | null = (
    COMPANY_SIZE_CODES as readonly string[]
  ).includes(companySizeParam)
    ? (companySizeParam as CompanySizeCode)
    : null;

  if (!industry || !jobRole) {
    return NextResponse.json(
      { error: "산업군과 직무를 먼저 선택해 주세요." },
      { status: 400 }
    );
  }

  const TARGET_SIZE = 15;

  const swiped = await prisma.swipeAction.findMany({
    where: { userId: user.id },
    select: { questionId: true },
  });
  const swipedIds = swiped.map((s) => s.questionId);

  const comboCount = await prisma.realInterviewQuestion.count({
    where: { industry, jobRole },
  });

  const picked: Array<{
    id: string;
    industry: string;
    jobRole: string;
    competency: string | null;
    questionText: string;
    sourceName: string | null;
    sourceUrl: string | null;
    isAiExample: boolean;
  }> = [];
  const usedIds = new Set<string>(swipedIds);

  async function addTier(where: Prisma.RealInterviewQuestionWhereInput) {
    if (picked.length >= TARGET_SIZE) return;
    const sizeFilter = companySize
      ? { OR: [{ companySize }, { companySize: null }] }
      : {};
    const rows = await prisma.realInterviewQuestion.findMany({
      where: { ...where, ...sizeFilter, id: { notIn: [...usedIds] } },
      orderBy: [{ isAiExample: "asc" }, { createdAt: "desc" }],
      take: TARGET_SIZE - picked.length,
    });
    for (const r of rows) {
      usedIds.add(r.id);
      picked.push(r);
    }
  }

  // 0순위: 학습 패스에서 지정한 역량 (있으면)
  if (competencyFilter) {
    await addTier({ competency: competencyFilter, industry, jobRole });
    await addTier({ competency: competencyFilter, industry });
    await addTier({ competency: competencyFilter });
  }
  // 1순위: 정확히 고른 산업군+직무
  await addTier({ industry, jobRole });
  // 2순위: 같은 산업군(다른 직무)
  await addTier({ industry });
  // 3순위: 같은 직무(다른 산업군)
  await addTier({ jobRole });
  // 4순위: 전체
  await addTier({});

  let recycled = false;
  if (picked.length === 0) {
    // 완전히 다 본 상태 — 정확한 조합을 다시 보여준다(재열람)
    recycled = true;
    const rows = await prisma.realInterviewQuestion.findMany({
      where: { industry, jobRole },
      orderBy: [{ isAiExample: "asc" }, { createdAt: "desc" }],
      take: TARGET_SIZE,
    });
    picked.push(...rows);
  }

  // 매번 같은 순서로 나오지 않도록 살짝 섞는다(출처 배지 우선순위는 유지할 필요 없음)
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return NextResponse.json({
    deck: picked.map((q) => ({
      id: q.id,
      text: q.questionText,
      industry: q.industry,
      jobRole: q.jobRole,
    })),
    comboCount,
    recycled,
  });
}

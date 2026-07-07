import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { INDUSTRY_CODES, COMPETENCY_CODES } from "@/types";
import type { CompetencyCode, IndustryCode } from "@/types";

const JOB_ROLES = [
  "MARKETING",
  "DEVELOPMENT",
  "BUSINESS_SUPPORT",
  "SALES",
  "DESIGN",
  "HR",
  "FINANCE",
  "OTHER",
] as const;

/** 설정 화면에서 실전 질문 참고를 보여주기 위한 조회 전용 엔드포인트.
 *  IRT 채점 문항 뱅크(Question)와는 무관 — 순수 참고용 미리보기다. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const industryParam = searchParams.get("industry") ?? "";
  const jobRoleParam = searchParams.get("jobRole") ?? "";

  const industry: IndustryCode = (INDUSTRY_CODES as readonly string[]).includes(
    industryParam
  )
    ? (industryParam as IndustryCode)
    : "OTHER";
  const jobRole = (JOB_ROLES as readonly string[]).includes(jobRoleParam)
    ? jobRoleParam
    : "OTHER";

  const questions = await prisma.realInterviewQuestion.findMany({
    where: { industry, jobRole: jobRole as (typeof JOB_ROLES)[number] },
    orderBy: [{ isAiExample: "asc" }, { createdAt: "desc" }],
    take: 6,
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      text: q.questionText,
      competency: (COMPETENCY_CODES as readonly string[]).includes(q.competency ?? "")
        ? (q.competency as CompetencyCode)
        : null,
    })),
  });
}

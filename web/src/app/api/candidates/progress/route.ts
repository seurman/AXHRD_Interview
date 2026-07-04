import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { COMPETENCY_CODES } from "@/types";
import { competencyLabel } from "@/lib/labels";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");

  const userWithPlans = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      interviewPlans: {
        where: planId ? { id: planId } : { status: "IN_PROGRESS" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          competencyProgress: { orderBy: { competency: "asc" } },
          targetCompany: true,
        },
      },
    },
  });

  if (!userWithPlans) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const plan = userWithPlans.interviewPlans[0];

  if (!plan) {
    return NextResponse.json({
      found: true,
      userId: user.id,
      name: user.name,
      plan: null,
      competencies: COMPETENCY_CODES.map((code) => ({
        code,
        label: competencyLabel(code),
        status: "NOT_STARTED",
      })),
    });
  }

  const progressMap = Object.fromEntries(
    plan.competencyProgress.map((p) => [p.competency, p])
  );

  return NextResponse.json({
    found: true,
    userId: user.id,
    name: user.name,
    plan: {
      id: plan.id,
      status: plan.status,
      companyName: plan.targetCompany?.name,
      completedCount: plan.competencyProgress.filter((p) => p.status === "COMPLETED")
        .length,
      total: COMPETENCY_CODES.length,
    },
    competencies: COMPETENCY_CODES.map((code) => {
      const p = progressMap[code];
      return {
        code,
        label: competencyLabel(code),
        status: p?.status ?? "NOT_STARTED",
        levelEst: p?.levelEst,
        percentile: p?.percentile,
        completedAt: p?.completedAt,
      };
    }),
  });
}

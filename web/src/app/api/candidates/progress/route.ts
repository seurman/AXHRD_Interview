import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES } from "@/types";
import { competencyLabel } from "@/lib/labels";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const planId = searchParams.get("planId");

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
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

  if (!user) {
    return NextResponse.json({
      found: false,
      competencies: COMPETENCY_CODES.map((code) => ({
        code,
        label: competencyLabel(code),
        status: "NOT_STARTED",
      })),
    });
  }

  const plan = user.interviewPlans[0];

  if (!plan) {
    return NextResponse.json({
      found: true,
      userId: user.id,
      name: user.name,
      email: user.email,
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
    email: user.email,
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

export async function POST(req: Request) {
  const { email, name, phone } = await req.json();

  if (!email?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "이름과 이메일 필수" }, { status: 400 });
  }

  const { upsertCandidate } = await import("@/lib/candidate/service");
  const user = await upsertCandidate({ email, name, phone });

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
}

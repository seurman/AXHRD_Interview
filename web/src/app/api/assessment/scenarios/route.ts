import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/** 응시 가능한 역량평가 시나리오 목록 — 플랫폼 공용 + 본인 소속 기관 전용 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }

  const scenarios = await prisma.assessmentScenario.findMany({
    where: {
      isActive: true,
      status: "PUBLISHED",
      OR: [
        { organizationId: null },
        ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      kind: true,
      titleKo: true,
      roleContext: true,
      durationMinutes: true,
      maxTurns: true,
      personaName: true,
      personaRole: true,
      competencies: {
        orderBy: { sortOrder: "asc" },
        select: { competencyCode: true, nameKo: true },
      },
      _count: { select: { inBasketItems: true } },
    },
  });

  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      scenarioId: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      report: { select: { overallScore: true } },
    },
  });

  return NextResponse.json({
    scenarios: scenarios.map((s) => ({
      id: s.id,
      code: s.code,
      kind: s.kind,
      titleKo: s.titleKo,
      roleContext: s.roleContext,
      durationMinutes: s.durationMinutes,
      maxTurns: s.maxTurns,
      personaName: s.personaName,
      personaRole: s.personaRole,
      itemCount: s._count.inBasketItems,
      competencies: s.competencies.map((c) => ({
        code: c.competencyCode,
        nameKo: c.nameKo,
      })),
    })),
    attempts: attempts.map((a) => ({
      id: a.id,
      scenarioId: a.scenarioId,
      status: a.status,
      createdAt: a.createdAt,
      submittedAt: a.submittedAt,
      overallScore: a.report?.overallScore ?? null,
    })),
  });
}

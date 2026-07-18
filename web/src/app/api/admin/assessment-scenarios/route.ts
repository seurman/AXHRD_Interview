import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  SCENARIO_WITH_FRAMEWORK_INCLUDE,
} from "@/lib/assessment/load-scenario-context";
import { toAdminScenarioDto } from "@/lib/assessment/admin-scenario-service";

/** 플랫폼 관리자 — 평가 과제 목록 */
export async function GET(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const kind = url.searchParams.get("kind");

  const scenarios = await prisma.assessmentScenario.findMany({
    where: {
      organizationId: null,
      ...(status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED"
        ? { status }
        : {}),
      ...(kind === "ROLE_PLAY" || kind === "IN_BASKET" ? { kind } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });

  return NextResponse.json({
    scenarios: scenarios.map(toAdminScenarioDto),
  });
}

/** 빈 초안 수동 생성 */
export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "IN_BASKET" ? "IN_BASKET" : "ROLE_PLAY";
  const titleKo =
    typeof body.titleKo === "string" && body.titleKo.trim()
      ? body.titleKo.trim()
      : kind === "IN_BASKET"
        ? "새 서류함 과제"
        : "새 역할연기 과제";

  const stamp = Date.now().toString(36).toUpperCase();
  const code = `${kind === "IN_BASKET" ? "IB" : "RP"}_MANUAL_${stamp}`;

  const scenario = await prisma.assessmentScenario.create({
    data: {
      code,
      kind,
      status: "DRAFT",
      isActive: false,
      titleKo,
      taskBrief: "과제 브리핑을 입력하세요.",
      reportKindLabel:
        kind === "IN_BASKET"
          ? "ASSESSMENT REPORT · 서류함 과제"
          : "ASSESSMENT REPORT · 역할수행 과제",
      durationMinutes: kind === "IN_BASKET" ? 30 : 15,
      maxTurns: 6,
      personaName: kind === "ROLE_PLAY" ? "상대역" : null,
    },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "CREATE",
    entityType: "assessment_scenario",
    entityId: scenario.id,
    summary: `평가 과제 초안 생성: ${scenario.code}`,
    beforeState: null,
    afterState: { id: scenario.id, code: scenario.code, kind: scenario.kind },
  });

  return NextResponse.json({ scenario: toAdminScenarioDto(scenario) });
}

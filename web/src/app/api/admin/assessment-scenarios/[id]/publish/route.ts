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
import { validateScenarioForPublish } from "@/lib/assessment/scenario-publish";
import { toAdminScenarioDto } from "@/lib/assessment/admin-scenario-service";

type Ctx = { params: Promise<{ id: string }> };

/** 게시 — 검증 통과 시 PUBLISHED + isActive */
export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const unpublish = body.unpublish === true;

  const scenario = await prisma.assessmentScenario.findUnique({
    where: { id },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  if (!scenario || scenario.organizationId) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  if (unpublish) {
    const updated = await prisma.assessmentScenario.update({
      where: { id },
      data: { status: "DRAFT", isActive: false },
      include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
    });
    await logAdminAudit({
      actor: auditActor(auth),
      action: "UPDATE",
      entityType: "assessment_scenario",
      entityId: id,
      summary: `평가 과제 게시 취소: ${updated.code}`,
      beforeState: { status: scenario.status, isActive: scenario.isActive },
      afterState: { status: updated.status, isActive: updated.isActive },
    });
    return NextResponse.json({ scenario: toAdminScenarioDto(updated) });
  }

  const issues = validateScenarioForPublish(scenario);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: "게시 조건을 충족하지 않습니다.", issues },
      { status: 400 },
    );
  }

  const updated = await prisma.assessmentScenario.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      isActive: true,
      publishedAt: scenario.publishedAt ?? new Date(),
      version: scenario.status === "PUBLISHED" ? scenario.version : scenario.version,
    },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "assessment_scenario",
    entityId: id,
    summary: `평가 과제 게시: ${updated.code}`,
    beforeState: { status: scenario.status, isActive: scenario.isActive },
    afterState: {
      status: updated.status,
      isActive: updated.isActive,
      publishedAt: updated.publishedAt,
    },
  });

  return NextResponse.json({ scenario: toAdminScenarioDto(updated) });
}

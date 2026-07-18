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
import {
  toAdminScenarioDto,
  updateScenarioAdmin,
  type AdminScenarioUpdateInput,
} from "@/lib/assessment/admin-scenario-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await ctx.params;
  const scenario = await prisma.assessmentScenario.findUnique({
    where: { id },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
  if (!scenario || scenario.organizationId) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ scenario: toAdminScenarioDto(scenario) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as AdminScenarioUpdateInput;

  try {
    const before = await prisma.assessmentScenario.findUnique({ where: { id } });
    if (!before || before.organizationId) {
      return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
    }
    const scenario = await updateScenarioAdmin(id, body);
    await logAdminAudit({
      actor: auditActor(auth),
      action: "UPDATE",
      entityType: "assessment_scenario",
      entityId: id,
      summary: `평가 과제 수정: ${scenario.code}`,
      beforeState: { titleKo: before.titleKo, status: before.status, version: before.version },
      afterState: {
        titleKo: scenario.titleKo,
        status: scenario.status,
        version: scenario.version,
      },
    });
    return NextResponse.json({ scenario: toAdminScenarioDto(scenario) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "수정 실패" },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await ctx.params;
  const existing = await prisma.assessmentScenario.findUnique({ where: { id } });
  if (!existing || existing.organizationId) {
    return NextResponse.json({ error: "과제를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.assessmentScenario.update({
    where: { id },
    data: { status: "ARCHIVED", isActive: false },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "assessment_scenario",
    entityId: id,
    summary: `평가 과제 보관: ${updated.code}`,
    beforeState: { status: existing.status, isActive: existing.isActive },
    afterState: { status: updated.status, isActive: updated.isActive },
  });

  return NextResponse.json({ scenario: toAdminScenarioDto(updated) });
}

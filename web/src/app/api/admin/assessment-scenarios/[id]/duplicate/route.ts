import { NextResponse } from "next/server";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  duplicateScenario,
  toAdminScenarioDto,
} from "@/lib/assessment/admin-scenario-service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await ctx.params;
  try {
    const scenario = await duplicateScenario(id);
    await logAdminAudit({
      actor: auditActor(auth),
      action: "CREATE",
      entityType: "assessment_scenario",
      entityId: scenario.id,
      summary: `평가 과제 복제: ${scenario.code}`,
      beforeState: { sourceId: id },
      afterState: { id: scenario.id, code: scenario.code },
    });
    return NextResponse.json({ scenario: toAdminScenarioDto(scenario) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "복제 실패" },
      { status: 400 },
    );
  }
}

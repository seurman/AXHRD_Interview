import { NextResponse } from "next/server";
import { computeAggregateScores } from "@/lib/diagnostic/aggregate";
import { resolveReportConfigForWave } from "@/lib/diagnostic/report-profile";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId") ?? undefined;

  const config = await resolveReportConfigForWave(id);
  const result = await computeAggregateScores({
    waveId: id,
    teamId: teamId || undefined,
    minGroupSize: config?.minGroupSize,
  });

  return NextResponse.json(result);
}

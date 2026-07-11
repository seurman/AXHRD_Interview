import { NextResponse } from "next/server";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import { computeLongitudinalComparison } from "@/lib/diagnostic/longitudinal";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const comparison = await computeLongitudinalComparison(id);
  return NextResponse.json(comparison);
}

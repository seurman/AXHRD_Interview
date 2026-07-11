import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import { computeLongitudinalComparison } from "@/lib/diagnostic/longitudinal";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const access = await resolveDiagnosticAccess(user, null);
  if (!access.allowed) {
    return NextResponse.json(
      { error: DIAGNOSTIC_ACCESS_ERRORS[access.reason], code: access.reason },
      { status: 403 },
    );
  }

  const wave = await prisma.diagnosticWave.findFirst({
    where: { id, organizationId: access.organizationId },
  });
  if (!wave) return NextResponse.json({ error: "웨이브를 찾을 수 없습니다." }, { status: 404 });

  const comparison = await computeLongitudinalComparison(id);
  return NextResponse.json(comparison);
}

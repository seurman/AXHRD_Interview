import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import {
  addTeamsToWave,
  campaignErrorResponse,
  teamLinksFromWave,
} from "@/lib/diagnostic/campaigns";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = {
  teams?: Array<{ name: string; department?: string; divisionName?: string; unitName?: string }>;
};

export async function POST(req: Request, ctx: Ctx) {
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

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const incoming = Array.isArray(body.teams) ? body.teams : [];

  try {
    const { wave, teams } = await addTeamsToWave(
      id,
      incoming.map((t) => ({
        name: typeof t.name === "string" ? t.name : "",
        department: typeof t.department === "string" ? t.department : null,
        divisionName: typeof t.divisionName === "string" ? t.divisionName : null,
        unitName: typeof t.unitName === "string" ? t.unitName : null,
      })),
      { organizationId: access.organizationId },
    );

    const baseUrl = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      teams: teamLinksFromWave(wave, teams, baseUrl),
    });
  } catch (e) {
    const err = campaignErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

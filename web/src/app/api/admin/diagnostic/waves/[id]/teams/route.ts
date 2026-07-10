import { NextResponse } from "next/server";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import {
  addTeamsToWave,
  campaignErrorResponse,
  teamLinksFromWave,
} from "@/lib/diagnostic/campaigns";

type Ctx = { params: Promise<{ id: string }> };

type PostBody = { names?: string[] };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const names = Array.isArray(body.names)
    ? body.names.map((n) => (typeof n === "string" ? n.trim() : "")).filter(Boolean)
    : [];

  try {
    const { wave, teams } = await addTeamsToWave(
      id,
      names.map((name) => ({ name })),
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

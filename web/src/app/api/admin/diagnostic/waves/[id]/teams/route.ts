import { NextResponse } from "next/server";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import {
  addTeamsToWave,
  campaignErrorResponse,
  teamLinksFromWave,
  type TeamInput,
} from "@/lib/diagnostic/campaigns";

type Ctx = { params: Promise<{ id: string }> };

type TeamBodyRow = {
  name?: string;
  divisionName?: string;
  unitName?: string;
  department?: string;
};

type PostBody = {
  /** 하위호환 — 평면 팀명 목록 */
  names?: string[];
  /** 하이어라키 팀 목록 */
  teams?: TeamBodyRow[];
};

function normalizeTeamRows(body: PostBody): TeamInput[] {
  if (Array.isArray(body.teams) && body.teams.length > 0) {
    return body.teams
      .map((t) => ({
        name: typeof t.name === "string" ? t.name.trim() : "",
        divisionName:
          typeof t.divisionName === "string" && t.divisionName.trim()
            ? t.divisionName.trim()
            : null,
        unitName:
          typeof t.unitName === "string" && t.unitName.trim() ? t.unitName.trim() : null,
        department:
          typeof t.department === "string" && t.department.trim()
            ? t.department.trim()
            : null,
      }))
      .filter((t) => t.name.length > 0);
  }

  const names = Array.isArray(body.names)
    ? body.names.map((n) => (typeof n === "string" ? n.trim() : "")).filter(Boolean)
    : [];
  return names.map((name) => ({ name }));
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PostBody;
  const teams = normalizeTeamRows(body);

  try {
    const { wave, teams: created } = await addTeamsToWave(id, teams);
    const baseUrl = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      teams: teamLinksFromWave(wave, created, baseUrl),
    });
  } catch (e) {
    const err = campaignErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

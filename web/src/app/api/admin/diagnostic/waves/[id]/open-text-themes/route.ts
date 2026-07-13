import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeOpenTextThemes } from "@/lib/diagnostic/theme-mining";
import { buildHierarchyIndex, resolveLeafTeamIds, type HierarchyNode } from "@/lib/diagnostic/aggregate";
import { requireDiagnosticConsoleRead } from "@/lib/diagnostic/admin-access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 주관식 테마 분석 — 리포트 최초 로딩에 포함하지 않고 사용자가 해당 섹션을 열 때만 지연 호출한다
 * (Gemini 호출이 초당 여러 건 걸릴 수 있어 스코어 API와 분리).
 */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticConsoleRead();
  if ("error" in auth && auth.error) return auth.error;

  const { id: waveId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId") ?? undefined;

  let leafTeamIds: string[] | null = null;
  if (teamId) {
    const hierarchyRows: HierarchyNode[] = await prisma.diagnosticTeam.findMany({
      where: { waveId },
      select: { id: true, name: true, level: true, parentId: true, department: true },
    });
    const { byId, childrenOf } = buildHierarchyIndex(hierarchyRows);
    leafTeamIds = resolveLeafTeamIds(teamId, byId, childrenOf);
  }

  const report = await analyzeOpenTextThemes(waveId, leafTeamIds);
  return NextResponse.json(report);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import {
  campaignErrorResponse,
  parseWaveDate,
  patchDiagnosticWave,
  teamLinksFromWave,
} from "@/lib/diagnostic/campaigns";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { waveStatusLabel } from "@/lib/diagnostic/wave-status";
import { resolveReportConfigForWave } from "@/lib/diagnostic/report-profile";
import { countInviteLinks } from "@/lib/diagnostic/collection-rate";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
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
    include: {
      teams: { orderBy: { name: "asc" } },
      instrument: true,
      _count: { select: { responses: { where: { submittedAt: { not: null } } } } },
    },
  });
  if (!wave) return NextResponse.json({ error: "웨이브를 찾을 수 없습니다." }, { status: 404 });

  const baseUrl = new URL(req.url).origin;
  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  const reportConfig = await resolveReportConfigForWave(wave.id);
  const leafTeams = wave.teams.filter((t) => t.level === "TEAM");
  const inviteLinkCount = countInviteLinks(leafTeams.length);
  return NextResponse.json({
    wave: {
      id: wave.id,
      slug: wave.slug,
      waveNumber: wave.waveNumber,
      label: wave.label,
      status: wave.status,
      statusLabel: waveStatusLabel(wave.status),
      opensAt: wave.opensAt?.toISOString() ?? null,
      closesAt: wave.closesAt?.toISOString() ?? null,
      enabledSectionCodes: enabled,
      sectionBadge: sectionBadgeLabel(reportConfig?.activeSectionCodes ?? enabled),
      reportConfig,
      responseCount: wave._count.responses,
      inviteLinkCount,
      minGroupSize: reportConfig?.minGroupSize ?? wave.instrument.minGroupSize,
      orgWideLink: `${baseUrl}/diagnosis/w/${wave.slug}`,
      teams: teamLinksFromWave(wave, leafTeams, baseUrl),
      // 사업본부·사업부·팀 전체 트리 — 하이어라키 드릴다운 UI용
      hierarchy: wave.teams.map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department,
        slug: t.slug,
        level: t.level,
        parentId: t.parentId,
      })),
    },
  });
}

type PatchBody = {
  status?: "DRAFT" | "OPEN" | "CLOSED";
  label?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  enabledSectionCodes?: string[];
};

export async function PATCH(req: Request, ctx: Ctx) {
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

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  try {
    const updated = await patchDiagnosticWave(
      id,
      {
        status: body.status,
        label: typeof body.label === "string" ? body.label : undefined,
        opensAt: body.opensAt !== undefined ? parseWaveDate(body.opensAt) : undefined,
        closesAt: body.closesAt !== undefined ? parseWaveDate(body.closesAt) : undefined,
        enabledSectionCodes: body.enabledSectionCodes,
      },
      { organizationId: access.organizationId },
    );

    const enabled = parseEnabledSectionCodes(updated.enabledSectionCodes);
    return NextResponse.json({
      ok: true,
      wave: {
        id: updated.id,
        status: updated.status,
        statusLabel: waveStatusLabel(updated.status),
        label: updated.label,
        opensAt: updated.opensAt?.toISOString() ?? null,
        closesAt: updated.closesAt?.toISOString() ?? null,
        enabledSectionCodes: enabled,
        sectionBadge: sectionBadgeLabel(enabled),
      },
    });
  } catch (e) {
    const err = campaignErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

import { NextResponse } from "next/server";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import {
  campaignErrorResponse,
  parseWaveDate,
  patchDiagnosticWave,
  teamLinksFromWave,
} from "@/lib/diagnostic/campaigns";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { waveStatusLabel } from "@/lib/diagnostic/wave-status";
import { resolveReportConfigForWave } from "@/lib/diagnostic/report-profile";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const baseUrl = new URL(req.url).origin;

  const wave = await prisma.diagnosticWave.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
      },
      instrument: { select: { id: true, nameKo: true, code: true, minGroupSize: true } },
      teams: { orderBy: { name: "asc" } },
      _count: { select: { responses: { where: { submittedAt: { not: null } } } } },
    },
  });
  if (!wave) return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });

  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  const reportConfig = await resolveReportConfigForWave(wave.id);

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
      instrumentVersionSnapshot: wave.instrumentVersionSnapshot,
      reportConfig,
      responseCount: wave._count.responses,
      minGroupSize: reportConfig?.minGroupSize ?? wave.instrument.minGroupSize,
      orgWideLink: `${baseUrl}/diagnosis/w/${wave.slug}`,
      organization: { id: wave.organization.id, name: wave.organization.name },
      memberCount: wave.organization._count.members,
      instrument: wave.instrument,
      teams: teamLinksFromWave(wave, wave.teams, baseUrl),
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
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  try {
    const updated = await patchDiagnosticWave(id, {
      status: body.status,
      label: typeof body.label === "string" ? body.label : undefined,
      opensAt: body.opensAt !== undefined ? parseWaveDate(body.opensAt) : undefined,
      closesAt: body.closesAt !== undefined ? parseWaveDate(body.closesAt) : undefined,
      enabledSectionCodes: body.enabledSectionCodes,
    });

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

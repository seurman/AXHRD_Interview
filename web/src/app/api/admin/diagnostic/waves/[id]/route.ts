import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { waveStatusLabel } from "@/lib/diagnostic/wave-status";

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
      sectionBadge: sectionBadgeLabel(enabled),
      responseCount: wave._count.responses,
      minGroupSize: wave.instrument.minGroupSize,
      orgWideLink: `${baseUrl}/diagnosis/w/${wave.slug}`,
      organization: { id: wave.organization.id, name: wave.organization.name },
      memberCount: wave.organization._count.members,
      instrument: wave.instrument,
      teams: wave.teams.map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department,
        slug: t.slug,
        link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
      })),
    },
  });
}

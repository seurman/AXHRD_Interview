import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { deriveInitialWaveStatus, waveStatusLabel } from "@/lib/diagnostic/wave-status";
import { waveSlug } from "@/lib/diagnostic/slug";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function waveListDto(
  wave: {
    id: string;
    slug: string;
    waveNumber: number;
    label: string | null;
    status: string;
    opensAt: Date | null;
    closesAt: Date | null;
    enabledSectionCodes: unknown;
    organization: { id: string; name: string };
    instrument: { nameKo: string };
    _count: { responses: number; teams: number };
  },
  baseUrl: string,
) {
  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  return {
    id: wave.id,
    slug: wave.slug,
    waveNumber: wave.waveNumber,
    label: wave.label,
    status: wave.status,
    statusLabel: waveStatusLabel(wave.status as "DRAFT" | "OPEN" | "CLOSED"),
    opensAt: wave.opensAt?.toISOString() ?? null,
    closesAt: wave.closesAt?.toISOString() ?? null,
    enabledSectionCodes: enabled,
    sectionBadge: sectionBadgeLabel(enabled),
    organizationId: wave.organization.id,
    organizationName: wave.organization.name,
    instrumentName: wave.instrument.nameKo,
    teamCount: wave._count.teams,
    responseCount: wave._count.responses,
    orgWideLink: `${baseUrl}/diagnosis/w/${wave.slug}`,
  };
}

export async function GET(req: Request) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const baseUrl = new URL(req.url).origin;
  const waves = await prisma.diagnosticWave.findMany({
    include: {
      organization: { select: { id: true, name: true } },
      instrument: { select: { nameKo: true } },
      _count: {
        select: {
          teams: true,
          responses: { where: { submittedAt: { not: null } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ waves: waves.map((w) => waveListDto(w, baseUrl)) });
}

type PostBody = {
  organizationId?: string;
  instrumentId?: string;
  enabledSectionCodes?: string[];
  label?: string;
  opensAt?: string | null;
  closesAt?: string | null;
};

export async function POST(req: Request) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  const instrumentId = typeof body.instrumentId === "string" ? body.instrumentId.trim() : "";
  if (!organizationId || !instrumentId) {
    return NextResponse.json({ error: "기관과 진단도구를 선택해 주세요." }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  const instrument = await prisma.diagnosticInstrument.findUnique({
    where: { id: instrumentId },
    include: { sections: { select: { code: true } } },
  });
  if (!instrument) return NextResponse.json({ error: "진단도구를 찾을 수 없습니다." }, { status: 404 });

  const sectionCodes = new Set(instrument.sections.map((s) => s.code));
  let enabledSectionCodes: string[] | null = null;
  if (Array.isArray(body.enabledSectionCodes) && body.enabledSectionCodes.length > 0) {
    enabledSectionCodes = body.enabledSectionCodes.filter((c) => sectionCodes.has(c));
    if (enabledSectionCodes.length === 0) {
      return NextResponse.json({ error: "활성 섹션을 1개 이상 선택해 주세요." }, { status: 400 });
    }
  }

  const opensAt = parseDate(body.opensAt);
  const closesAt = parseDate(body.closesAt);
  const status = deriveInitialWaveStatus(opensAt, closesAt);

  const last = await prisma.diagnosticWave.findFirst({
    where: { organizationId, instrumentId },
    orderBy: { waveNumber: "desc" },
    select: { waveNumber: true },
  });
  const waveNumber = (last?.waveNumber ?? 0) + 1;
  const slug = waveSlug(organizationId, waveNumber);

  const wave = await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: { diagnosticEnabled: true },
    });
    return tx.diagnosticWave.create({
      data: {
        instrumentId,
        organizationId,
        waveNumber,
        slug,
        label: typeof body.label === "string" ? body.label.trim() || null : null,
        status,
        opensAt,
        closesAt,
        enabledSectionCodes: enabledSectionCodes ?? undefined,
      },
      include: {
        organization: { select: { id: true, name: true } },
        instrument: { select: { nameKo: true } },
        _count: {
          select: {
            teams: true,
            responses: { where: { submittedAt: { not: null } } },
          },
        },
      },
    });
  });

  const baseUrl = new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    message: "ARC Index 조직진단이 생성되었습니다.",
    wave: waveListDto(wave, baseUrl),
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import {
  campaignErrorResponse,
  createDiagnosticWave,
  normalizeEnabledDemographicItemCodes,
  normalizeEnabledSectionCodes,
  parseWaveDate,
  waveListDto,
  CampaignError,
} from "@/lib/diagnostic/campaigns";

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
          teams: { where: { level: "TEAM" } },
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
  enabledDemographicItemCodes?: string[];
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

  try {
    const instrument = await prisma.diagnosticInstrument.findUnique({
      where: { id: instrumentId },
      include: { sections: { select: { code: true } } },
    });
    if (!instrument) throw new CampaignError("INSTRUMENT_NOT_FOUND", "진단도구를 찾을 수 없습니다.");

    const enabled = normalizeEnabledSectionCodes(
      body.enabledSectionCodes,
      new Set(instrument.sections.map((s) => s.code)),
    );
    if (Array.isArray(body.enabledSectionCodes) && body.enabledSectionCodes.length > 0 && !enabled) {
      return NextResponse.json({ error: "활성 섹션을 1개 이상 선택해 주세요." }, { status: 400 });
    }

    const enabledDemographic = normalizeEnabledDemographicItemCodes(
      body.enabledDemographicItemCodes,
    );

    const wave = await createDiagnosticWave({
      organizationId,
      instrumentId,
      label: typeof body.label === "string" ? body.label : null,
      enabledSectionCodes: enabled,
      enabledDemographicItemCodes: enabledDemographic,
      opensAt: parseWaveDate(body.opensAt),
      closesAt: parseWaveDate(body.closesAt),
    });

    const baseUrl = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      message: "ARC Index 조직진단이 생성되었습니다.",
      wave: waveListDto(wave, baseUrl),
    });
  } catch (e) {
    const err = campaignErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

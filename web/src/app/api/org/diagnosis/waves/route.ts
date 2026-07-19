import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  DIAGNOSTIC_ACCESS_ERRORS,
  resolveDiagnosticAccess,
} from "@/lib/diagnostic/org-access";
import {
  campaignErrorResponse,
  createDiagnosticWave,
  normalizeEnabledSectionCodes,
  parseWaveDate,
  waveListDto,
  CampaignError,
} from "@/lib/diagnostic/campaigns";

function accessError(reason: string) {
  return NextResponse.json(
    {
      error: DIAGNOSTIC_ACCESS_ERRORS[reason as keyof typeof DIAGNOSTIC_ACCESS_ERRORS] ?? "권한이 없습니다.",
      code: reason,
    },
    { status: 403 },
  );
}

async function resolveAccess(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const access = await resolveDiagnosticAccess(user, organizationId);
  if (!access.allowed) return { error: accessError(access.reason) };
  return { user, access };
}

export async function GET(req: Request) {
  const resolved = await resolveAccess(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const baseUrl = new URL(req.url).origin;
  const waves = await prisma.diagnosticWave.findMany({
    where: { organizationId: access.organizationId },
    include: {
      organization: { select: { id: true, name: true } },
      instrument: { select: { nameKo: true } },
      teams: { orderBy: { name: "asc" } },
      _count: {
        select: {
          teams: { where: { level: "TEAM" } },
          responses: { where: { submittedAt: { not: null } } },
        },
      },
    },
    orderBy: { waveNumber: "desc" },
  });

  return NextResponse.json({
    organizationId: access.organizationId,
    organizationName: access.organizationName,
    waves: waves.map((w) => waveListDto(w, baseUrl)),
  });
}

type PostBody = {
  label?: string;
  teams?: Array<{ name: string; department?: string; divisionName?: string; unitName?: string }>;
  enabledSectionCodes?: string[];
  opensAt?: string | null;
  closesAt?: string | null;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  estimatedResponses?: number | null;
};

export async function POST(req: Request) {
  const resolved = await resolveAccess(req);
  if ("error" in resolved && resolved.error) return resolved.error;
  const { access } = resolved;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const teams = Array.isArray(body.teams) ? body.teams : [];

  try {
    const instrument = await prisma.diagnosticInstrument.findUnique({
      where: { code: "ARC_INDEX" },
      include: { sections: { select: { code: true } } },
    });
    if (!instrument) {
      throw new CampaignError("INSTRUMENT_NOT_FOUND", "ARC Index 문항뱅크가 시드되지 않았습니다. 운영팀에 문의하세요.");
    }

    const enabled = normalizeEnabledSectionCodes(
      body.enabledSectionCodes,
      new Set(instrument.sections.map((s) => s.code)),
    );
    if (Array.isArray(body.enabledSectionCodes) && body.enabledSectionCodes.length > 0 && !enabled) {
      return NextResponse.json({ error: "활성 섹션을 1개 이상 선택해 주세요." }, { status: 400 });
    }

    const wave = await createDiagnosticWave({
      organizationId: access.organizationId,
      instrumentId: instrument.id,
      label: typeof body.label === "string" ? body.label : null,
      enabledSectionCodes: enabled,
      opensAt: parseWaveDate(body.opensAt),
      closesAt: parseWaveDate(body.closesAt),
      status: body.status === "OPEN" ? "OPEN" : body.status === "CLOSED" ? "CLOSED" : undefined,
      estimatedResponses:
        typeof body.estimatedResponses === "number" ? body.estimatedResponses : null,
      teams: teams.map((t) => ({
        name: typeof t.name === "string" ? t.name : "",
        department: typeof t.department === "string" ? t.department : null,
        divisionName: typeof t.divisionName === "string" ? t.divisionName : null,
        unitName: typeof t.unitName === "string" ? t.unitName : null,
      })),
    });

    const baseUrl = new URL(req.url).origin;
    return NextResponse.json({ ok: true, wave: waveListDto(wave, baseUrl) });
  } catch (e) {
    const err = campaignErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

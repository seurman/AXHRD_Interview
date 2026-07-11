import { NextResponse } from "next/server";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";
import {
  REPORT_PRESETS,
  upsertInstrumentDefaultProfile,
  type ReportTab,
} from "@/lib/diagnostic/report-profile";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const instruments = await prisma.diagnosticInstrument.findMany({
    include: {
      reportProfiles: {
        where: { isInstrumentDefault: true },
        take: 1,
      },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json({
    presets: REPORT_PRESETS,
    instruments: instruments.map((i) => ({
      id: i.id,
      code: i.code,
      nameKo: i.nameKo,
      defaultProfile: i.reportProfiles[0] ?? null,
    })),
  });
}

type PostBody = {
  instrumentId?: string;
  waveId?: string;
  presetCode?: string | null;
  name?: string;
  activeTabs?: ReportTab[];
  activeSectionCodes?: string[] | null;
  minGroupSize?: number | null;
  showNarratives?: boolean;
  showGapMatrix?: boolean;
};

export async function POST(req: Request) {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const instrumentId = typeof body.instrumentId === "string" ? body.instrumentId.trim() : "";
  const waveId = typeof body.waveId === "string" ? body.waveId.trim() : "";

  if (waveId) {
    const { upsertWaveReportProfile } = await import("@/lib/diagnostic/report-profile");
    const profile = await upsertWaveReportProfile(waveId, body);
    if (!profile) {
      return NextResponse.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, profile });
  }

  if (!instrumentId) {
    return NextResponse.json({ error: "instrumentId 또는 waveId가 필요합니다." }, { status: 400 });
  }

  const profile = await upsertInstrumentDefaultProfile(instrumentId, body);
  return NextResponse.json({ ok: true, profile });
}

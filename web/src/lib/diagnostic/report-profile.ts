import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseEnabledSectionCodes } from "@/lib/diagnostic/section-filter";
import { ARC_SECTION_CODES } from "@/lib/diagnostic/campaigns";

export type ReportTab = "basic" | "detail" | "teams";

export type ResolvedReportConfig = {
  profileId: string | null;
  name: string;
  presetCode: string | null;
  activeTabs: ReportTab[];
  activeSectionCodes: string[] | null;
  minGroupSize: number;
  showNarratives: boolean;
  showGapMatrix: boolean;
  instrumentVersion: string | null;
  instrumentVersionSnapshot: string | null;
};

export const REPORT_PRESETS: Array<{
  code: string;
  name: string;
  activeTabs: ReportTab[];
  activeSectionCodes: string[] | null;
  showNarratives: boolean;
  showGapMatrix: boolean;
}> = [
  {
    code: "arc_standard",
    name: "ARC Index 표준",
    activeTabs: ["basic", "detail", "teams"],
    activeSectionCodes: [...ARC_SECTION_CODES],
    showNarratives: true,
    showGapMatrix: true,
  },
  {
    code: "four_axis_summary",
    name: "4축 요약만",
    activeTabs: ["basic"],
    activeSectionCodes: [...ARC_SECTION_CODES],
    showNarratives: false,
    showGapMatrix: false,
  },
  {
    code: "team_compare",
    name: "팀 비교 강조",
    activeTabs: ["basic", "teams"],
    activeSectionCodes: [...ARC_SECTION_CODES],
    showNarratives: true,
    showGapMatrix: true,
  },
  {
    code: "ohi_only",
    name: "OHI 집중",
    activeTabs: ["basic", "detail"],
    activeSectionCodes: ["OHI"],
    showNarratives: true,
    showGapMatrix: false,
  },
];

function parseTabs(raw: unknown): ReportTab[] {
  if (!Array.isArray(raw)) return ["basic", "detail", "teams"];
  const valid = raw.filter((t): t is ReportTab => t === "basic" || t === "detail" || t === "teams");
  return valid.length > 0 ? valid : ["basic", "detail", "teams"];
}

type ProfileRow = {
  id: string;
  name: string;
  presetCode: string | null;
  activeTabs: unknown;
  activeSectionCodes: unknown;
  minGroupSize: number | null;
  showNarratives: boolean;
  showGapMatrix: boolean;
};

function profileToConfig(
  profile: ProfileRow,
  instrumentMinGroupSize: number,
  instrumentVersion: string | null,
  instrumentVersionSnapshot: string | null,
  waveEnabledFallback: string[] | null,
): ResolvedReportConfig {
  const profileSections = parseEnabledSectionCodes(profile.activeSectionCodes);
  return {
    profileId: profile.id,
    name: profile.name,
    presetCode: profile.presetCode,
    activeTabs: parseTabs(profile.activeTabs),
    activeSectionCodes: profileSections ?? waveEnabledFallback,
    minGroupSize: profile.minGroupSize ?? instrumentMinGroupSize,
    showNarratives: profile.showNarratives,
    showGapMatrix: profile.showGapMatrix,
    instrumentVersion,
    instrumentVersionSnapshot,
  };
}

export async function resolveReportConfigForWave(waveId: string): Promise<ResolvedReportConfig | null> {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id: waveId },
    include: {
      instrument: true,
      reportProfile: true,
    },
  });
  if (!wave) return null;

  const waveEnabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  const instrument = wave.instrument;

  if (wave.reportProfile) {
    return profileToConfig(
      wave.reportProfile,
      instrument.minGroupSize,
      instrument.version,
      wave.instrumentVersionSnapshot,
      waveEnabled,
    );
  }

  const defaultProfile = await prisma.diagnosticReportProfile.findFirst({
    where: { instrumentId: instrument.id, isInstrumentDefault: true },
  });

  if (defaultProfile) {
    return profileToConfig(
      defaultProfile,
      instrument.minGroupSize,
      instrument.version,
      wave.instrumentVersionSnapshot,
      waveEnabled,
    );
  }

  return {
    profileId: null,
    name: "기본",
    presetCode: null,
    activeTabs: ["basic", "detail", "teams"],
    activeSectionCodes: waveEnabled,
    minGroupSize: instrument.minGroupSize,
    showNarratives: true,
    showGapMatrix: true,
    instrumentVersion: instrument.version,
    instrumentVersionSnapshot: wave.instrumentVersionSnapshot,
  };
}

function jsonSectionCodes(codes: string[] | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (codes === null) return Prisma.JsonNull;
  if (codes === undefined) return Prisma.JsonNull;
  return codes as Prisma.InputJsonValue;
}

export async function upsertWaveReportProfile(
  waveId: string,
  input: {
    presetCode?: string | null;
    name?: string;
    activeTabs?: ReportTab[];
    activeSectionCodes?: string[] | null;
    minGroupSize?: number | null;
    showNarratives?: boolean;
    showGapMatrix?: boolean;
  },
) {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id: waveId },
    include: { reportProfile: true, instrument: true },
  });
  if (!wave) return null;

  const preset = input.presetCode
    ? REPORT_PRESETS.find((p) => p.code === input.presetCode)
    : undefined;

  const sectionCodes =
    input.activeSectionCodes !== undefined
      ? input.activeSectionCodes
      : preset?.activeSectionCodes ??
        parseEnabledSectionCodes(wave.reportProfile?.activeSectionCodes) ??
        parseEnabledSectionCodes(wave.enabledSectionCodes);

  const data = {
    name: input.name ?? preset?.name ?? wave.reportProfile?.name ?? "캠페인 보고서",
    presetCode: input.presetCode ?? wave.reportProfile?.presetCode ?? preset?.code ?? null,
    activeTabs: input.activeTabs ?? preset?.activeTabs ?? parseTabs(wave.reportProfile?.activeTabs),
    activeSectionCodes: jsonSectionCodes(sectionCodes),
    minGroupSize: input.minGroupSize ?? wave.reportProfile?.minGroupSize ?? null,
    showNarratives: input.showNarratives ?? preset?.showNarratives ?? wave.reportProfile?.showNarratives ?? true,
    showGapMatrix: input.showGapMatrix ?? preset?.showGapMatrix ?? wave.reportProfile?.showGapMatrix ?? true,
  };

  if (wave.reportProfile) {
    return prisma.diagnosticReportProfile.update({
      where: { id: wave.reportProfile.id },
      data,
    });
  }

  return prisma.diagnosticReportProfile.create({
    data: {
      instrumentId: wave.instrumentId,
      waveId: wave.id,
      isInstrumentDefault: false,
      ...data,
    },
  });
}

export async function upsertInstrumentDefaultProfile(
  instrumentId: string,
  input: {
    presetCode?: string | null;
    name?: string;
    activeTabs?: ReportTab[];
    activeSectionCodes?: string[] | null;
    minGroupSize?: number | null;
    showNarratives?: boolean;
    showGapMatrix?: boolean;
  },
) {
  const preset = input.presetCode
    ? REPORT_PRESETS.find((p) => p.code === input.presetCode)
    : undefined;

  const existing = await prisma.diagnosticReportProfile.findFirst({
    where: { instrumentId, isInstrumentDefault: true },
  });

  const sectionCodes =
    input.activeSectionCodes !== undefined
      ? input.activeSectionCodes
      : preset?.activeSectionCodes ??
        parseEnabledSectionCodes(existing?.activeSectionCodes) ??
        [...ARC_SECTION_CODES];

  const data = {
    name: input.name ?? preset?.name ?? existing?.name ?? "ARC Index 표준",
    presetCode: input.presetCode ?? existing?.presetCode ?? preset?.code ?? "arc_standard",
    activeTabs: input.activeTabs ?? preset?.activeTabs ?? parseTabs(existing?.activeTabs),
    activeSectionCodes: jsonSectionCodes(sectionCodes),
    minGroupSize: input.minGroupSize ?? existing?.minGroupSize ?? null,
    showNarratives: input.showNarratives ?? preset?.showNarratives ?? existing?.showNarratives ?? true,
    showGapMatrix: input.showGapMatrix ?? preset?.showGapMatrix ?? existing?.showGapMatrix ?? true,
  };

  if (existing) {
    return prisma.diagnosticReportProfile.update({ where: { id: existing.id }, data });
  }

  return prisma.diagnosticReportProfile.create({
    data: { instrumentId, isInstrumentDefault: true, ...data },
  });
}

export function isSectionEnabledInReport(code: string, config: ResolvedReportConfig): boolean {
  if (!config.activeSectionCodes?.length) return true;
  return config.activeSectionCodes.includes(code);
}

export function isTabEnabledInReport(tab: ReportTab, config: ResolvedReportConfig): boolean {
  return config.activeTabs.includes(tab);
}

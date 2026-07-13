import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseEnabledSectionCodes } from "@/lib/diagnostic/section-filter";
import { ARC_SECTION_CODES } from "@/lib/diagnostic/campaigns";

export type ReportTab = "summary" | "ohi" | "ori" | "ovi" | "oai" | "orgs" | "prescription";

/** DB에 저장된 구 탭 ID → 신규 탭 (하위 호환) */
const LEGACY_TAB_MAP: Record<string, ReportTab> = {
  basic: "summary",
  detail: "ohi",
  teams: "orgs",
  prescription: "prescription",
};

export const ALL_REPORT_TABS: ReportTab[] = [
  "summary",
  "ohi",
  "ori",
  "ovi",
  "oai",
  "orgs",
  "prescription",
];

export const REPORT_TAB_LABELS: Record<ReportTab, string> = {
  summary: "종합",
  ohi: "OHI",
  ori: "ORI",
  ovi: "OVI",
  oai: "OAI",
  orgs: "조직별",
  prescription: "처방",
};

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
    activeTabs: ["summary", "ohi", "ori", "ovi", "oai", "orgs", "prescription"],
    activeSectionCodes: [...ARC_SECTION_CODES],
    showNarratives: true,
    showGapMatrix: true,
  },
  {
    code: "four_axis_summary",
    name: "4축 요약만",
    activeTabs: ["summary"],
    activeSectionCodes: [...ARC_SECTION_CODES],
    showNarratives: false,
    showGapMatrix: false,
  },
  {
    code: "team_compare",
    name: "팀 비교 강조",
    activeTabs: ["summary", "orgs"],
    activeSectionCodes: [...ARC_SECTION_CODES],
    showNarratives: true,
    showGapMatrix: true,
  },
  {
    code: "ohi_only",
    name: "OHI 집중",
    activeTabs: ["summary", "ohi"],
    activeSectionCodes: ["OHI"],
    showNarratives: true,
    showGapMatrix: false,
  },
];

const ALL_TABS: ReportTab[] = ALL_REPORT_TABS;

function isReportTab(t: string): t is ReportTab {
  return ALL_REPORT_TABS.includes(t as ReportTab);
}

function parseTabs(raw: unknown): ReportTab[] {
  if (!Array.isArray(raw)) return ALL_TABS;
  const hadLegacyDetail = raw.includes("detail");
  const migrated = new Set<ReportTab>();
  for (const t of raw) {
    if (typeof t !== "string") continue;
    if (isReportTab(t)) migrated.add(t);
    else if (LEGACY_TAB_MAP[t]) migrated.add(LEGACY_TAB_MAP[t]);
  }
  if (hadLegacyDetail) {
    for (const axis of ["ohi", "ori", "ovi", "oai"] as ReportTab[]) migrated.add(axis);
  }
  if (raw.includes("teams")) migrated.add("orgs");
  const list = [...migrated];
  return list.length > 0 ? list : ALL_TABS;
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
    activeTabs: ALL_TABS,
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

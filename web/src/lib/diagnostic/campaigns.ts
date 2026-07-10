import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { deriveInitialWaveStatus, waveStatusLabel } from "@/lib/diagnostic/wave-status";
import { uniqueSlug, waveSlug } from "@/lib/diagnostic/slug";
import type { DiagnosticWaveStatus } from "@prisma/client";

export const ARC_SECTION_CODES = ["OHI", "ORI", "OVI", "OAI"] as const;

export function parseWaveDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeEnabledSectionCodes(
  requested: string[] | undefined | null,
  validCodes: Set<string>,
): string[] | null {
  if (!Array.isArray(requested) || requested.length === 0) return null;
  const filtered = requested.filter((c) => validCodes.has(c));
  return filtered.length > 0 ? filtered : null;
}

export type TeamInput = { name: string; department?: string | null };

export type CreateWaveInput = {
  organizationId: string;
  instrumentId: string;
  label?: string | null;
  enabledSectionCodes?: string[] | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  status?: DiagnosticWaveStatus;
  teams?: TeamInput[];
  /** 수퍼어드민 캠페인 생성 시 SKU 자동 활성화 */
  enableDiagnosticSku?: boolean;
};

type WaveListRow = {
  id: string;
  slug: string;
  waveNumber: number;
  label: string | null;
  status: DiagnosticWaveStatus;
  opensAt: Date | null;
  closesAt: Date | null;
  enabledSectionCodes: unknown;
  organization: { id: string; name: string };
  instrument: { nameKo: string };
  teams?: Array<{ id: string; name: string; department: string | null; slug: string }>;
  _count: { responses: number; teams: number };
};

export function waveListDto(wave: WaveListRow, baseUrl: string) {
  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  return {
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
    organizationId: wave.organization.id,
    organizationName: wave.organization.name,
    instrumentName: wave.instrument.nameKo,
    teamCount: wave._count.teams,
    responseCount: wave._count.responses,
    orgWideLink: `${baseUrl}/diagnosis/w/${wave.slug}`,
    teams:
      wave.teams?.map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department,
        slug: t.slug,
        link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
      })) ?? undefined,
  };
}

export async function createDiagnosticWave(input: CreateWaveInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new CampaignError("ORG_NOT_FOUND", "기관을 찾을 수 없습니다.");

  const instrument = await prisma.diagnosticInstrument.findUnique({
    where: { id: input.instrumentId },
    include: { sections: { select: { code: true } } },
  });
  if (!instrument) throw new CampaignError("INSTRUMENT_NOT_FOUND", "진단도구를 찾을 수 없습니다.");

  const sectionCodes = new Set(instrument.sections.map((s) => s.code));
  const enabledSectionCodes = normalizeEnabledSectionCodes(
    input.enabledSectionCodes ?? undefined,
    sectionCodes,
  );

  const opensAt = input.opensAt ?? null;
  const closesAt = input.closesAt ?? null;
  const status =
    input.status ?? deriveInitialWaveStatus(opensAt, closesAt);

  const last = await prisma.diagnosticWave.findFirst({
    where: { organizationId: input.organizationId, instrumentId: input.instrumentId },
    orderBy: { waveNumber: "desc" },
    select: { waveNumber: true },
  });
  const waveNumber = (last?.waveNumber ?? 0) + 1;
  const slug = waveSlug(input.organizationId, waveNumber);

  const teamRows = buildTeamRows(input.teams ?? []);

  return prisma.$transaction(async (tx) => {
    if (input.enableDiagnosticSku) {
      await tx.organization.update({
        where: { id: input.organizationId },
        data: { diagnosticEnabled: true },
      });
    }

    return tx.diagnosticWave.create({
      data: {
        instrumentId: input.instrumentId,
        organizationId: input.organizationId,
        waveNumber,
        slug,
        label: input.label?.trim() || null,
        status,
        opensAt,
        closesAt,
        enabledSectionCodes: enabledSectionCodes ?? undefined,
        teams: teamRows.length > 0 ? { create: teamRows } : undefined,
      },
      include: {
        organization: { select: { id: true, name: true } },
        instrument: { select: { nameKo: true } },
        teams: { orderBy: { name: "asc" } },
        _count: {
          select: {
            teams: true,
            responses: { where: { submittedAt: { not: null } } },
          },
        },
      },
    });
  });
}

function buildTeamRows(teams: TeamInput[]) {
  const slugSet = new Set<string>();
  const rows: Array<{ name: string; department: string | null; slug: string }> = [];
  for (const t of teams) {
    const name = t.name.trim();
    if (!name) continue;
    rows.push({
      name,
      department: t.department?.trim() || null,
      slug: uniqueSlug(name, slugSet),
    });
  }
  return rows;
}

export async function addTeamsToWave(
  waveId: string,
  teams: TeamInput[],
  opts?: { organizationId?: string },
) {
  const wave = await prisma.diagnosticWave.findFirst({
    where: {
      id: waveId,
      ...(opts?.organizationId ? { organizationId: opts.organizationId } : {}),
    },
    include: { teams: { select: { slug: true } } },
  });
  if (!wave) throw new CampaignError("WAVE_NOT_FOUND", "웨이브를 찾을 수 없습니다.");

  const slugSet = new Set(wave.teams.map((t) => t.slug));
  const rows = buildTeamRows(teams);
  if (rows.length === 0) {
    throw new CampaignError("EMPTY_TEAMS", "팀 이름을 입력해 주세요.");
  }

  const created = await prisma.$transaction(
    rows.map((row) =>
      prisma.diagnosticTeam.create({
        data: {
          waveId: wave.id,
          name: row.name,
          department: row.department,
          slug: row.slug,
        },
      }),
    ),
  );

  return { wave, teams: created };
}

export type PatchWaveInput = {
  status?: DiagnosticWaveStatus;
  label?: string | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  enabledSectionCodes?: string[] | null;
};

export async function patchDiagnosticWave(
  waveId: string,
  patch: PatchWaveInput,
  opts?: { organizationId?: string },
) {
  const wave = await prisma.diagnosticWave.findFirst({
    where: {
      id: waveId,
      ...(opts?.organizationId ? { organizationId: opts.organizationId } : {}),
    },
    include: {
      instrument: { include: { sections: { select: { code: true } } } },
    },
  });
  if (!wave) throw new CampaignError("WAVE_NOT_FOUND", "웨이브를 찾을 수 없습니다.");

  const data: {
    status?: DiagnosticWaveStatus;
    label?: string | null;
    opensAt?: Date | null;
    closesAt?: Date | null;
    enabledSectionCodes?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  } = {};

  if (patch.status) data.status = patch.status;
  if (patch.label !== undefined) data.label = patch.label?.trim() || null;
  if (patch.opensAt !== undefined) data.opensAt = patch.opensAt;
  if (patch.closesAt !== undefined) data.closesAt = patch.closesAt;
  if (patch.enabledSectionCodes !== undefined) {
    const valid = new Set(wave.instrument.sections.map((s) => s.code));
    const normalized = normalizeEnabledSectionCodes(
      patch.enabledSectionCodes ?? undefined,
      valid,
    );
    data.enabledSectionCodes =
      normalized === null ? Prisma.JsonNull : (normalized as Prisma.InputJsonValue);
  }

  return prisma.diagnosticWave.update({
    where: { id: waveId },
    data,
    include: {
      organization: { select: { id: true, name: true } },
      instrument: { select: { id: true, nameKo: true, code: true, minGroupSize: true } },
      teams: { orderBy: { name: "asc" } },
      _count: { select: { responses: { where: { submittedAt: { not: null } } } } },
    },
  });
}

export class CampaignError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CampaignError";
  }
}

export function campaignErrorResponse(e: unknown) {
  if (e instanceof CampaignError) {
    const status =
      e.code === "ORG_NOT_FOUND" || e.code === "WAVE_NOT_FOUND"
        ? 404
        : e.code === "INSTRUMENT_NOT_FOUND"
          ? 404
          : 400;
    return { status, body: { error: e.message, code: e.code } };
  }
  throw e;
}

export function teamLinksFromWave(
  wave: { slug: string },
  teams: Array<{ id: string; name: string; department: string | null; slug: string }>,
  baseUrl: string,
) {
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    department: t.department,
    slug: t.slug,
    link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
  }));
}

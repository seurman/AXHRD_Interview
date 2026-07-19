import { prisma } from "@/lib/prisma";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  DEMOGRAPHIC_ITEM_CODES,
  parseEnabledDemographicItemCodes,
  parseEnabledSectionCodes,
  sectionBadgeLabel,
} from "@/lib/diagnostic/section-filter";
import { deriveInitialWaveStatus, waveStatusLabel } from "@/lib/diagnostic/wave-status";
import { uniqueSlug, waveSlug } from "@/lib/diagnostic/slug";
import type { DiagnosticWaveStatus } from "@prisma/client";

type Tx = Prisma.TransactionClient;
/** Supabase transaction pooler는 interactive $transaction 이 끊길 수 있어 평면 쿼리에도 사용 */
type Db = Tx | PrismaClient;

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

const VALID_DEMOGRAPHIC_CODES = new Set<string>(DEMOGRAPHIC_ITEM_CODES);

export function normalizeEnabledDemographicItemCodes(
  requested: string[] | undefined | null,
): string[] | null {
  if (!Array.isArray(requested) || requested.length === 0) return null;
  const filtered = requested.filter((c) => VALID_DEMOGRAPHIC_CODES.has(c));
  return filtered.length > 0 ? filtered : null;
}

export type TeamInput = {
  name: string;
  department?: string | null;
  /** 사업본부 — 생략하면 하이어라키 없이 팀만 평면 생성(기존 동작과 100% 호환) */
  divisionName?: string | null;
  /** 사업부 — divisionName 없이 unitName만 줘도 2단계(사업부→팀)로 생성 가능 */
  unitName?: string | null;
};

export type HierarchyNodeDto = {
  id: string;
  name: string;
  department: string | null;
  slug: string;
  level: "DIVISION" | "UNIT" | "TEAM";
  parentId: string | null;
};

export type CreateWaveInput = {
  organizationId: string;
  instrumentId: string;
  label?: string | null;
  enabledSectionCodes?: string[] | null;
  enabledDemographicItemCodes?: string[] | null;
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
  enabledDemographicItemCodes?: unknown;
  organization: { id: string; name: string };
  instrument: { nameKo: string };
  teams?: Array<{
    id: string;
    name: string;
    department: string | null;
    slug: string;
    level?: "DIVISION" | "UNIT" | "TEAM";
    parentId?: string | null;
  }>;
  _count: { responses: number; teams: number };
};

export function waveListDto(wave: WaveListRow, baseUrl: string) {
  const enabled = parseEnabledSectionCodes(wave.enabledSectionCodes);
  const allNodes = wave.teams ?? [];
  const leafTeams = allNodes.filter((t) => (t.level ?? "TEAM") === "TEAM");
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
    enabledDemographicItemCodes: parseEnabledDemographicItemCodes(wave.enabledDemographicItemCodes),
    sectionBadge: sectionBadgeLabel(enabled),
    organizationId: wave.organization.id,
    organizationName: wave.organization.name,
    instrumentName: wave.instrument.nameKo,
    // teams 관계를 안 불러온 목록 쿼리(예: 관리자 전체 웨이브 목록)에서도 정확하도록 _count 우선 사용
    teamCount: wave.teams ? leafTeams.length : wave._count.teams,
    responseCount: wave._count.responses,
    orgWideLink: `${baseUrl}/diagnosis/w/${wave.slug}`,
    // 팀(리프)만 — 실제 응답 링크가 있는 노드
    teams: leafTeams.map((t) => ({
      id: t.id,
      name: t.name,
      department: t.department,
      slug: t.slug,
      link: `${baseUrl}/diagnosis/w/${wave.slug}/t/${t.slug}`,
    })),
    // 사업본부·사업부·팀 전체 트리 — 하이어라키 드릴다운 UI용
    hierarchy: allNodes.map((t) => ({
      id: t.id,
      name: t.name,
      department: t.department,
      slug: t.slug,
      level: t.level ?? "TEAM",
      parentId: t.parentId ?? null,
    })),
  };
}

export async function createDiagnosticWave(input: CreateWaveInput, db: Db = prisma) {
  const org = await db.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new CampaignError("ORG_NOT_FOUND", "기관을 찾을 수 없습니다.");

  const instrument = await db.diagnosticInstrument.findUnique({
    where: { id: input.instrumentId },
    include: { sections: { select: { code: true } } },
  });
  if (!instrument) throw new CampaignError("INSTRUMENT_NOT_FOUND", "진단도구를 찾을 수 없습니다.");

  const sectionCodes = new Set(instrument.sections.map((s) => s.code));
  const enabledSectionCodes = normalizeEnabledSectionCodes(
    input.enabledSectionCodes ?? undefined,
    sectionCodes,
  );
  const enabledDemographicItemCodes = normalizeEnabledDemographicItemCodes(
    input.enabledDemographicItemCodes ?? undefined,
  );

  const opensAt = input.opensAt ?? null;
  const closesAt = input.closesAt ?? null;
  const status =
    input.status ?? deriveInitialWaveStatus(opensAt, closesAt);

  const last = await db.diagnosticWave.findFirst({
    where: { organizationId: input.organizationId, instrumentId: input.instrumentId },
    orderBy: { waveNumber: "desc" },
    select: { waveNumber: true },
  });
  const waveNumber = (last?.waveNumber ?? 0) + 1;
  const slug = waveSlug(input.organizationId, waveNumber);

  // PgBouncer/Supabase pooler: interactive $transaction 대신 순차 쿼리 (materialize.ts 와 동일)
  if (input.enableDiagnosticSku) {
    await db.organization.update({
      where: { id: input.organizationId },
      data: { diagnosticEnabled: true },
    });
  }

  const created = await db.diagnosticWave.create({
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
      enabledDemographicItemCodes: enabledDemographicItemCodes ?? undefined,
      instrumentVersionSnapshot: instrument.version,
    },
  });

  await createHierarchyTeams(db, created.id, input.teams ?? [], new Set());

  return db.diagnosticWave.findUniqueOrThrow({
    where: { id: created.id },
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
  });
}

/**
 * 사업본부(DIVISION) → 사업부(UNIT) → 팀(TEAM) 순으로 없는 노드만 생성하고, 리프(TEAM) 행을 리턴한다.
 * 같은 이름의 사업본부/사업부가 여러 입력 행에 걸쳐 반복돼도 노드가 중복 생성되지 않도록 이름으로 dedupe한다.
 * divisionName/unitName을 안 주면 기존과 동일하게 평면 팀(level=TEAM, parentId=null)만 생성된다.
 */
async function createHierarchyTeams(
  db: Db,
  waveId: string,
  teams: TeamInput[],
  existingSlugs: Set<string>,
) {
  const divisionByName = new Map<string, string>(); // name -> id
  const unitByKey = new Map<string, string>(); // `${divisionName ?? ""}::${unitName}` -> id
  const createdLeaves: Array<{ id: string }> = [];

  for (const t of teams) {
    const name = t.name.trim();
    if (!name) continue;
    const divisionName = t.divisionName?.trim() || null;
    const unitName = t.unitName?.trim() || null;

    let parentId: string | null = null;

    if (divisionName) {
      let divisionId = divisionByName.get(divisionName);
      if (!divisionId) {
        const existing = await db.diagnosticTeam.findFirst({
          where: { waveId, level: "DIVISION", name: divisionName },
          select: { id: true },
        });
        if (existing) {
          divisionId = existing.id;
        } else {
          const row = await db.diagnosticTeam.create({
            data: {
              waveId,
              name: divisionName,
              level: "DIVISION",
              slug: uniqueSlug(divisionName, existingSlugs),
            },
            select: { id: true },
          });
          divisionId = row.id;
        }
        divisionByName.set(divisionName, divisionId);
      }
      parentId = divisionId;
    }

    if (unitName) {
      const unitKey = `${divisionName ?? ""}::${unitName}`;
      let unitId = unitByKey.get(unitKey);
      if (!unitId) {
        const existing = await db.diagnosticTeam.findFirst({
          where: { waveId, level: "UNIT", name: unitName, parentId },
          select: { id: true },
        });
        if (existing) {
          unitId = existing.id;
        } else {
          const row = await db.diagnosticTeam.create({
            data: {
              waveId,
              name: unitName,
              level: "UNIT",
              parentId,
              slug: uniqueSlug(unitName, existingSlugs),
            },
            select: { id: true },
          });
          unitId = row.id;
        }
        unitByKey.set(unitKey, unitId);
      }
      parentId = unitId;
    }

    const leaf = await db.diagnosticTeam.create({
      data: {
        waveId,
        name,
        department: t.department?.trim() || null,
        level: "TEAM",
        parentId,
        slug: uniqueSlug(name, existingSlugs),
      },
      select: { id: true },
    });
    createdLeaves.push(leaf);
  }

  return createdLeaves;
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

  const cleaned = teams.filter((t) => t.name.trim());
  if (cleaned.length === 0) {
    throw new CampaignError("EMPTY_TEAMS", "팀 이름을 입력해 주세요.");
  }

  const slugSet = new Set(wave.teams.map((t) => t.slug));
  const createdIds = await createHierarchyTeams(prisma, wave.id, cleaned, slugSet);

  const created = await prisma.diagnosticTeam.findMany({
    where: { id: { in: createdIds.map((c) => c.id) } },
  });

  return { wave, teams: created };
}

export type PatchWaveInput = {
  status?: DiagnosticWaveStatus;
  label?: string | null;
  opensAt?: Date | null;
  closesAt?: Date | null;
  enabledSectionCodes?: string[] | null;
  enabledDemographicItemCodes?: string[] | null;
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
    enabledDemographicItemCodes?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
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
  if (patch.enabledDemographicItemCodes !== undefined) {
    const normalized = normalizeEnabledDemographicItemCodes(
      patch.enabledDemographicItemCodes ?? undefined,
    );
    data.enabledDemographicItemCodes =
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

import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { rubricForNcsLevel } from "@/lib/competency/ncs-rubric";
import {
  parseRubricByLevel,
  rubricForCompetencyLevel,
  type RubricByLevel,
} from "@/lib/competency/rubric";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import {
  IRT_LEVEL_COUNT,
  MIN_CANDIDATES_PER_LEVEL,
  type PoolQuestion,
} from "@/lib/interview/question-pool";

/** level당 MIN_CANDIDATES_PER_LEVEL(2) × 5레벨 = 10 권장, 최소 5(레벨당 1개 수준) */
export const RECOMMENDED_ORG_KIT_QUESTIONS =
  MIN_CANDIDATES_PER_LEVEL * IRT_LEVEL_COUNT;
export const MIN_ORG_KIT_QUESTIONS = IRT_LEVEL_COUNT;

export type InterviewKitAccessReason = "not_admin" | "no_org" | "not_enabled";

export type InterviewKitAccess =
  | {
      allowed: true;
      organizationId: string;
      organizationName: string;
      mode: "org_admin" | "superadmin";
    }
  | { allowed: false; reason: InterviewKitAccessReason };

type KitUser = {
  id: string;
  orgRole: string;
  organizationId: string | null;
  email: string;
  platformRole: PlatformRole;
};

function normalizeOrgId(raw: string | null | undefined): string | null {
  const id = raw?.trim();
  return id ? id : null;
}

/** 인터뷰 킷 접근 — 기관 ADMIN(권한 부여된 기관만) · 슈퍼어드민(전체 기관) */
export async function resolveInterviewKitAccess(
  user: KitUser,
  requestedOrganizationId?: string | null
): Promise<InterviewKitAccess> {
  const requested = normalizeOrgId(requestedOrganizationId);

  if (hasSuperadminAccess(user)) {
    const orgId = requested ?? user.organizationId;
    if (!orgId) return { allowed: false, reason: "no_org" };
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!org) return { allowed: false, reason: "no_org" };
    return {
      allowed: true,
      organizationId: org.id,
      organizationName: org.name,
      mode: "superadmin",
    };
  }

  if (!user.organizationId) return { allowed: false, reason: "no_org" };
  if (user.orgRole !== "ADMIN") return { allowed: false, reason: "not_admin" };
  if (requested && requested !== user.organizationId) {
    return { allowed: false, reason: "not_admin" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      id: true,
      name: true,
      saasPersonalizationEnabled: true,
    },
  });
  if (!org) return { allowed: false, reason: "no_org" };
  if (!org.saasPersonalizationEnabled) return { allowed: false, reason: "not_enabled" };

  return {
    allowed: true,
    organizationId: org.id,
    organizationName: org.name,
    mode: "org_admin",
  };
}

/** @deprecated resolveInterviewKitAccess 사용 */
export async function canUseInterviewKitBuilder(
  user: KitUser,
  requestedOrganizationId?: string | null
): Promise<InterviewKitAccess> {
  return resolveInterviewKitAccess(user, requestedOrganizationId);
}

/** SaaS 설정 허브·헤더 노출 여부 */
export async function canAccessSaasSettingsHub(user: KitUser): Promise<boolean> {
  if (hasSuperadminAccess(user)) return true;
  const access = await resolveInterviewKitAccess(user);
  return access.allowed;
}

export function parseSelectedQuestionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** 플랫폼 기본 루브릭 후보(역량 rubricByLevel 전 레벨 합집합, 없으면 NCS L3) */
export function platformRubricOptions(
  competencyCode: string,
  rubricByLevel: unknown
): string[] {
  const map =
    rubricByLevel && typeof rubricByLevel === "object" && !Array.isArray(rubricByLevel)
      ? (rubricByLevel as Record<string, unknown>)
      : {};
  const seen = new Set<string>();
  const out: string[] = [];
  for (const val of Object.values(map)) {
    if (!Array.isArray(val)) continue;
    for (const line of val) {
      if (typeof line !== "string" || !line.trim()) continue;
      const t = line.trim();
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  if (out.length > 0) return out;
  return rubricForNcsLevel(competencyCode, 3);
}

/** 플랫폼 역량·레벨 기본 루브릭 (DB rubricByLevel → NCS 폴백) */
export function platformRubricForLevel(
  competencyCode: string,
  rubricByLevel: unknown,
  level: number
): string[] {
  const fromDb = rubricForCompetencyLevel(rubricByLevel, level);
  if (fromDb.length > 0) return fromDb;
  return rubricForNcsLevel(competencyCode, level);
}

/** 기관 킷 customRubricCriteria — 레벨별 객체 또는 레거시 flat 배열 */
export function parseOrgKitRubricByLevel(raw: unknown): RubricByLevel {
  if (Array.isArray(raw)) {
    const lines = parseRubricCriteria(raw);
    if (lines.length === 0) return {};
    return { default: lines };
  }
  return parseRubricByLevel(raw);
}

export function orgKitRubricForLevel(
  customRubricByLevel: RubricByLevel,
  level: number
): string[] {
  const levelKey = String(level);
  if (customRubricByLevel[levelKey]?.length) return customRubricByLevel[levelKey];
  if (customRubricByLevel.default?.length) return customRubricByLevel.default;
  return [];
}

export async function getOrgInterviewKit(
  organizationId: string,
  competency: string
) {
  return prisma.orgInterviewKit.findUnique({
    where: { organizationId_competency: { organizationId, competency } },
  });
}

export async function getOrgKitCustomRubric(
  organizationId: string | null | undefined,
  competency: string,
  level: number
): Promise<string[] | null> {
  if (!organizationId) return null;
  const kit = await getOrgInterviewKit(organizationId, competency);
  if (!kit) return null;
  const byLevel = parseOrgKitRubricByLevel(kit.customRubricCriteria);
  const criteria = orgKitRubricForLevel(byLevel, level);
  return criteria.length > 0 ? criteria : null;
}

/** 기관 킷 selectedQuestionIds 순서로 문항 풀 좁히기 — 설정 없/비어 있으면 원본 반환 */
export function applyOrgKitQuestionFilter<
  T extends PoolQuestion & { id: string },
>(questions: T[], selectedIds: string[] | null | undefined): T[] {
  if (!selectedIds || selectedIds.length === 0) return questions;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered: T[] = [];
  for (const id of selectedIds) {
    const q = byId.get(id);
    if (q) ordered.push(q);
  }
  return ordered.length > 0 ? ordered : questions;
}

export async function filterQuestionsByOrgKit<T extends PoolQuestion & { id: string }>(params: {
  organizationId: string | null | undefined;
  competency: string;
  questions: T[];
}): Promise<T[]> {
  if (!params.organizationId) return params.questions;
  const kit = await getOrgInterviewKit(params.organizationId, params.competency);
  if (!kit) return params.questions;
  const ids = parseSelectedQuestionIds(kit.selectedQuestionIds);
  return applyOrgKitQuestionFilter(params.questions, ids);
}

export async function resolveOrgKitRubricForUser(
  userId: string,
  competency: string,
  level: number
): Promise<string[] | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return getOrgKitCustomRubric(u?.organizationId, competency, level);
}

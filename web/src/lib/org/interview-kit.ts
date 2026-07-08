import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";
import {
  IRT_LEVEL_COUNT,
  MIN_CANDIDATES_PER_LEVEL,
  type PoolQuestion,
} from "@/lib/interview/question-pool";
import {
  orgKitRubricForLevel,
  parseOrgKitRubricByLevel,
  parseSelectedQuestionIds,
} from "@/lib/org/kit-rubric";

export {
  orgKitRubricForLevel,
  parseOrgKitRubricByLevel,
  parseSelectedQuestionIds,
  platformRubricForLevel,
  platformRubricOptions,
} from "@/lib/org/kit-rubric";

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

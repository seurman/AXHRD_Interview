import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { rubricForNcsLevel } from "@/lib/competency/ncs-rubric";
import { isPlatformAdmin } from "@/lib/admin/auth";
import {
  IRT_LEVEL_COUNT,
  MIN_CANDIDATES_PER_LEVEL,
  type PoolQuestion,
} from "@/lib/interview/question-pool";

/** level당 MIN_CANDIDATES_PER_LEVEL(2) × 5레벨 = 10 권장, 최소 5(레벨당 1개 수준) */
export const RECOMMENDED_ORG_KIT_QUESTIONS =
  MIN_CANDIDATES_PER_LEVEL * IRT_LEVEL_COUNT;
export const MIN_ORG_KIT_QUESTIONS = IRT_LEVEL_COUNT;

export type InterviewKitAccess =
  | { allowed: true; organizationId: string }
  | { allowed: false; reason: "not_admin" | "no_org" };

type KitUser = {
  id: string;
  orgRole: string;
  organizationId: string | null;
  email: string;
  platformRole: PlatformRole;
};

/** 킷 저장 대상 기관 — 소속 기관 우선, 플랫폼 ADMIN은 ADMIN 소속·승인 기관 순으로 휴리스틱 폴백 */
export async function resolveKitOrganizationId(user: KitUser): Promise<string | null> {
  if (user.organizationId) return user.organizationId;

  if (!isPlatformAdmin(user)) return null;

  const asOrgAdmin = await prisma.organization.findFirst({
    where: { members: { some: { id: user.id, orgRole: "ADMIN" } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (asOrgAdmin) return asOrgAdmin.id;

  const approved = await prisma.organization.findFirst({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return approved?.id ?? null;
}

/** org ADMIN 또는 플랫폼 ADMIN(문항 관리 권한) — 구독/결제 여부는 검사하지 않음 */
export async function canUseInterviewKitBuilder(user: KitUser): Promise<InterviewKitAccess> {
  const platformAdmin = isPlatformAdmin(user);

  if (platformAdmin) {
    const organizationId = await resolveKitOrganizationId(user);
    if (!organizationId) return { allowed: false, reason: "no_org" };
    return { allowed: true, organizationId };
  }

  if (!user.organizationId) return { allowed: false, reason: "no_org" };
  if (user.orgRole !== "ADMIN") return { allowed: false, reason: "not_admin" };
  return { allowed: true, organizationId: user.organizationId };
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
  competency: string
): Promise<string[] | null> {
  if (!organizationId) return null;
  const kit = await getOrgInterviewKit(organizationId, competency);
  if (!kit) return null;
  const criteria = parseRubricCriteria(kit.customRubricCriteria);
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
  competency: string
): Promise<string[] | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return getOrgKitCustomRubric(u?.organizationId, competency);
}

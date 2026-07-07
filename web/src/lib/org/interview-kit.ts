import { prisma } from "@/lib/prisma";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { rubricForNcsLevel } from "@/lib/competency/ncs-rubric";
import { isMissingBillingTablesError } from "@/lib/billing/errors";
import { isPaidSubscriptionActive } from "@/lib/billing/subscription";
import {
  IRT_LEVEL_COUNT,
  MIN_CANDIDATES_PER_LEVEL,
  type PoolQuestion,
} from "@/lib/interview/question-pool";

/** level당 MIN_CANDIDATES_PER_LEVEL(2) × 5레벨 = 10 권장, 최소 5(레벨당 1개 수준) */
export const RECOMMENDED_ORG_KIT_QUESTIONS =
  MIN_CANDIDATES_PER_LEVEL * IRT_LEVEL_COUNT;
export const MIN_ORG_KIT_QUESTIONS = IRT_LEVEL_COUNT;

const ORG_KIT_PLAN_TIERS = ["ORG_STANDARD", "ORG_ENTERPRISE"] as const;

export type InterviewKitAccess =
  | { allowed: true }
  | { allowed: false; reason: "not_admin" | "no_org" | "plan_required" };

/** ORG_STANDARD/ORG_ENTERPRISE 구독 여부. Subscription 테이블 없으면 null(폴백 모드). */
export async function organizationHasInterviewKitPlan(
  organizationId: string
): Promise<boolean | null> {
  try {
    const subs = await prisma.subscription.findMany({
      where: {
        organizationId,
        planTier: { in: [...ORG_KIT_PLAN_TIERS] },
        status: { in: ["ACTIVE", "TRIALING"] },
        currentPeriodEnd: { gt: new Date() },
      },
    });
    return subs.some(isPaidSubscriptionActive);
  } catch (e) {
    if (isMissingBillingTablesError(e)) return null;
    throw e;
  }
}

export async function canUseInterviewKitBuilder(user: {
  orgRole: string;
  organizationId: string | null;
}): Promise<InterviewKitAccess> {
  if (!user.organizationId) return { allowed: false, reason: "no_org" };
  if (user.orgRole !== "ADMIN") return { allowed: false, reason: "not_admin" };

  const hasPlan = await organizationHasInterviewKitPlan(user.organizationId);
  if (hasPlan === null) {
    // TODO: billing 마이그레이션 완료 후 ORG_STANDARD/ORG_ENTERPRISE만 허용
    return { allowed: true };
  }
  if (hasPlan) return { allowed: true };
  return { allowed: false, reason: "plan_required" };
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

/** UI/API용 — 역량별 플랫폼 L3 루브릭 한 줄 요약 */
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

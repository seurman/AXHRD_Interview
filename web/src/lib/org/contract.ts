import type { Organization, PlanTier, Subscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/billing/plans";

export type OrgContractStatus = "active" | "pending" | "expired" | "not_started" | "rejected";

export function resolveOrgSeatCap(
  org: Pick<Organization, "maxSeats">,
  subscription?: Pick<Subscription, "planTier"> | null,
): number | null {
  if (org.maxSeats != null && org.maxSeats > 0) return org.maxSeats;
  if (subscription?.planTier) {
    return PLANS[subscription.planTier].limits.orgMemberCap;
  }
  return null;
}

export function getOrgContractStatus(
  org: Pick<Organization, "status" | "validFrom" | "validUntil">,
  now = new Date(),
): OrgContractStatus {
  if (org.status === "REJECTED") return "rejected";
  if (org.status === "PENDING") return "pending";
  if (org.validFrom && org.validFrom > now) return "not_started";
  if (org.validUntil && org.validUntil < now) return "expired";
  return "active";
}

export function isOrgOperational(
  org: Pick<Organization, "status" | "validFrom" | "validUntil">,
  now = new Date(),
): boolean {
  if (org.status !== "APPROVED") return false;
  return getOrgContractStatus(org, now) === "active";
}

export async function countOrgMembers(organizationId: string): Promise<number> {
  return prisma.user.count({ where: { organizationId } });
}

export async function canOrgAcceptMember(
  org: Pick<Organization, "id" | "status" | "validFrom" | "validUntil" | "maxSeats"> & {
    subscriptions?: Pick<Subscription, "planTier">[];
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isOrgOperational(org)) {
    const status = getOrgContractStatus(org);
    if (status === "pending") {
      return { ok: false, reason: "이 기관은 아직 승인 대기 중이라 가입할 수 없습니다." };
    }
    if (status === "rejected") {
      return { ok: false, reason: "이 기관은 이용이 중지되었습니다." };
    }
    if (status === "not_started") {
      return { ok: false, reason: "이 기관의 이용 기간이 아직 시작되지 않았습니다." };
    }
    if (status === "expired") {
      return { ok: false, reason: "이 기관의 이용 기간이 만료되었습니다. 담당자에게 문의해 주세요." };
    }
    return { ok: false, reason: "현재 이 기관에 가입할 수 없습니다." };
  }

  const cap = resolveOrgSeatCap(org, org.subscriptions?.[0] ?? null);
  if (cap == null) return { ok: true };

  const used = await countOrgMembers(org.id);
  if (used >= cap) {
    return {
      ok: false,
      reason: `이 기관의 이용 인원 상한(${cap}명)에 도달했습니다. 기관 담당자에게 문의해 주세요.`,
    };
  }
  return { ok: true };
}

export function formatOrgPeriod(
  validFrom: Date | null | undefined,
  validUntil: Date | null | undefined,
): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  if (!validFrom && !validUntil) return "기간 제한 없음";
  if (validFrom && validUntil) return `${fmt(validFrom)} ~ ${fmt(validUntil)}`;
  if (validFrom) return `${fmt(validFrom)} ~`;
  if (validUntil) return `~ ${fmt(validUntil)}`;
  return "—";
}

export function planTierLabel(tier: PlanTier): string {
  return PLANS[tier]?.nameKo ?? tier;
}

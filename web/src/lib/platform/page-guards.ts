import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { loadPersonalAccessContext } from "@/lib/auth/personal-access";
import { hasCapability, type AccessContext } from "@/lib/platform/access";
import type { CapabilityId } from "@/lib/platform/capabilities";

/** capability 기반 페이지 가드 */
export async function requireCapability(
  capability: CapabilityId,
  nextPath?: string,
  context?: AccessContext
) {
  const user = await requirePageUser(nextPath);
  const billingContext =
    context?.billingTier !== undefined
      ? context
      : { ...context, ...(await loadPersonalAccessContext(user.id)) };
  if (!hasCapability(user, capability, billingContext)) notFound();
  return user;
}

/** 제품 capability — 개인 MEMBER 플랜도 practice 포함. 한도는 billing 402로 처리 */
export async function requireProductCapability(capability: CapabilityId, nextPath?: string) {
  const user = await requirePageUser(nextPath);
  const billingContext = await loadPersonalAccessContext(user.id);
  if (!hasCapability(user, capability, billingContext)) {
    notFound();
  }
  return user;
}

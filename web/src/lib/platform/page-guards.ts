import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import {
  isPersonalTrialOnlyUser,
  loadPersonalAccessContext,
} from "@/lib/auth/personal-access";
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

/** 제품 capability — FREE 개인 사용자는 /demo 로 안내 */
export async function requireProductCapability(capability: CapabilityId, nextPath?: string) {
  const user = await requirePageUser(nextPath);
  const billingContext = await loadPersonalAccessContext(user.id);
  if (!hasCapability(user, capability, billingContext)) {
    if (isPersonalTrialOnlyUser(user, billingContext)) {
      redirect("/demo");
    }
    notFound();
  }
  return user;
}

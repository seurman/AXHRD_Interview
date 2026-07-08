import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { hasCapability, type AccessContext } from "@/lib/platform/access";
import type { CapabilityId } from "@/lib/platform/capabilities";

/** capability 기반 페이지 가드 */
export async function requireCapability(
  capability: CapabilityId,
  nextPath?: string,
  context?: AccessContext
) {
  const user = await requirePageUser(nextPath);
  if (!hasCapability(user, capability, context)) notFound();
  return user;
}

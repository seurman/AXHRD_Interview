import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export async function requirePageUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const dest = nextPath
      ? `/auth/login?next=${encodeURIComponent(nextPath)}`
      : "/auth/login";
    redirect(dest);
  }
  return user;
}

export function assertResourceOwner(resourceUserId: string, currentUserId: string) {
  if (resourceUserId !== currentUserId) notFound();
}

/** 코호트 대시보드 등 기관 담당자 전용 화면 접근 제어.
 *  STAFF/ADMIN이 아니거나 소속 기관이 없으면 404로 막는다(존재 자체를 숨김). */
export async function requireOrgStaff(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (user.orgRole === "STUDENT" || !user.organizationId) notFound();
  return user as typeof user & { organizationId: string };
}

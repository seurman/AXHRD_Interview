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

/** 플랫폼 슈퍼어드민(운영자) 이메일 허용 목록. 콤마로 구분해 여러 명 등록 가능. */
function superadminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadmin(email: string) {
  return superadminEmails().includes(email.toLowerCase());
}

/** 기관 승인/반려 등 플랫폼 운영 화면 접근 제어. SUPERADMIN_EMAILS에 없으면 404. */
export async function requireSuperadmin(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!isSuperadmin(user.email)) notFound();
  return user;
}

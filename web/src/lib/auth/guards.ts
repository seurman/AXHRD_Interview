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

/** 환경변수 SUPERADMIN_EMAILS 또는 DB platformRole=SUPERADMIN */
export function hasSuperadminAccess(user: { email: string; platformRole?: string }) {
  return isSuperadmin(user.email) || user.platformRole === "SUPERADMIN";
}

/** 역량·문항·루브릭 CMS 접근 — ADMIN(또는 레거시 CONTENT_ADMIN) 이상 */
export function isPlatformAdmin(user: { email: string; platformRole?: string }) {
  return (
    hasSuperadminAccess(user) ||
    user.platformRole === "ADMIN" ||
    user.platformRole === "CONTENT_ADMIN"
  );
}

/** @deprecated isPlatformAdmin */
export function canManageContent(user: { email: string; platformRole?: string }) {
  return isPlatformAdmin(user);
}

/** 하드 삭제 등 파괴적 작업 — SUPERADMIN만 */
export function canHardDelete(user: { email: string; platformRole?: string }) {
  return hasSuperadminAccess(user);
}

/** 플랫폼 ADMIN 부여/회수·감사 로그 — SUPERADMIN만 */
export function canManagePlatformAdmins(user: { email: string; platformRole?: string }) {
  return hasSuperadminAccess(user);
}

/** @deprecated canManagePlatformAdmins */
export function canGrantPlatformRoles(user: { email: string; platformRole?: string }) {
  return canManagePlatformAdmins(user);
}

/** 기관 승인/반려 등 플랫폼 운영 화면 접근 제어. 슈퍼어드민만. */
export async function requireSuperadmin(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!hasSuperadminAccess(user)) notFound();
  return user;
}

/** 문항 뱅크 CMS — 플랫폼 ADMIN 이상 */
export async function requirePlatformAdmin(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!isPlatformAdmin(user)) notFound();
  return user;
}

/** @deprecated requirePlatformAdmin */
export async function requireContentAdmin(nextPath?: string) {
  return requirePlatformAdmin(nextPath);
}

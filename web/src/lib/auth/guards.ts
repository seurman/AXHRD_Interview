import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin, hasSuperadminAccess } from "@/lib/auth/superadmin";

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

/** 기관 ADMIN(개인화 권한 부여됨) 또는 슈퍼어드민 — 인터뷰 킷 빌더 */
export async function requireInterviewKitUser(
  nextPath?: string,
  organizationId?: string | null
) {
  const user = await requirePageUser(nextPath);
  const { resolveInterviewKitAccess } = await import("@/lib/org/interview-kit");
  const access = await resolveInterviewKitAccess(user, organizationId);
  if (!access.allowed) notFound();
  return { user, organizationId: access.organizationId, access };
}

export { isSuperadmin, hasSuperadminAccess } from "@/lib/auth/superadmin";

/** 운영 문항 뱅크 CMS — 수퍼어드민 · 콘텐츠 관리자 */
export function isProductionContentAdmin(user: { email: string; platformRole?: string }) {
  return hasSuperadminAccess(user) || user.platformRole === "CONTENT_ADMIN";
}

/** 데모 워크스페이스 — 수퍼어드민 · 회사 어드민 */
export function isDemoManager(user: { email: string; platformRole?: string }) {
  return hasSuperadminAccess(user) || user.platformRole === "ADMIN";
}

/** @deprecated 운영 CMS 또는 데모 관리자 (세분화된 isProductionContentAdmin / isDemoManager 사용 권장) */
export function isPlatformAdmin(user: { email: string; platformRole?: string }) {
  return isProductionContentAdmin(user) || isDemoManager(user);
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

/** 운영 문항 뱅크 CMS */
export async function requireProductionContentAdmin(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!isProductionContentAdmin(user)) notFound();
  return user;
}

/** 데모 워크스페이스 관리 */
export async function requireDemoManager(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!isDemoManager(user)) notFound();
  return user;
}

/** @deprecated requireProductionContentAdmin */
export async function requirePlatformAdmin(nextPath?: string) {
  return requireProductionContentAdmin(nextPath);
}

/** @deprecated requirePlatformAdmin */
export async function requireContentAdmin(nextPath?: string) {
  return requirePlatformAdmin(nextPath);
}

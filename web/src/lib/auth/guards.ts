import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin, hasSuperadminAccess } from "@/lib/auth/superadmin";
import {
  canViewContentConsole,
  canViewDiagnosticConsole,
  canViewPlatformOrganizations,
  canViewPlatformSessions,
  isBusinessAdminUser,
  isDemoAdminUser,
} from "@/lib/auth/platform-ops";
import {
  canAccessProductionContentBank,
  canManageDemoWorkspaces,
  isOrgMemberUser,
} from "@/lib/auth/roles";

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

/** 코호트 대시보드 등 기관 담당자 전용 화면 */
export async function requireOrgStaff(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (isOrgMemberUser(user) || !user.organizationId) notFound();
  return user as typeof user & { organizationId: string };
}

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

export async function requireDiagnosticUser(
  nextPath?: string,
  organizationId?: string | null,
) {
  const user = await requirePageUser(nextPath);
  const { resolveDiagnosticAccess } = await import("@/lib/diagnostic/org-access");
  const access = await resolveDiagnosticAccess(user, organizationId);
  if (!access.allowed) notFound();
  return { user, organizationId: access.organizationId, access };
}

export { isSuperadmin, hasSuperadminAccess } from "@/lib/auth/superadmin";
export { isBusinessAdminUser, isDemoAdminUser } from "@/lib/auth/platform-ops";

export function isProductionContentAdmin(user: { email: string; platformRole?: string }) {
  return canAccessProductionContentBank(user);
}

export function isDemoManager(user: { email: string; platformRole?: string }) {
  return canManageDemoWorkspaces(user);
}

/** @deprecated */
export function isPlatformAdmin(user: { email: string; platformRole?: string }) {
  return isProductionContentAdmin(user) || isDemoManager(user);
}

/** @deprecated */
export function canManageContent(user: { email: string; platformRole?: string }) {
  return isPlatformAdmin(user);
}

export function canHardDelete(user: { email: string; platformRole?: string }) {
  return hasSuperadminAccess(user);
}

export function canManagePlatformAdmins(user: { email: string; platformRole?: string }) {
  return hasSuperadminAccess(user);
}

/** @deprecated */
export function canGrantPlatformRoles(user: { email: string; platformRole?: string }) {
  return canManagePlatformAdmins(user);
}

export async function requireSuperadmin(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!hasSuperadminAccess(user)) notFound();
  return user;
}

export async function requireProductionContentAdmin(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!canAccessProductionContentBank(user)) notFound();
  return user;
}

/** CMS 조회 — 비즈니스 어드민 포함 */
export async function requireContentConsoleViewer(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!canViewContentConsole(user)) notFound();
  return user;
}

export async function requireDemoManager(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!canManageDemoWorkspaces(user)) notFound();
  return user;
}

/** 기관 허브 조회 — 비즈니스 어드민 */
export async function requireOrganizationsViewer(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!canViewPlatformOrganizations(user)) notFound();
  return user;
}

export async function requireDiagnosticConsoleViewer(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!canViewDiagnosticConsole(user)) notFound();
  return user;
}

export async function requireSessionsViewer(nextPath?: string) {
  const user = await requirePageUser(nextPath);
  if (!canViewPlatformSessions(user)) notFound();
  return user;
}

/** @deprecated */
export async function requirePlatformAdmin(nextPath?: string) {
  return requireProductionContentAdmin(nextPath);
}

/** @deprecated */
export async function requireContentAdmin(nextPath?: string) {
  return requirePlatformAdmin(nextPath);
}

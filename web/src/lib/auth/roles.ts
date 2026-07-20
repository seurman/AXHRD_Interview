/**
 * HR_IN 권한 체계
 *
 * 플랫폼(platformRole) — HR_IN 운영·영업
 *   SUPERADMIN      수퍼어드민
 *   BUSINESS_ADMIN  비즈니스 어드민 (매뉴얼·전 기능 체험, 설정/권한 불가)
 *   DEMO_ADMIN      데모 어드민 (영업·Presenter·데모 샌드박스)
 *   CONTENT_ADMIN   콘텐츠 관리자 (운영 CMS)
 *   ADMIN           @deprecated → DEMO_ADMIN
 *   NONE            일반
 *
 * 기관(orgRole) — 고객사 테넌트 (Salesforce Standard User / Manager 유사)
 *   MEMBER   구성원 — 학생·직장인·지원자
 *   STAFF    담당자 — 참여 현황 조회
 *   ADMIN    기관 관리자
 */

import { hasSuperadminAccess } from "@/lib/auth/superadmin";
import {
  canManageDemoWorkspaces as canManageDemoWorkspacesOps,
  canViewContentConsole,
  isInternalUsageExempt,
} from "@/lib/auth/platform-ops";

export type RoleUser = {
  email: string;
  platformRole?: string;
  orgRole?: string;
  organizationId?: string | null;
};

export const PLATFORM_ROLE_LABEL: Record<string, string> = {
  NONE: "일반",
  SUPERADMIN: "수퍼어드민",
  BUSINESS_ADMIN: "비즈니스 어드민",
  DEMO_ADMIN: "데모 어드민",
  ADMIN: "데모 어드민 (레거시)",
  CONTENT_ADMIN: "콘텐츠 관리자",
};

export const ORG_ROLE_LABEL: Record<string, string> = {
  MEMBER: "구성원",
  STUDENT: "구성원",
  STAFF: "담당자",
  ADMIN: "기관 관리자",
};

export function isSuperAdminUser(user: RoleUser): boolean {
  return hasSuperadminAccess(user);
}

export function isCompanyAdminUser(user: RoleUser): boolean {
  const r = user.platformRole;
  return r === "DEMO_ADMIN" || r === "ADMIN";
}

export function isContentManagerUser(user: RoleUser): boolean {
  return user.platformRole === "CONTENT_ADMIN";
}

export function isOrgAdminUser(user: RoleUser): boolean {
  return !!user.organizationId && user.orgRole === "ADMIN";
}

export function isOrgCoordinatorUser(user: RoleUser): boolean {
  return !!user.organizationId && user.orgRole === "STAFF";
}

/** @deprecated isOrgCoordinatorUser */
export function isOrgStaffUser(user: RoleUser): boolean {
  return isOrgCoordinatorUser(user);
}

/** 학생·직장인·지원자 — 개인 제품 이용 (소속 없으면 동일 취급) */
export function isOrgMemberUser(user: RoleUser): boolean {
  return !user.organizationId || user.orgRole === "MEMBER" || user.orgRole === "STUDENT";
}

/** @deprecated isOrgMemberUser */
export function isStudentUser(user: RoleUser): boolean {
  return isOrgMemberUser(user);
}

export function canAccessProductionContentBank(user: RoleUser): boolean {
  return isSuperAdminUser(user) || isContentManagerUser(user);
}

export function canViewProductionContentBank(user: RoleUser): boolean {
  return canViewContentConsole(user);
}

export function canManageDemoWorkspaces(user: RoleUser): boolean {
  return canManageDemoWorkspacesOps(user);
}

export function isUsageExemptUser(user: RoleUser): boolean {
  return isInternalUsageExempt(user);
}

export function canAccessSuperadminConsole(user: RoleUser): boolean {
  return isSuperAdminUser(user);
}

export function describeUserRoles(user: RoleUser): string {
  const parts: string[] = [];
  if (user.platformRole && user.platformRole !== "NONE") {
    parts.push(PLATFORM_ROLE_LABEL[user.platformRole] ?? user.platformRole);
  }
  if (user.organizationId && user.orgRole) {
    parts.push(ORG_ROLE_LABEL[user.orgRole] ?? user.orgRole);
  }
  if (parts.length === 0) return "구성원";
  return parts.join(" · ");
}

/** 참여 집계 대상 orgRole 값 */
export const COHORT_MEMBER_ROLES = ["MEMBER", "STUDENT"] as const;

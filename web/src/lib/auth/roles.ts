/**
 * HR_IN 권한 체계
 *
 * 플랫폼(platformRole) — HR_IN 운영·회사
 *   SUPERADMIN     수퍼어드민
 *   ADMIN          회사 어드민 (고객 데모·무제한 테스트)
 *   CONTENT_ADMIN  콘텐츠 관리자 (운영 문항 뱅크)
 *   NONE           일반
 *
 * 기관(orgRole) — 고객사 테넌트
 *   ADMIN   기관 어드민
 *   STAFF   회사원(기관 담당자)
 *   STUDENT 학생
 */

import { hasSuperadminAccess } from "@/lib/auth/superadmin";

export type RoleUser = {
  email: string;
  platformRole?: string;
  orgRole?: string;
  organizationId?: string | null;
};

export const PLATFORM_ROLE_LABEL: Record<string, string> = {
  NONE: "일반",
  SUPERADMIN: "수퍼어드민",
  ADMIN: "회사 어드민",
  CONTENT_ADMIN: "콘텐츠 관리자",
};

export const ORG_ROLE_LABEL: Record<string, string> = {
  STUDENT: "학생",
  STAFF: "회사원",
  ADMIN: "기관 어드민",
};

export function isSuperAdminUser(user: RoleUser): boolean {
  return hasSuperadminAccess(user);
}

/** 회사 어드민 — 고객 데모·무제한 테스트 (운영 CMS·기관 승인 제외) */
export function isCompanyAdminUser(user: RoleUser): boolean {
  return user.platformRole === "ADMIN";
}

/** 콘텐츠 관리자 — 운영 문항 뱅크 CMS */
export function isContentManagerUser(user: RoleUser): boolean {
  return user.platformRole === "CONTENT_ADMIN";
}

export function isOrgAdminUser(user: RoleUser): boolean {
  return !!user.organizationId && user.orgRole === "ADMIN";
}

export function isOrgStaffUser(user: RoleUser): boolean {
  return !!user.organizationId && user.orgRole === "STAFF";
}

export function isStudentUser(user: RoleUser): boolean {
  return !user.organizationId || user.orgRole === "STUDENT";
}

/** 운영 문항 뱅크 CMS */
export function canAccessProductionContentBank(user: RoleUser): boolean {
  return (
    isSuperAdminUser(user) || isContentManagerUser(user)
  );
}

/** 데모 워크스페이스 편집 */
export function canManageDemoWorkspaces(user: RoleUser): boolean {
  return isSuperAdminUser(user) || isCompanyAdminUser(user);
}

/** 월간 면접·자기발견 횟수 제한 없음 */
export function isUsageExemptUser(user: RoleUser): boolean {
  return isSuperAdminUser(user) || isCompanyAdminUser(user);
}

/** 슈퍼어드민 전용 — 기관 승인·사용자 권한·감사 */
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
  if (parts.length === 0) return "학생";
  return parts.join(" · ");
}

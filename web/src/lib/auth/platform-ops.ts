/**
 * 플랫폼 내부 역할 — Salesforce System Admin vs Solutions/Sales 패턴
 * UI 숨김만으로는 부족; API·페이지 가드에서 이 모듈을 사용한다.
 */

import type { PlatformRole } from "@prisma/client";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";

export type PlatformOpsUser = {
  email: string;
  platformRole?: string | PlatformRole;
};

export function isDemoAdminUser(user: PlatformOpsUser): boolean {
  const r = user.platformRole;
  return r === "DEMO_ADMIN" || r === "ADMIN";
}

export function isBusinessAdminUser(user: PlatformOpsUser): boolean {
  return user.platformRole === "BUSINESS_ADMIN";
}

export function isInternalPlatformUser(user: PlatformOpsUser): boolean {
  return (
    hasSuperadminAccess(user) ||
    isBusinessAdminUser(user) ||
    isDemoAdminUser(user) ||
    user.platformRole === "CONTENT_ADMIN"
  );
}

/** 기관·구독·권한 등 플랫폼 설정 변경 */
export function canMutatePlatformSettings(user: PlatformOpsUser): boolean {
  return hasSuperadminAccess(user);
}

/** 기관 목록·상세 조회 (매뉴얼·시연용) */
export function canViewPlatformOrganizations(user: PlatformOpsUser): boolean {
  return hasSuperadminAccess(user) || isBusinessAdminUser(user);
}

/** ARC Index·진단 콘솔 조회 */
export function canViewDiagnosticConsole(user: PlatformOpsUser): boolean {
  return hasSuperadminAccess(user) || isBusinessAdminUser(user);
}

/** 운영 CMS 조회 (쓰기는 CONTENT_ADMIN·SUPERADMIN) */
export function canViewContentConsole(user: PlatformOpsUser): boolean {
  return (
    hasSuperadminAccess(user) ||
    isBusinessAdminUser(user) ||
    user.platformRole === "CONTENT_ADMIN"
  );
}

/** 세션·면접 로그 조회 */
export function canViewPlatformSessions(user: PlatformOpsUser): boolean {
  return hasSuperadminAccess(user) || isBusinessAdminUser(user) || isDemoAdminUser(user);
}

/** 데모 워크스페이스 편집 */
export function canManageDemoWorkspaces(user: PlatformOpsUser): boolean {
  return hasSuperadminAccess(user) || isDemoAdminUser(user);
}

/** 플랫폼 역할 부여·회수 */
export function canGrantPlatformRoles(user: PlatformOpsUser): boolean {
  return hasSuperadminAccess(user);
}

/** 월간 사용량 면제 (내부 시연·매뉴얼) */
export function isInternalUsageExempt(user: PlatformOpsUser): boolean {
  return (
    hasSuperadminAccess(user) ||
    isDemoAdminUser(user) ||
    isBusinessAdminUser(user)
  );
}

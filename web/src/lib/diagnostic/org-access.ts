import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";

export type DiagnosticAccessReason =
  | "not_admin"
  | "no_org"
  | "not_enabled";

export type DiagnosticAccess =
  | {
      allowed: true;
      organizationId: string;
      organizationName: string;
      mode: "org_admin" | "superadmin";
    }
  | { allowed: false; reason: DiagnosticAccessReason };

type DiagnosticUser = {
  id: string;
  orgRole: string;
  organizationId: string | null;
  email: string;
  platformRole: PlatformRole;
};

function normalizeOrgId(raw: string | null | undefined): string | null {
  const id = raw?.trim();
  return id ? id : null;
}

/** 조직진단 접근 — 기관 ADMIN(diagnosticEnabled) · 슈퍼어드민 */
export async function resolveDiagnosticAccess(
  user: DiagnosticUser,
  requestedOrganizationId?: string | null,
): Promise<DiagnosticAccess> {
  const requested = normalizeOrgId(requestedOrganizationId);

  if (hasSuperadminAccess(user)) {
    const orgId = requested ?? user.organizationId;
    if (!orgId) return { allowed: false, reason: "no_org" };
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!org) return { allowed: false, reason: "no_org" };
    return {
      allowed: true,
      organizationId: org.id,
      organizationName: org.name,
      mode: "superadmin",
    };
  }

  if (user.orgRole !== "ADMIN" || !user.organizationId) {
    return { allowed: false, reason: "not_admin" };
  }
  if (requested && requested !== user.organizationId) {
    return { allowed: false, reason: "not_admin" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, name: true, diagnosticEnabled: true },
  });
  if (!org) return { allowed: false, reason: "no_org" };
  if (!org.diagnosticEnabled) return { allowed: false, reason: "not_enabled" };

  return {
    allowed: true,
    organizationId: org.id,
    organizationName: org.name,
    mode: "org_admin",
  };
}

export const DIAGNOSTIC_ACCESS_ERRORS: Record<DiagnosticAccessReason, string> = {
  not_admin: "기관 ADMIN 권한이 필요합니다.",
  no_org: "대상 기관을 찾을 수 없습니다.",
  not_enabled:
    "조직진단 권한이 부여되지 않은 기관입니다. 슈퍼어드민에게 문의하세요.",
};

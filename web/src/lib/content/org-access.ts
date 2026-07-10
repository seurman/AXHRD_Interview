import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { hasSuperadminAccess } from "@/lib/auth/superadmin";
import { hasCapability } from "@/lib/platform/access";
import type { CapabilityId } from "@/lib/platform/capabilities";

export type OrgContentAccessReason =
  | "not_authenticated"
  | "not_admin"
  | "read_only"
  | "no_org"
  | "not_enabled";

export type OrgContentAccess =
  | {
      allowed: true;
      organizationId: string;
      organizationName: string;
      mode: "org_admin" | "superadmin";
      canWrite: boolean;
    }
  | { allowed: false; reason: OrgContentAccessReason };

type ContentUser = {
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

/** 기관 커스텀 역량 — ORG_ADMIN 쓰기 · ORG_STAFF/슈퍼어드민 읽기+쓰기 */
export async function resolveOrgContentAccess(
  user: ContentUser | null,
  requestedOrganizationId?: string | null,
  opts?: { requireWrite?: boolean }
): Promise<OrgContentAccess> {
  if (!user) return { allowed: false, reason: "not_authenticated" };

  const requested = normalizeOrgId(requestedOrganizationId);
  const requireWrite = opts?.requireWrite ?? false;

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
      canWrite: true,
    };
  }

  if (!user.organizationId) return { allowed: false, reason: "no_org" };

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      id: true,
      name: true,
      saasPersonalizationEnabled: true,
    },
  });
  if (!org) return { allowed: false, reason: "no_org" };
  if (!org.saasPersonalizationEnabled) return { allowed: false, reason: "not_enabled" };
  if (requested && requested !== user.organizationId) {
    return { allowed: false, reason: "not_admin" };
  }

  const context = { tenantPersonalizationEnabled: true };
  const canWrite = hasCapability(user, "tenant.custom_competency" as CapabilityId, context);
  const canRead =
    canWrite ||
    hasCapability(user, "tenant.settings" as CapabilityId, context) ||
    user.orgRole === "ADMIN" ||
    user.orgRole === "STAFF";

  if (!canRead) return { allowed: false, reason: "read_only" };
  if (requireWrite && !canWrite) {
    return { allowed: false, reason: user.orgRole === "STAFF" ? "read_only" : "not_admin" };
  }

  return {
    allowed: true,
    organizationId: org.id,
    organizationName: org.name,
    mode: "org_admin",
    canWrite,
  };
}

export async function generateOrgCompetencyCode(
  organizationId: string,
  forkedFromId?: string | null
): Promise<string> {
  if (forkedFromId) {
    const base = await prisma.competency.findUnique({
      where: { id: forkedFromId },
      select: { code: true },
    });
    if (base) {
      let candidate = `${base.code}_ORG`;
      let n = 0;
      while (true) {
        const code = n === 0 ? candidate : `${candidate}_${n}`;
        const hit = await prisma.competency.findFirst({
          where: { organizationId, code },
          select: { id: true },
        });
        if (!hit) return code;
        n++;
      }
    }
  }
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORG_${suffix}`;
}

export async function generateOrgQuestionExternalId(
  competencyCode: string,
  level: number
): Promise<string> {
  const base = `${competencyCode}-ORG-L${level}`;
  let n = 0;
  while (true) {
    const externalId = n === 0 ? base : `${base}-${n}`;
    const hit = await prisma.question.findUnique({
      where: { externalId },
      select: { id: true },
    });
    if (!hit) return externalId;
    n++;
  }
}

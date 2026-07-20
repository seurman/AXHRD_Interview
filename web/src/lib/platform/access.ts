import type { PlanTier } from "@prisma/client";
import {
  ALL_CAPABILITY_IDS,
  CAPABILITY_REGISTRY,
  ROLE_CAPABILITY_MATRIX,
  type CapabilityId,
  type PlatformRoleKey,
} from "@/lib/platform/capabilities";
import {
  isCompanyAdminUser,
  isContentManagerUser,
  isOrgAdminUser,
  isOrgCoordinatorUser,
  isOrgMemberUser,
  isSuperAdminUser,
  type RoleUser,
} from "@/lib/auth/roles";
import { isBusinessAdminUser } from "@/lib/auth/platform-ops";

export type AccessContext = {
  /** 면접·참여 현황 SKU */
  interviewEnabled?: boolean;
  /** 역량평가·맞춤 역량(saasPersonalizationEnabled) */
  tenantPersonalizationEnabled?: boolean;
  /** ARC Index 조직진단 SKU */
  diagnosticEnabled?: boolean;
  billingTier?: PlanTier;
};

function primaryPlatformRole(user: RoleUser): PlatformRoleKey {
  if (isSuperAdminUser(user)) return "SUPERADMIN";
  if (isBusinessAdminUser(user)) return "BUSINESS_ADMIN";
  if (isCompanyAdminUser(user)) return "DEMO_ADMIN";
  if (isContentManagerUser(user)) return "CONTENT_ADMIN";
  if (isOrgAdminUser(user)) return "ORG_ADMIN";
  if (isOrgCoordinatorUser(user)) return "ORG_STAFF";
  if (isOrgMemberUser(user)) return "MEMBER";
  return "MEMBER";
}

/** 사용자에게 허용된 capability 집합 */
export function resolveUserCapabilities(
  user: RoleUser,
  context: AccessContext = {},
): Set<CapabilityId> {
  if (isSuperAdminUser(user)) {
    return new Set(ALL_CAPABILITY_IDS);
  }

  const role = primaryPlatformRole(user);
  let caps = new Set(ROLE_CAPABILITY_MATRIX[role]);
  const interviewOn = context.interviewEnabled !== false;

  if (!interviewOn) {
    caps.delete("tenant.cohort");
  }

  if (isOrgAdminUser(user) && !context.tenantPersonalizationEnabled) {
    caps.delete("tenant.settings");
    caps.delete("tenant.interview_kit");
    caps.delete("tenant.custom_competency");
  }

  if (!context.diagnosticEnabled) {
    caps.delete("tenant.diagnostic");
  }

  if (interviewOn) {
    if (isCompanyAdminUser(user) && isOrgAdminUser(user)) {
      caps.add("tenant.cohort");
      if (context.tenantPersonalizationEnabled) {
        caps.add("tenant.settings");
        caps.add("tenant.interview_kit");
        caps.add("tenant.custom_competency");
      }
    } else if (isCompanyAdminUser(user) && isOrgCoordinatorUser(user)) {
      caps.add("tenant.cohort");
    }

    if (isBusinessAdminUser(user)) {
      caps.add("tenant.cohort");
      caps.add("tenant.settings");
      caps.add("tenant.interview_kit");
      caps.add("tenant.custom_competency");
      caps.add("tenant.diagnostic");
    }

    if (isContentManagerUser(user) && isOrgAdminUser(user)) {
      caps.add("tenant.cohort");
      if (context.tenantPersonalizationEnabled) {
        caps.add("tenant.settings");
        caps.add("tenant.interview_kit");
        caps.add("tenant.custom_competency");
      }
    } else if (isContentManagerUser(user) && isOrgCoordinatorUser(user)) {
      caps.add("tenant.cohort");
    }
  }

  return caps;
}

export function hasCapability(
  user: RoleUser,
  capability: CapabilityId,
  context: AccessContext = {},
): boolean {
  return resolveUserCapabilities(user, context).has(capability);
}

export function capabilitiesByCategory(user: RoleUser, context: AccessContext = {}) {
  const allowed = resolveUserCapabilities(user, context);
  const grouped = new Map<string, (typeof CAPABILITY_REGISTRY)[CapabilityId][]>();

  for (const id of allowed) {
    const def = CAPABILITY_REGISTRY[id];
    const list = grouped.get(def.category) ?? [];
    list.push(def);
    grouped.set(def.category, list);
  }
  return grouped;
}

export function describePrimaryRole(user: RoleUser): PlatformRoleKey {
  return primaryPlatformRole(user);
}

import type { Organization } from "@prisma/client";
import type { AccessContext } from "@/lib/platform/access";
import type { OrgKind } from "@prisma/client";

/** 제품 SKU — 기관을 나누지 않고 entitlement로 제어 */
export type OrgProductKey = "interview" | "competency" | "diagnostic" | "assessment";

export type OrgProductEntitlement = {
  key: OrgProductKey;
  label: string;
  shortLabel: string;
  description: string;
  tenantMenu: string;
};

export const ORG_PRODUCTS: OrgProductEntitlement[] = [
  {
    key: "interview",
    label: "면접",
    shortLabel: "면접",
    description: "코호트 대시보드·모의면접 세션·학생 가입 코드",
    tenantMenu: "코호트 · 면접 기록",
  },
  {
    key: "competency",
    label: "역량평가",
    shortLabel: "역량",
    description: "인터뷰 킷·커스텀 역량·L1~L5 루브릭 개인화",
    tenantMenu: "인터뷰 킷 · 맞춤 역량",
  },
  {
    key: "diagnostic",
    label: "조직진단",
    shortLabel: "진단",
    description: "ARC Index 조직진단 웨이브·팀 리포트",
    tenantMenu: "조직진단",
  },
  {
    key: "assessment",
    label: "역량평가 과제 (AC)",
    shortLabel: "AC",
    description: "서류함·역할연기 과제 배포·지원자 증거형 리포트",
    tenantMenu: "역량평가 과제 배포",
  },
];

export type OrgEntitlementSnapshot = {
  interview: boolean;
  competency: boolean;
  diagnostic: boolean;
  assessment: boolean;
};

type OrgEntitlementFields = Pick<
  Organization,
  "interviewEnabled" | "saasPersonalizationEnabled" | "diagnosticEnabled" | "assessmentEnabled"
>;

export function readOrgEntitlements(org: OrgEntitlementFields): OrgEntitlementSnapshot {
  return {
    interview: org.interviewEnabled,
    competency: org.saasPersonalizationEnabled,
    diagnostic: org.diagnosticEnabled,
    assessment: org.assessmentEnabled,
  };
}

export function orgEntitlementsToAccessContext(org: OrgEntitlementFields): AccessContext {
  const e = readOrgEntitlements(org);
  return {
    interviewEnabled: e.interview,
    tenantPersonalizationEnabled: e.competency,
    diagnosticEnabled: e.diagnostic,
  };
}

export type OrgProductDefaults = OrgEntitlementSnapshot;

/** OrgKind별 신규 기관 기본 entitlement 프리셋 */
export const ORG_KIND_PRODUCT_DEFAULTS: Record<OrgKind, OrgProductDefaults> = {
  CAREER_CENTER: {
    interview: true,
    competency: false,
    diagnostic: false,
    assessment: false,
  },
  HR_ENTERPRISE: {
    interview: true,
    competency: true,
    diagnostic: false,
    assessment: false,
  },
};

export function entitlementDbPatch(
  product: OrgProductKey,
  enabled: boolean,
): {
  interviewEnabled?: boolean;
  saasPersonalizationEnabled?: boolean;
  saasPersonalizationEnabledAt?: Date | null;
  diagnosticEnabled?: boolean;
  assessmentEnabled?: boolean;
} {
  switch (product) {
    case "interview":
      return { interviewEnabled: enabled };
    case "competency":
      return {
        saasPersonalizationEnabled: enabled,
        saasPersonalizationEnabledAt: enabled ? new Date() : null,
      };
    case "diagnostic":
      return { diagnosticEnabled: enabled };
    case "assessment":
      return { assessmentEnabled: enabled };
  }
}

export function countActiveEntitlements(snapshot: OrgEntitlementSnapshot): number {
  return [snapshot.interview, snapshot.competency, snapshot.diagnostic, snapshot.assessment].filter(
    Boolean,
  ).length;
}

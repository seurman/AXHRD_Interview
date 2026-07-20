import type { Prisma } from "@prisma/client";
import type { BadgeTone } from "@/components/admin/Badge";
import { ORG_ROLE_LABEL, PLATFORM_ROLE_LABEL } from "@/lib/auth/roles";

/** 관리자 사용자 목록 필터·그룹핑용 */
export type UserIdentitySegment =
  | "all"
  | "platform"
  | "org_admin"
  | "org_staff"
  | "member"
  | "personal"
  | "review";

export const USER_SEGMENT_OPTIONS: {
  key: UserIdentitySegment;
  label: string;
  hint: string;
}[] = [
  { key: "all", label: "전체", hint: "모든 가입 사용자" },
  { key: "platform", label: "플랫폼 운영", hint: "수퍼어드민·비즈니스·데모·콘텐츠" },
  { key: "org_admin", label: "기관 관리자", hint: "고객사 테넌트 ADMIN" },
  { key: "org_staff", label: "기관 담당", hint: "참여 현황·진단 조회 STAFF" },
  { key: "member", label: "기관 구성원", hint: "학생·지원자 MEMBER" },
  { key: "personal", label: "개인", hint: "소속·플랫폼 권한 없음" },
  { key: "review", label: "REVIEW", hint: "가입 이상 패턴 검토" },
];

export function parseUserSegment(raw?: string | null): UserIdentitySegment {
  if (
    raw === "platform" ||
    raw === "org_admin" ||
    raw === "org_staff" ||
    raw === "member" ||
    raw === "personal" ||
    raw === "review"
  ) {
    return raw;
  }
  return "all";
}

/** 목록 필터 우선순위: 플랫폼 권한 > 기관 역할 > 개인 */
export function resolveUserSegment(user: {
  platformRole: string;
  orgRole: string;
  organizationId: string | null;
  signupFlag?: string | null;
}): Exclude<UserIdentitySegment, "all"> {
  if (user.signupFlag === "REVIEW") return "review";
  if (user.platformRole && user.platformRole !== "NONE") return "platform";
  if (user.organizationId && user.orgRole === "ADMIN") return "org_admin";
  if (user.organizationId && user.orgRole === "STAFF") return "org_staff";
  if (user.organizationId && (user.orgRole === "MEMBER" || user.orgRole === "STUDENT")) {
    return "member";
  }
  return "personal";
}

export function userSegmentWhere(segment: UserIdentitySegment): Prisma.UserWhereInput {
  switch (segment) {
    case "platform":
      return { platformRole: { not: "NONE" } };
    case "org_admin":
      return { organizationId: { not: null }, orgRole: "ADMIN" };
    case "org_staff":
      return { organizationId: { not: null }, orgRole: "STAFF" };
    case "member":
      return {
        organizationId: { not: null },
        orgRole: { in: ["MEMBER", "STUDENT"] },
      };
    case "personal":
      return { organizationId: null, platformRole: "NONE" };
    case "review":
      return { signupFlag: "REVIEW" };
    default:
      return {};
  }
}

export type UserIdentityView = {
  segment: Exclude<UserIdentitySegment, "all">;
  primaryLabel: string;
  primaryTone: BadgeTone;
  orgName?: string;
  orgRoleLabel?: string;
  platformLabel?: string;
};

export function buildUserIdentityView(user: {
  platformRole: string;
  orgRole: string;
  organizationId: string | null;
  organization?: { name: string } | null;
  signupFlag?: string | null;
}): UserIdentityView {
  const segment = resolveUserSegment(user);
  const orgName = user.organization?.name;
  const platformLabel =
    user.platformRole && user.platformRole !== "NONE"
      ? (PLATFORM_ROLE_LABEL[user.platformRole] ?? user.platformRole)
      : undefined;
  const orgRoleLabel =
    user.organizationId && user.orgRole
      ? (ORG_ROLE_LABEL[user.orgRole] ?? user.orgRole)
      : undefined;

  switch (segment) {
    case "platform":
      return {
        segment,
        primaryLabel: "플랫폼 운영",
        primaryTone: "gold",
        platformLabel,
        orgName,
        orgRoleLabel,
      };
    case "org_admin":
      return {
        segment,
        primaryLabel: "기관 관리자",
        primaryTone: "accent",
        orgName,
        orgRoleLabel,
        platformLabel,
      };
    case "org_staff":
      return {
        segment,
        primaryLabel: "기관 담당",
        primaryTone: "primary",
        orgName,
        orgRoleLabel,
        platformLabel,
      };
    case "member":
      return {
        segment,
        primaryLabel: "기관 구성원",
        primaryTone: "neutral",
        orgName,
        orgRoleLabel,
        platformLabel,
      };
    case "review":
      return {
        segment,
        primaryLabel: "검토 필요",
        primaryTone: "warning",
        orgName,
        orgRoleLabel,
        platformLabel,
      };
    default:
      return {
        segment: "personal",
        primaryLabel: "개인 사용자",
        primaryTone: "neutral",
        platformLabel,
      };
  }
}

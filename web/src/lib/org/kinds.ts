import type { OrgKind, PlanTier } from "@prisma/client";

export type OrgKindConfig = {
  kind: OrgKind;
  label: string;
  description: string;
  defaultPlan: PlanTier;
  defaultSaas: boolean;
  defaultMaxSeats: number | null;
  memberLabel: string;
  features: string[];
};

export const ORG_KIND_CONFIG: Record<OrgKind, OrgKindConfig> = {
  CAREER_CENTER: {
    kind: "CAREER_CENTER",
    label: "취업센터·대학",
    description: "학생 코호트·벤치마크·가입 코드 중심",
    defaultPlan: "ORG_STANDARD",
    defaultSaas: false,
    defaultMaxSeats: null,
    memberLabel: "학생",
    features: ["코호트 대시보드", "학생 가입 코드", "벤치마크 리포트"],
  },
  HR_ENTERPRISE: {
    kind: "HR_ENTERPRISE",
    label: "기업 인사팀",
    description: "채용·면접 킷·맞춤 역량 중심",
    defaultPlan: "ORG_ENTERPRISE",
    defaultSaas: true,
    defaultMaxSeats: null,
    memberLabel: "담당자",
    features: ["인터뷰 킷 빌더", "맞춤 역량·루브릭", "지원자 프리뷰(예정)"],
  },
};

export const ORG_KINDS = Object.keys(ORG_KIND_CONFIG) as OrgKind[];

export function parseOrgKind(value: unknown): OrgKind | null {
  if (value === "CAREER_CENTER" || value === "HR_ENTERPRISE") return value;
  return null;
}

export function orgKindLabel(kind: OrgKind): string {
  return ORG_KIND_CONFIG[kind].label;
}

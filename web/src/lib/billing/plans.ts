import type { PlanTier } from "@prisma/client";

export type PlanDefinition = {
  tier: PlanTier;
  nameKo: string;
  description: string;
  /** 월 가격(원). null = 영업 문의 / 수동 계약 */
  priceMonthlyKrw: number | null;
  /** 토스페이먼츠 자동결제 대상 여부 */
  selfServeBilling: boolean;
  limits: {
    mockInterviewsPerMonth: number | null;
    selfDiscoveryPerMonth: number | null;
    orgMemberCap: number | null;
  };
  features: string[];
};

/** FREE는 Subscription 없이 기본 적용 */
export const PLANS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    tier: "FREE",
    nameKo: "Free",
    description: "기본 체험 플랜",
    priceMonthlyKrw: 0,
    selfServeBilling: false,
    limits: {
      mockInterviewsPerMonth: 3,
      selfDiscoveryPerMonth: 1,
      orgMemberCap: null,
    },
    features: [
      "월 3회 모의면접",
      "자기발견 인터뷰 1회/월",
      "기본 역량 리포트",
    ],
  },
  INDIVIDUAL_PRO: {
    tier: "INDIVIDUAL_PRO",
    nameKo: "Individual Pro",
    description: "개인 구독 — 무제한 연습",
    priceMonthlyKrw: null, // TODO: 가격 확정 후 설정
    selfServeBilling: true,
    limits: {
      mockInterviewsPerMonth: null,
      selfDiscoveryPerMonth: null,
      orgMemberCap: null,
    },
    features: [
      "무제한 모의면접",
      "자기발견 인터뷰 무제한",
      "상세 STAR·IRT 리포트",
      "역량 인증서 공유",
    ],
  },
  ORG_STANDARD: {
    tier: "ORG_STANDARD",
    nameKo: "Organization Standard",
    description: "기관(대학·센터) 표준 플랜",
    priceMonthlyKrw: null, // TODO: 가격 확정 후 설정
    selfServeBilling: true,
    limits: {
      mockInterviewsPerMonth: null,
      selfDiscoveryPerMonth: null,
      orgMemberCap: 50,
    },
    features: [
      "소속 학생 무제한 모의면접",
      "참여 현황·벤치마크",
      "기관 관리자 50명 상한",
      "자기발견 인터뷰 무제한",
    ],
  },
  ORG_ENTERPRISE: {
    tier: "ORG_ENTERPRISE",
    nameKo: "Organization Enterprise",
    description: "대형 기관·맞춤 계약 (세금계산서/계좌이체)",
    priceMonthlyKrw: null,
    selfServeBilling: false,
    limits: {
      mockInterviewsPerMonth: null,
      selfDiscoveryPerMonth: null,
      orgMemberCap: null,
    },
    features: [
      "무제한 인원",
      "전담 온보딩·커스텀 루브릭",
      "SLA·전용 지원",
      "세금계산서/계좌이체 계약",
    ],
  },
};

export const SELF_SERVE_PLAN_TIERS: PlanTier[] = ["INDIVIDUAL_PRO", "ORG_STANDARD"];

export const INDIVIDUAL_PLAN_TIERS: PlanTier[] = ["INDIVIDUAL_PRO"];

export const ORG_PLAN_TIERS: PlanTier[] = ["ORG_STANDARD", "ORG_ENTERPRISE"];

export function planLabel(tier: PlanTier): string {
  return PLANS[tier]?.nameKo ?? tier;
}

export function formatPriceKrw(amount: number | null): string {
  if (amount === null) return "가격 문의";
  if (amount === 0) return "무료";
  return `₩${amount.toLocaleString("ko-KR")}/월`;
}

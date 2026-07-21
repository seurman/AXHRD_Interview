import type { PlanTier } from "@prisma/client";

export type PlanDefinition = {
  tier: PlanTier;
  nameKo: string;
  description: string;
  /** 월 정액(원). null이면 좌석단가(pricePerSeatMonthlyKrw) 사용 */
  priceMonthlyKrw: number | null;
  /** 좌석당 월 단가(원) — 기관 플랜 */
  pricePerSeatMonthlyKrw?: number | null;
  minSeats?: number;
  maxSeatsPurchase?: number;
  /** 토스페이먼츠 자동결제 대상 여부 */
  selfServeBilling: boolean;
  limits: {
    mockInterviewsPerMonth: number | null;
    selfDiscoveryPerMonth: number | null;
    /** 역량 학습 일일 드릴(퀴즈·말하기) — 주간 한도. null=무제한 */
    dailyDrillsPerWeek: number | null;
    orgMemberCap: number | null;
  };
  features: string[];
};

/** FREE는 Subscription 없이 기본 적용 */
export const PLANS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    tier: "FREE",
    nameKo: "Free",
    description: "역량 개념 맛보기 + 가벼운 습관",
    priceMonthlyKrw: 0,
    selfServeBilling: false,
    limits: {
      mockInterviewsPerMonth: 1,
      selfDiscoveryPerMonth: 1,
      dailyDrillsPerWeek: 3,
      orgMemberCap: null,
    },
    features: [
      "역량 개념·원리 레슨 맛보기",
      "주 3회 매일 드릴",
      "월 1회 실전 모의면접",
      "틴더식 질문 카드(일일 한도)",
    ],
  },
  INDIVIDUAL_PRO: {
    tier: "INDIVIDUAL_PRO",
    nameKo: "Pro",
    description: "매일 역량 학습 루틴",
    priceMonthlyKrw: 9_900,
    selfServeBilling: true,
    limits: {
      mockInterviewsPerMonth: 4,
      selfDiscoveryPerMonth: 1,
      dailyDrillsPerWeek: null,
      orgMemberCap: null,
    },
    features: [
      "전 역량 지식·원리 트랙",
      "매일 드릴 무제한(저원가)",
      "틴더 스와이프·말하기 무제한",
      "월 4회 실전 모의면접",
      "성장·스트릭·배지",
    ],
  },
  INDIVIDUAL_PREMIUM: {
    tier: "INDIVIDUAL_PREMIUM",
    nameKo: "Premium",
    description: "실전·깊은 코칭·자소서 맞춤",
    priceMonthlyKrw: 24_900,
    selfServeBilling: true,
    limits: {
      mockInterviewsPerMonth: null,
      selfDiscoveryPerMonth: null,
      dailyDrillsPerWeek: null,
      orgMemberCap: null,
    },
    features: [
      "Pro 전체 +",
      "실전 모의 넉넉/무제한",
      "자소서 인용 깊은 캐물음",
      "트리플 렌즈·페르소나(제공 시)",
      "역량 인증서 공유",
    ],
  },
  ORG_STANDARD: {
    tier: "ORG_STANDARD",
    nameKo: "Organization Standard",
    description: "기관(대학·센터) 표준 플랜 — 좌석 단위",
    priceMonthlyKrw: null,
    pricePerSeatMonthlyKrw: 9_900,
    minSeats: 10,
    maxSeatsPurchase: 500,
    selfServeBilling: true,
    limits: {
      mockInterviewsPerMonth: null,
      selfDiscoveryPerMonth: null,
      dailyDrillsPerWeek: null,
      orgMemberCap: 50,
    },
    features: [
      "소속 구성원 무제한 모의면접",
      "참여 현황·코칭 콘솔",
      "좌석 단위 과금·초대 배포",
      "역량 학습 트랙·내부평가 웨이브",
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
      dailyDrillsPerWeek: null,
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

export const SELF_SERVE_PLAN_TIERS: PlanTier[] = [
  "INDIVIDUAL_PRO",
  "INDIVIDUAL_PREMIUM",
  "ORG_STANDARD",
];

export const INDIVIDUAL_PLAN_TIERS: PlanTier[] = [
  "INDIVIDUAL_PRO",
  "INDIVIDUAL_PREMIUM",
];

export const ORG_PLAN_TIERS: PlanTier[] = ["ORG_STANDARD", "ORG_ENTERPRISE"];

export function planLabel(tier: PlanTier): string {
  return PLANS[tier]?.nameKo ?? tier;
}

export function formatPriceKrw(amount: number | null): string {
  if (amount === null) return "가격 문의";
  if (amount === 0) return "무료";
  return `₩${amount.toLocaleString("ko-KR")}/월`;
}

export function clampSeatQuantity(tier: PlanTier, raw: number): number {
  const plan = PLANS[tier];
  const min = plan.minSeats ?? 1;
  const max = plan.maxSeatsPurchase ?? 1000;
  if (!Number.isFinite(raw)) return Math.max(min, plan.limits.orgMemberCap ?? min);
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

/** 결제 금액 계산 — 기관은 좌석×단가, 개인은 정액 */
export function resolvePlanChargeAmount(
  tier: PlanTier,
  seatQuantity?: number | null,
): number | null {
  const plan = PLANS[tier];
  if (plan.pricePerSeatMonthlyKrw != null) {
    const seats = clampSeatQuantity(
      tier,
      seatQuantity ?? plan.limits.orgMemberCap ?? plan.minSeats ?? 10,
    );
    return seats * plan.pricePerSeatMonthlyKrw;
  }
  return plan.priceMonthlyKrw;
}

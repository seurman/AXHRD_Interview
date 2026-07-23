import { productIntroHref, type ProductSlug } from "@/lib/landing/products";
import {
  LANDING_PRODUCT_ORDER,
  type LandingProductKey,
} from "@/lib/landing/product-keys";

export type { LandingProductKey };
export { LANDING_PRODUCT_ORDER };

const LANDING_KEY_TO_SLUG: Record<LandingProductKey, ProductSlug> = {
  discover: "discover",
  resumeReview: "resume",
  interview: "interview",
  cards: "practice",
  tracking: "growth",
  diagnostic: "diagnostic",
};

/** 랜딩 카드 → 제품 소개 페이지 */
export function landingProductHref(key: LandingProductKey, _trialOnly?: boolean): string {
  return productIntroHref(LANDING_KEY_TO_SLUG[key]);
}

export function landingStartHref(loggedIn: boolean, trialOnly: boolean): string {
  if (!loggedIn) return "/auth/register?next=/interview/setup";
  if (trialOnly) return "/demo#trial";
  return "/dashboard/jobseeker";
}

/** 랜딩 — 1문항 맛보기 (가입 벽 없이 /demo로 직행) */
export function landingDemoHref(_loggedIn: boolean): string {
  return "/demo#trial";
}

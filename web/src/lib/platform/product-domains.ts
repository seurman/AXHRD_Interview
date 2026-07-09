export const PRODUCT_DOMAINS = {
  interview: "interview.axhrd.com",
  ac: "ac.axhrd.com",
  diagnosis: "diagnosis.axhrd.com",
  hub: "axhrd.com",
} as const;

export type ProductKey = keyof typeof PRODUCT_DOMAINS;

/** 프로덕션: 제품 서브도메인 절대 URL. 로컬: same-origin 상대 경로 유지 */
export function productUrl(product: ProductKey, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (process.env.NODE_ENV !== "production") return normalized;
  return `https://${PRODUCT_DOMAINS[product]}${normalized}`;
}

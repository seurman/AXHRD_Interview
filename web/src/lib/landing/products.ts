import type { LandingProductKey } from "@/lib/landing/product-keys";

export type ProductSlug =
  | "discover"
  | "resume"
  | "interview"
  | "practice"
  | "growth"
  | "diagnostic"
  | "organizations";

export type ProductAudience = "personal" | "org";

export type ProductDef = {
  slug: ProductSlug;
  /** i18n key under products.pages */
  pageKey: ProductSlug;
  audience: ProductAudience;
  tone: "violet" | "sky" | "navy" | "amber" | "emerald" | "teal" | "slate";
  /** maps to landing rail order where applicable */
  landingKey?: LandingProductKey;
};

export const PRODUCT_CATALOG: ProductDef[] = [
  { slug: "discover", pageKey: "discover", audience: "personal", tone: "violet", landingKey: "discover" },
  { slug: "resume", pageKey: "resume", audience: "personal", tone: "sky", landingKey: "resumeReview" },
  { slug: "interview", pageKey: "interview", audience: "personal", tone: "navy", landingKey: "interview" },
  { slug: "practice", pageKey: "practice", audience: "personal", tone: "amber", landingKey: "cards" },
  { slug: "growth", pageKey: "growth", audience: "personal", tone: "emerald", landingKey: "tracking" },
  { slug: "diagnostic", pageKey: "diagnostic", audience: "org", tone: "teal", landingKey: "diagnostic" },
  { slug: "organizations", pageKey: "organizations", audience: "org", tone: "slate" },
];

const SLUG_SET = new Set(PRODUCT_CATALOG.map((p) => p.slug));

export function isProductSlug(raw: string): raw is ProductSlug {
  return SLUG_SET.has(raw as ProductSlug);
}

export function getProduct(slug: ProductSlug): ProductDef {
  return PRODUCT_CATALOG.find((p) => p.slug === slug)!;
}

export function productIntroHref(slug: ProductSlug): string {
  return `/products/${slug}`;
}

const APP_HREFS: Record<ProductSlug, { personal: string; demo?: string; org?: string }> = {
  discover: { personal: "/discover", demo: "/demo" },
  resume: { personal: "/resume-review", demo: "/demo" },
  interview: { personal: "/interview/setup", demo: "/demo" },
  practice: { personal: "/practice/swipe", demo: "/demo" },
  growth: { personal: "/dashboard", demo: "/demo" },
  diagnostic: { personal: "/diagnosis", org: "/org/diagnosis" },
  organizations: { personal: "/org/setup", org: "/org/setup" },
};

/** 제품 소개 페이지 하단 CTA → 실제 앱 진입 */
export function productAppHref(
  slug: ProductSlug,
  opts: { trialOnly: boolean; loggedIn: boolean },
): string {
  const routes = APP_HREFS[slug];
  if (slug === "organizations") return routes.org ?? "/org/setup";
  if (opts.trialOnly && routes.demo) return routes.demo;
  if (!opts.loggedIn && slug === "interview") {
    return "/auth/register?next=/interview/setup";
  }
  return routes.personal;
}

export function relatedProducts(slug: ProductSlug): ProductDef[] {
  const current = getProduct(slug);
  return PRODUCT_CATALOG.filter(
    (p) => p.slug !== slug && (p.audience === current.audience || p.audience === "personal"),
  ).slice(0, 3);
}

"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";
import {
  PRODUCT_CATALOG,
  productAppHref,
  productIntroHref,
  relatedProducts,
  type ProductSlug,
} from "@/lib/landing/products";

export function ProductIntro({ slug }: { slug: ProductSlug }) {
  const { dict } = useI18n();
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const page = dict.products.pages[slug];
  const common = dict.products.common;
  const product = PRODUCT_CATALOG.find((p) => p.slug === slug)!;
  const appHref = productAppHref(slug, { trialOnly, loggedIn });
  const related = relatedProducts(slug);

  return (
    <div className="pi">
      <section className={`pi-hero pi-hero--${product.tone}`}>
        <div className="pi-shell">
          <nav className="pi-crumb" aria-label="Breadcrumb">
            <Link href="/products">{common.hub}</Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
            <span>{page.eyebrow}</span>
          </nav>
          <Reveal>
            <p className="pi-eyebrow">{page.eyebrow}</p>
            <h1 className="pi-title">{page.headline}</h1>
            <p className="pi-lead">{page.subtitle}</p>
            <div className="pi-hero-actions">
              <Link href={appHref} className="pi-btn pi-btn--primary">
                {page.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {page.ctaSecondaryHref && page.ctaSecondaryLabel && (
                <Link href={page.ctaSecondaryHref} className="pi-btn pi-btn--ghost">
                  {page.ctaSecondaryLabel}
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pi-section">
        <div className="pi-shell">
          <div className="pi-highlights">
            {page.highlights.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <article className="pi-highlight">
                  <h2>{item.title}</h2>
                  <p>{item.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {page.capabilities.length > 0 && (
        <section className="pi-section pi-section--muted">
          <div className="pi-shell pi-split">
            <Reveal>
              <h2 className="pi-h2">{page.capabilitiesTitle}</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <ul className="pi-cap-list">
                {page.capabilities.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="pi-section">
          <div className="pi-shell">
            <h2 className="pi-h2 pi-related-title">{common.related}</h2>
            <div className="pi-related-grid">
              {related.map((rel) => {
                const relPage = dict.products.pages[rel.slug];
                return (
                  <Link
                    key={rel.slug}
                    href={productIntroHref(rel.slug)}
                    className={`pi-related-card pi-related-card--${rel.tone} group`}
                  >
                    <p className="pi-related-kicker">{relPage.eyebrow}</p>
                    <h3>{relPage.headline}</h3>
                    <span className="pi-related-go">
                      {common.learnMore}
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className={`pi-cta pi-cta--${product.tone}`}>
        <div className="pi-shell pi-cta-inner">
          <h2 className="pi-cta-title">{page.closingTitle}</h2>
          <Link href={appHref} className="pi-btn pi-btn--primary pi-btn--on-dark">
            {page.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

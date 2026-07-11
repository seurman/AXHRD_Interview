"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PRODUCT_CATALOG, productIntroHref } from "@/lib/landing/products";

export function ProductsHub() {
  const { dict } = useI18n();
  const hub = dict.products.hub;
  const pages = dict.products.pages;

  const personal = PRODUCT_CATALOG.filter((p) => p.audience === "personal");
  const org = PRODUCT_CATALOG.filter((p) => p.audience === "org");

  return (
    <div className="pi pi-hub">
      <section className="pi-hero pi-hero--hub">
        <div className="pi-shell">
          <Reveal>
            <p className="pi-eyebrow">{hub.eyebrow}</p>
            <h1 className="pi-title">{hub.title}</h1>
            <p className="pi-lead">{hub.subtitle}</p>
          </Reveal>
        </div>
      </section>

      <section className="pi-section">
        <div className="pi-shell">
          <p className="pi-hub-label">{hub.personalLabel}</p>
          <div className="pi-hub-grid">
            {personal.map((product, i) => {
              const page = pages[product.slug];
              return (
                <Reveal key={product.slug} delay={i * 0.04}>
                  <Link
                    href={productIntroHref(product.slug)}
                    className={`pi-hub-card pi-hub-card--${product.tone} group`}
                  >
                    <p className="pi-hub-kicker">{page.eyebrow}</p>
                    <h2>{page.headline}</h2>
                    <p className="pi-hub-tag">{page.subtitle}</p>
                    <span className="pi-hub-go">
                      {dict.products.common.learnMore}
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <p className="pi-hub-label pi-hub-label--org">{hub.orgLabel}</p>
          <div className="pi-hub-grid pi-hub-grid--org">
            {org.map((product, i) => {
              const page = pages[product.slug];
              return (
                <Reveal key={product.slug} delay={i * 0.04}>
                  <Link
                    href={productIntroHref(product.slug)}
                    className={`pi-hub-card pi-hub-card--${product.tone} group`}
                  >
                    <p className="pi-hub-kicker">{page.eyebrow}</p>
                    <h2>{page.headline}</h2>
                    <p className="pi-hub-tag">{page.subtitle}</p>
                    <span className="pi-hub-go">
                      {dict.products.common.learnMore}
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pi-cta pi-cta--hub">
        <div className="pi-shell pi-cta-inner">
          <h2 className="pi-cta-title">{hub.closingTitle}</h2>
          <div className="pi-hero-actions pi-hero-actions--center">
            <Link href="/auth/register" className="pi-btn pi-btn--primary pi-btn--on-dark">
              {hub.ctaPersonal}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/products/organizations" className="pi-btn pi-btn--ghost pi-btn--on-dark-ghost">
              {hub.ctaOrg}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

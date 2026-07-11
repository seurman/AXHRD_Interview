"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { productIntroHref, type ProductSlug } from "@/lib/landing/products";

type Chapter = {
  slug: ProductSlug;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  visual: "journey" | "interview" | "org";
  flip?: boolean;
};

export function LandingEditorialChapters() {
  const { dict } = useI18n();
  const h = dict.home;

  const chapters: Chapter[] = [
    {
      slug: "discover",
      eyebrow: h.spotlight.eyebrow,
      title: h.spotlight.title,
      body: h.spotlight.desc,
      cta: h.spotlight.cta,
      visual: "journey",
    },
    {
      slug: "interview",
      eyebrow: h.features.interview.title,
      title: h.preview.interview.label,
      body: h.features.interview.desc,
      cta: h.rail.open,
      visual: "interview",
      flip: true,
    },
    {
      slug: "organizations",
      eyebrow: h.enterprise.eyebrow,
      title: h.enterprise.title,
      body: h.enterprise.desc,
      cta: h.enterprise.cta,
      visual: "org",
    },
  ];

  return (
    <div className="lp-ed-chapters">
      {chapters.map((chapter) => (
        <section
          key={chapter.slug}
          className={`lp-ed-chapter${chapter.flip ? " lp-ed-chapter--flip" : ""}`}
        >
          <div className="lp-shell lp-ed-chapter-grid">
            <div className="lp-ed-chapter-copy">
              <p className="lp-ed-kicker lp-ed-kicker--ink">{chapter.eyebrow}</p>
              <h2 className="lp-ed-chapter-title">{chapter.title}</h2>
              <p className="lp-ed-chapter-body">{chapter.body}</p>
              <Link href={productIntroHref(chapter.slug)} className="lp-ed-link group">
                {chapter.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className={`lp-ed-visual lp-ed-visual--${chapter.visual}`} aria-hidden>
              {chapter.visual === "journey" && (
                <div className="lp-ed-journey">
                  {h.spotlight.points.map((point) => (
                    <p key={point}>{point}</p>
                  ))}
                </div>
              )}
              {chapter.visual === "interview" && (
                <div className="lp-ed-interview-card">
                  <p className="lp-ed-interview-q">{h.preview.interview.question}</p>
                  <div className="lp-ed-interview-meta">
                    <span>{h.preview.interview.chips[0]}</span>
                    <span>{h.preview.interview.chips[2]}</span>
                  </div>
                  <div className="lp-ed-interview-wave">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} style={{ height: `${28 + (i % 5) * 12}%` }} />
                    ))}
                  </div>
                </div>
              )}
              {chapter.visual === "org" && (
                <div className="lp-ed-org-grid">
                  {h.pillars.org.items.map((item) => (
                    <div key={item.title} className="lp-ed-org-cell">
                      <p className="lp-ed-org-cell-title">{item.title}</p>
                      <p className="lp-ed-org-cell-desc">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

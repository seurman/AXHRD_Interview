"use client";

import { BarChart3, Mic2, Quote, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const ICONS = [Mic2, BarChart3, Sparkles, Quote] as const;

/** 갤러리 스트립 — 제품 화면 타일(인물 사진 대체) */
export function LandingGalleryTiles() {
  const { dict } = useI18n();
  const tiles = dict.home.gallery;

  return (
    <section className="lp-gallery lp-gallery--product" aria-label={tiles.ariaLabel}>
      {tiles.items.map((item, i) => {
        const Icon = ICONS[i] ?? Mic2;
        return (
          <div key={item.title} className={`lp-gallery-tile lp-gallery-tile--${i + 1}`}>
            <div className="lp-gallery-tile-inner">
              <span className="lp-gallery-tile-icon">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="lp-gallery-tile-kicker">{item.kicker}</p>
              <h3 className="lp-gallery-tile-title">{item.title}</h3>
              <p className="lp-gallery-tile-desc">{item.desc}</p>
              <div className="lp-gallery-tile-mock">
                {item.mock.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

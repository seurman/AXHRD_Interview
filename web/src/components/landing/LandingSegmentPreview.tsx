"use client";

import Link from "next/link";
import { Building2, Briefcase, GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const ICONS = {
  university: Building2,
  company: Briefcase,
  student: GraduationCap,
} as const;

function SegmentVisual({ icon }: { icon: keyof typeof ICONS }) {
  if (icon === "university") {
    return (
      <div className="lp-segment-visual lp-segment-visual--bars" aria-hidden>
        <span className="lp-segment-visual-bar" style={{ height: "40%" }} />
        <span className="lp-segment-visual-bar lp-segment-visual-bar--fill" style={{ height: "70%" }} />
        <span className="lp-segment-visual-bar lp-segment-visual-bar--fill" style={{ height: "100%" }} />
        <span className="lp-segment-visual-bar" style={{ height: "55%" }} />
      </div>
    );
  }
  if (icon === "company") {
    return (
      <div
        className="lp-segment-visual"
        style={{ flexDirection: "column", alignItems: "stretch" }}
        aria-hidden
      >
        <span className="lp-segment-visual-line" style={{ width: "100%" }} />
        <span className="lp-segment-visual-line" style={{ width: "70%" }} />
        <span className="lp-segment-visual-line lp-segment-visual-line--fill" style={{ width: "45%" }} />
      </div>
    );
  }
  return (
    <div className="lp-segment-visual" aria-hidden>
      <span className="lp-segment-visual-ring" />
    </div>
  );
}

export function LandingSegmentPreview() {
  const { dict } = useI18n();
  const s = dict.home.segments;

  return (
    <section className="lp-segments" aria-labelledby="lp-segments-title">
      <div className="lp-shell">
        <div className="lp-segments-header">
          <p className="lp-kicker lp-kicker--ink">{s.eyebrow}</p>
          <h2 id="lp-segments-title" className="lp-h2">
            {s.title}
          </h2>
          <p className="lp-rail-sub">{s.subtitle}</p>
        </div>

        <div className="lp-segments-grid">
          {s.items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link key={item.title} href={item.href} className="lp-segment-card group">
                <span className="lp-segment-icon">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="lp-segment-title">{item.title}</p>
                <p className="lp-segment-desc">{item.desc}</p>
                <SegmentVisual icon={item.icon} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

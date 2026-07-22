"use client";

import Link from "next/link";
import { QUADSCOPE_PRODUCT, type ScopeRollup } from "@/lib/quadscope";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function QuadScopePanel({
  scopes,
  growHref = "/practice/path",
}: {
  scopes: ScopeRollup[];
  growHref?: string;
}) {
  const { locale } = useI18n();
  const weakest = [...scopes]
    .filter((s) => s.percentile != null)
    .sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100))[0];

  return (
    <section
      className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-background p-5 sm:p-6"
      aria-labelledby="quadscope-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {QUADSCOPE_PRODUCT.name}
          </p>
          <h2 id="quadscope-heading" className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
            {locale === "ko" ? QUADSCOPE_PRODUCT.taglineKo : QUADSCOPE_PRODUCT.taglineEn}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Judgment · Delivery · Relations · Anchor
          </p>
        </div>
        {weakest && (
          <Link href={growHref} className="btn-secondary text-sm">
            {locale === "ko"
              ? `${weakest.nameEn} 보완하기`
              : `Grow ${weakest.nameEn}`}
          </Link>
        )}
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scopes.map((s) => {
          const pct = s.percentile;
          const width = pct == null ? 0 : Math.max(4, Math.min(100, pct));
          return (
            <li
              key={s.id}
              className="rounded-xl border border-border/50 bg-background/80 px-3.5 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold tracking-tight">{s.nameEn}</p>
                  <p className="text-[11px] text-muted">{s.nameKo}</p>
                </div>
                <p className="text-sm font-medium tabular-nums text-foreground/90">
                  {pct == null ? "—" : `${pct}`}
                </p>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                  style={{ width: `${width}%` }}
                  aria-hidden
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                {s.assessedCount === 0
                  ? locale === "ko"
                    ? "아직 측정 전"
                    : "Not measured yet"
                  : locale === "ko"
                    ? `${s.assessedCount}개 역량 평균`
                    : `${s.assessedCount} competencies`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

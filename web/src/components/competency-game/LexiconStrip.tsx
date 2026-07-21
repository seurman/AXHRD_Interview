"use client";

import { listLexiconTerms, getLexicon } from "@/lib/competency/lexicon";
import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";

export function LexiconStrip({ competency }: { competency: string }) {
  const code = competency.toUpperCase() as CompetencyCode;
  if (!COMPETENCY_CODES.includes(code)) return null;
  const lex = getLexicon(code);
  const terms = listLexiconTerms(code);

  return (
    <section className="space-y-2 rounded-2xl border border-card-border bg-primary/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">역량 단어장</h2>
        <p className="text-[11px] text-muted">{lex.ncsAnchor}</p>
      </div>
      <p className="text-xs leading-relaxed text-muted">{lex.definition}</p>
      <ul className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <li
            key={t.id}
            title={`${t.meaningKo}\n예: ${t.goodExample}`}
            className="rounded-lg border border-card-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
          >
            <span className="text-gold">{t.kind === "phrase" ? "숙어" : "단어"}</span>
            <span className="mx-1 text-muted">·</span>
            {t.termKo}
          </li>
        ))}
      </ul>
    </section>
  );
}

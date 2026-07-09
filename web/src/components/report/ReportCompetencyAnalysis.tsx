"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { competencyLabel } from "@/lib/utils";
import type { ReportSection } from "@/types";

export function ReportCompetencyAnalysis({ sections }: { sections: ReportSection[] }) {
  const radarData = sections.map((s) => ({
    competency:
      competencyLabel(s.title) !== s.title ? competencyLabel(s.title) : s.title,
    score: s.score ?? 0,
    code: s.title,
  }));

  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-foreground">역량별 분석</h2>

      {radarData.length > 0 && (
        <div className="card-luxe p-4">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-card-border)" />
              <PolarAngleAxis
                dataKey="competency"
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              />
              <Radar
                dataKey="score"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.28}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((s) => (
          <CompetencyAccordionCard key={s.title} section={s} />
        ))}
      </div>
    </section>
  );
}

function CompetencyAccordionCard({ section }: { section: ReportSection }) {
  const [open, setOpen] = useState(false);
  const title =
    competencyLabel(section.title) !== section.title
      ? competencyLabel(section.title)
      : section.title;

  return (
    <div className="card-luxe overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium text-foreground">{title}</h3>
            {section.score != null && (
              <span className="shrink-0 text-sm font-medium text-gold">{section.score}%</span>
            )}
          </div>
          {section.highlight && (
            <p className="mt-2 border-l-2 border-gold/60 pl-3 text-sm italic text-foreground report-prose">
              “{section.highlight}”
            </p>
          )}
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-card-border px-5 pb-5 pt-3">
              <p className="text-sm text-muted report-prose">{section.content}</p>
              {section.suggestions && section.suggestions.length > 0 && (
                <ul className="mt-3 list-inside list-disc text-xs text-muted report-prose">
                  {section.suggestions.map((sg, i) => (
                    <li key={i}>{sg}</li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

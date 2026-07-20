"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Slide = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  content: ReactNode;
};

/** 면접 리포트 장표 — 화면은 탭, 인쇄는 전체 */
export function SessionReportTabs({ slides }: { slides: Slide[] }) {
  const first = slides[0]?.id ?? "summary";

  return (
    <>
      <Tabs defaultValue={first} className="print-hide gap-5">
        <TabsList variant="default" className="report-jangpyo-tabs" aria-label="리포트 장표">
          {slides.map((s, i) => (
            <TabsTrigger key={s.id} value={s.id} className="report-jangpyo-tab nav-pill">
              <span className="mr-1.5 tabular-nums opacity-70">{i + 1}</span>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {slides.map((s) => (
          <TabsContent key={s.id} value={s.id} className="space-y-6 outline-none">
            <header className="report-slide-head">
              <p className="report-slide-head__eyebrow">{s.eyebrow}</p>
              <h2 className="report-slide-head__title">{s.title}</h2>
            </header>
            {s.content}
          </TabsContent>
        ))}
      </Tabs>

      <div className="report-jangpyo-print-all hidden print:block">
        {slides.map((s, i) => (
          <section key={s.id} className="mb-10 space-y-6">
            <header className="report-slide-head">
              <p className="report-slide-head__eyebrow">
                {i + 1}. {s.eyebrow}
              </p>
              <h2 className="report-slide-head__title">{s.title}</h2>
            </header>
            {s.content}
          </section>
        ))}
      </div>
    </>
  );
}

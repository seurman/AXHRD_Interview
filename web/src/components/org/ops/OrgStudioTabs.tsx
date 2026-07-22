"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

export type OrgStudioTabItem = {
  id: string;
  label: string;
  content?: ReactNode;
  badge?: number;
};

/** 기관 콘솔 탭 — 금색 액티브 (검은 반전 대신) */
export function OrgStudioTabs({
  tabs,
  value,
  onValueChange,
  className,
  listClassName,
  /** content 없이 트리거만 쓸 때 (콘솔 레일/모바일) */
  triggersOnly = false,
}: {
  tabs: OrgStudioTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  listClassName?: string;
  triggersOnly?: boolean;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn(triggersOnly ? "gap-0" : "gap-4", className)}
    >
      <TabsList
        variant="default"
        className={cn(
          "org-studio-tabs h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-card-border bg-card p-1.5 shadow-luxe",
          listClassName,
        )}
        aria-label="기관 콘솔 섹션"
      >
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="org-studio-tab relative rounded-lg px-3.5 py-2.5 text-sm font-semibold data-active:bg-gold data-active:text-white data-active:shadow-sm"
          >
            {t.label}
            {t.badge != null && t.badge > 0 ? (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {!triggersOnly
        ? tabs.map((t) => (
            <TabsContent key={t.id} value={t.id} className="outline-none">
              {t.content}
            </TabsContent>
          ))
        : null}
    </Tabs>
  );
}

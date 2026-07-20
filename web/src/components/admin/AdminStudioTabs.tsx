"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

export type AdminStudioTabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

/** Platform Console 스튜디오 탭 — accent 필 대신 shadcn Tabs + platform 톤 */
export function AdminStudioTabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: AdminStudioTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn("gap-5", className)}
    >
      <TabsList
        variant="default"
        className="admin-studio-tabs h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-[var(--platform-border)] bg-[var(--platform-surface)] p-1.5"
        aria-label="스튜디오 섹션"
      >
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="admin-studio-tab rounded-lg px-3.5 py-2 text-sm font-medium data-active:bg-[var(--platform-accent)] data-active:text-white data-active:shadow-sm"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="outline-none">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

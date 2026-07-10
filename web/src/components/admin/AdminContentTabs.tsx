"use client";

import { useState } from "react";
import { FrameworkStudio } from "@/components/admin/framework/FrameworkStudio";
import { AdminOrgCustomCompetenciesPanel } from "@/components/admin/AdminOrgCustomCompetenciesPanel";
import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";
import type { FrameworkWorkspaceTab } from "@/components/admin/framework/FrameworkCompetencyWorkspace";

type Props = {
  initialClusters: BankCluster[];
  initialCompetencies: BankCompetencyRow[];
  initialQuestions: Awaited<ReturnType<typeof import("@/lib/competency/content-bank-data").loadContentBankSnapshot>>["questions"];
  initialCompetencyCode?: string | null;
  initialTab?: FrameworkWorkspaceTab | null;
};

export function AdminContentTabs({
  initialClusters,
  initialCompetencies,
  initialQuestions,
  initialCompetencyCode,
  initialTab,
}: Props) {
  const [tab, setTab] = useState<"platform" | "org_custom">("platform");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-card-border pb-2">
        <button
          type="button"
          onClick={() => setTab("platform")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "platform" ? "bg-accent text-white" : "text-muted hover:bg-card-border/40"
          }`}
        >
          Framework Studio
        </button>
        <button
          type="button"
          onClick={() => setTab("org_custom")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "org_custom" ? "bg-accent text-white" : "text-muted hover:bg-card-border/40"
          }`}
        >
          기관 커스텀 역량
        </button>
      </div>

      {tab === "platform" ? (
        <FrameworkStudio
          initialClusters={initialClusters}
          initialCompetencies={initialCompetencies}
          initialQuestions={initialQuestions}
          initialCompetencyCode={initialCompetencyCode}
          initialTab={initialTab}
        />
      ) : (
        <AdminOrgCustomCompetenciesPanel />
      )}
    </div>
  );
}

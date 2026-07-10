"use client";

import { useState } from "react";
import { FrameworkStudio } from "@/components/admin/framework/FrameworkStudio";
import { AdminOrgCustomCompetenciesPanel } from "@/components/admin/AdminOrgCustomCompetenciesPanel";
import { GlobalCompetencyDictionaryPanel } from "@/components/admin/GlobalCompetencyDictionaryPanel";
import { MeaningLayerPanel } from "@/components/admin/MeaningLayerPanel";
import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";
import type { FrameworkWorkspaceTab } from "@/components/admin/framework/FrameworkCompetencyWorkspace";

export type ContentStudioView = "platform" | "global_source" | "alignment" | "org_custom";

type Props = {
  initialClusters: BankCluster[];
  initialCompetencies: BankCompetencyRow[];
  initialQuestions: Awaited<ReturnType<typeof import("@/lib/competency/content-bank-data").loadContentBankSnapshot>>["questions"];
  initialCompetencyCode?: string | null;
  initialTab?: FrameworkWorkspaceTab | null;
  initialView?: ContentStudioView | null;
};

const VIEW_TABS: { id: ContentStudioView; label: string }[] = [
  { id: "platform", label: "Framework Studio" },
  { id: "global_source", label: "글로벌 사전 (원본)" },
  { id: "alignment", label: "정렬 · 온톨로지" },
  { id: "org_custom", label: "기관 커스텀 역량" },
];

export function AdminContentTabs({
  initialClusters,
  initialCompetencies,
  initialQuestions,
  initialCompetencyCode,
  initialTab,
  initialView,
}: Props) {
  const [view, setView] = useState<ContentStudioView>(initialView ?? "platform");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-card-border pb-2">
        {VIEW_TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              view === id ? "bg-accent text-white" : "text-muted hover:bg-card-border/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "platform" && (
        <FrameworkStudio
          initialClusters={initialClusters}
          initialCompetencies={initialCompetencies}
          initialQuestions={initialQuestions}
          initialCompetencyCode={initialCompetencyCode}
          initialTab={initialTab}
        />
      )}

      {view === "global_source" && <GlobalCompetencyDictionaryPanel embedded />}

      {view === "alignment" && <MeaningLayerPanel embedded />}

      {view === "org_custom" && <AdminOrgCustomCompetenciesPanel />}
    </div>
  );
}

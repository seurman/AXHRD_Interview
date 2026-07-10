"use client";

import { useState } from "react";
import { ContentMetadataStudio } from "@/components/admin/ContentMetadataStudio";
import { AdminOrgCustomCompetenciesPanel } from "@/components/admin/AdminOrgCustomCompetenciesPanel";
import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";

type Props = {
  initialClusters: BankCluster[];
  initialCompetencies: BankCompetencyRow[];
  initialQuestions: Awaited<ReturnType<typeof import("@/lib/competency/content-bank-data").loadContentBankSnapshot>>["questions"];
};

export function AdminContentTabs({
  initialClusters,
  initialCompetencies,
  initialQuestions,
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
          플랫폼 뱅크
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
        <ContentMetadataStudio
          initialClusters={initialClusters}
          initialCompetencies={initialCompetencies}
          initialQuestions={initialQuestions}
        />
      ) : (
        <AdminOrgCustomCompetenciesPanel />
      )}
    </div>
  );
}

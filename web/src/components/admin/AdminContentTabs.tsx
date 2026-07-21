"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FrameworkStudio } from "@/components/admin/framework/FrameworkStudio";
import { AdminOrgCustomCompetenciesPanel } from "@/components/admin/AdminOrgCustomCompetenciesPanel";
import { GlobalCompetencyDictionaryPanel } from "@/components/admin/GlobalCompetencyDictionaryPanel";
import { LexiconDictionaryPanel } from "@/components/admin/LexiconDictionaryPanel";
import { NcsCompetencyBankPanel } from "@/components/admin/NcsCompetencyBankPanel";
import { MeaningLayerPanel } from "@/components/admin/MeaningLayerPanel";
import { AdminStudioTabs } from "@/components/admin/AdminStudioTabs";
import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";
import type { FrameworkWorkspaceTab } from "@/components/admin/framework/FrameworkCompetencyWorkspace";

export type ContentStudioView =
  | "platform"
  | "lexicon"
  | "ncs"
  | "global_source"
  | "alignment"
  | "org_custom";

type Props = {
  initialClusters: BankCluster[];
  initialCompetencies: BankCompetencyRow[];
  initialQuestions: Awaited<
    ReturnType<typeof import("@/lib/competency/content-bank-data").loadContentBankSnapshot>
  >["questions"];
  initialCompetencyCode?: string | null;
  initialTab?: FrameworkWorkspaceTab | null;
  initialView?: ContentStudioView | null;
};

export function AdminContentTabs({
  initialClusters,
  initialCompetencies,
  initialQuestions,
  initialCompetencyCode,
  initialTab,
  initialView,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<ContentStudioView>(initialView ?? "platform");

  const tabs = [
    {
      id: "platform",
      label: "Framework Studio",
      content: (
        <FrameworkStudio
          initialClusters={initialClusters}
          initialCompetencies={initialCompetencies}
          initialQuestions={initialQuestions}
          initialCompetencyCode={initialCompetencyCode}
          initialTab={initialTab}
        />
      ),
    },
    {
      id: "lexicon",
      label: "역량사전",
      content: (
        <LexiconDictionaryPanel
          embedded
          onSynced={() => {
            router.refresh();
            setView("platform");
          }}
        />
      ),
    },
    {
      id: "ncs",
      label: "NCS 역량",
      content: (
        <NcsCompetencyBankPanel
          competencies={initialCompetencies}
          onSynced={() => router.refresh()}
        />
      ),
    },
    {
      id: "global_source",
      label: "글로벌 사전 (원본)",
      content: <GlobalCompetencyDictionaryPanel embedded />,
    },
    {
      id: "alignment",
      label: "정렬 · 온톨로지",
      content: <MeaningLayerPanel embedded />,
    },
    {
      id: "org_custom",
      label: "기관 커스텀 역량",
      content: <AdminOrgCustomCompetenciesPanel />,
    },
  ];

  return (
    <AdminStudioTabs
      tabs={tabs}
      value={view}
      onValueChange={(v) => setView(v as ContentStudioView)}
    />
  );
}

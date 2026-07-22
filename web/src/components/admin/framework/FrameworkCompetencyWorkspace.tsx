"use client";

import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { ContentMetadataStudio } from "@/components/admin/ContentMetadataStudio";
import { CompetencyWorkspace } from "@/components/admin/repository/CompetencyWorkspace";
import { FrameworkMetaPanel } from "@/components/admin/framework/FrameworkMetaPanel";
import { QuadScopeBadge } from "@/components/quadscope/QuadScopeBadge";

export type FrameworkWorkspaceTab = "meta" | "levels" | "questions" | "rubrics" | "quality";

type Props = {
  competency: BankCompetencyRow;
  clusters: BankCluster[];
  competencies: BankCompetencyRow[];
  questions: Awaited<ReturnType<typeof import("@/lib/competency/content-bank-data").loadContentBankSnapshot>>["questions"];
  tab: FrameworkWorkspaceTab;
  onTabChange: (tab: FrameworkWorkspaceTab) => void;
  onCompetencyUpdated: (id: string, patch: Partial<BankCompetencyRow>) => void;
  onDataRefresh: () => Promise<void>;
};

function toRepositoryRow(c: BankCompetencyRow): RepositoryCompetencyRow {
  return {
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    category: c.clusterNameKo ?? c.source,
    description: c.description,
    lifecycleStatus: c.lifecycleStatus,
    isActive: c.isActive,
    source: c.source,
    questionCount: c.questionCount,
  };
}

const TABS: { id: FrameworkWorkspaceTab; label: string }[] = [
  { id: "meta", label: "개요" },
  { id: "levels", label: "문항·레벨" },
  { id: "questions", label: "문항 테이블" },
  { id: "rubrics", label: "루브릭" },
  { id: "quality", label: "품질" },
];

export function FrameworkCompetencyWorkspace({
  competency,
  clusters,
  competencies,
  questions,
  tab,
  onTabChange,
  onCompetencyUpdated,
  onDataRefresh,
}: Props) {
  return (
    <div className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-card-border bg-gradient-to-br from-card to-muted/15 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Framework Studio</p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">{competency.nameKo}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-mono text-xs">{competency.code}</span>
          <QuadScopeBadge competencyCode={competency.code} showKo />
          {competency.clusterNameKo && (
            <span className="text-xs">· {competency.clusterNameKo}</span>
          )}
        </p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-xl border border-card-border bg-card p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
              tab === id ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "meta" && (
        <FrameworkMetaPanel
          competency={competency}
          onUpdated={(patch) => onCompetencyUpdated(competency.id, patch)}
        />
      )}

      {(tab === "levels" || tab === "questions" || tab === "rubrics") && (
        <ContentMetadataStudio
          layout="workspace"
          workspacePanel={tab}
          controlledSelectedId={competency.id}
          initialClusters={clusters}
          initialCompetencies={competencies}
          initialQuestions={questions}
          onRefresh={onDataRefresh}
        />
      )}

      {tab === "quality" && (
        <CompetencyWorkspace
          competency={toRepositoryRow(competency)}
          embedded
          onOpenQuestions={() => onTabChange("levels")}
          onRefreshList={() => void onDataRefresh()}
        />
      )}
    </div>
  );
}

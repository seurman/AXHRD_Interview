"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { KitStudioEditor } from "@/components/admin/kit-studio/KitStudioEditor";
import { createKitStudioConfig } from "@/components/admin/kit-studio/create-kit-config";
import type { DemoCompetencyDto, DemoQuestionDto } from "@/lib/demo/workspace";

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  initialCompetencies: DemoCompetencyDto[];
  initialQuestions: DemoQuestionDto[];
};

export function DemoWorkspaceEditor({
  workspaceId,
  workspaceSlug,
  initialCompetencies,
  initialQuestions,
}: Props) {
  const config = useMemo(() => createKitStudioConfig("demo", workspaceId), [workspaceId]);
  const [presenterUrl, setPresenterUrl] = useState<string | null>(null);
  const [materializing, setMaterializing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [competencyCount, setCompetencyCount] = useState(initialCompetencies.length);

  const onRefreshData = useCallback((data: Record<string, unknown>) => {
    if (typeof data.presenterUrl === "string") {
      setPresenterUrl(data.presenterUrl);
    }
  }, []);

  useEffect(() => {
    void fetch(config.apiBase)
      .then((res) => res.json())
      .then((data) => onRefreshData(data as Record<string, unknown>))
      .catch(() => {});
  }, [config.apiBase, onRefreshData]);

  const materializeToProduction = async () => {
    if (competencyCount === 0) {
      setMessage("키트에 역량이 없습니다. 먼저 역량을 추가하세요.");
      return;
    }
    if (!confirm("이 데모 키트를 운영 문항 뱅크(역량·문항·평가)에 반영할까요?")) return;
    setMaterializing(true);
    setMessage(null);
    try {
      const res = await fetch(config.apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "materializeToProduction" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "반영 실패");
      setMessage(
        `운영 뱅크에 반영했습니다. 역량 ${(d.codes as string[])?.length ?? 0}개, 문항 ${d.questionCount ?? 0}개 — /admin/content 에서 확인하세요.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "운영 뱅크 반영 실패");
    } finally {
      setMaterializing(false);
    }
  };

  const headerActions = (
    <>
      <a
        href={`/demo/${encodeURIComponent(workspaceSlug)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
      >
        데모 미리보기 · 면접 <ExternalLink className="h-3 w-3" />
      </a>
      {presenterUrl ? (
        <a
          href={presenterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20"
          title="고객 시연용 — 로그인 없이 면접 시작"
        >
          시연 URL (로그인 불필요) <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
      <button
        type="button"
        disabled={materializing || competencyCount === 0}
        onClick={() => void materializeToProduction()}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 disabled:opacity-50"
        title="데모 키트를 운영 CMS(역량·문항·평가)에 동기화"
      >
        {materializing ? "운영 뱅크 반영 중…" : "운영 뱅크에 반영"}
      </button>
    </>
  );

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      ) : null}
      <KitStudioEditor<DemoQuestionDto>
        config={config}
        resetKey={workspaceId}
        initialCompetencies={initialCompetencies}
        initialQuestions={initialQuestions}
        headerActions={headerActions}
        onRefreshData={onRefreshData}
        onKitStateChange={({ competencyCount: count }) => setCompetencyCount(count)}
      />
    </div>
  );
}

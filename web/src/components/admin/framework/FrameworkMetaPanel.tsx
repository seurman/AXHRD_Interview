"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { BankCompetencyRow } from "@/lib/competency/content-bank-data";
import type { CompetencyLifecycleStatus } from "@prisma/client";
import { LIFECYCLE_LABEL } from "@/lib/repository/types";

type Props = {
  competency: BankCompetencyRow;
  onUpdated: (patch: Partial<BankCompetencyRow>) => void;
};

export function FrameworkMetaPanel({ competency, onUpdated }: Props) {
  const [nameKo, setNameKo] = useState(competency.nameKo);
  const [description, setDescription] = useState(competency.description ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNameKo(competency.nameKo);
    setDescription(competency.description ?? "");
  }, [competency.id, competency.nameKo, competency.description]);

  async function saveMeta() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/competencies/${competency.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKo: nameKo.trim(),
          description: description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      onUpdated({
        nameKo: data.competency.nameKo,
        description: data.competency.description,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function setLifecycle(lifecycleStatus: CompetencyLifecycleStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/repository/competencies/${competency.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "상태 변경 실패");
      onUpdated({
        lifecycleStatus: data.competency.lifecycleStatus,
        isActive: data.competency.isActive,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "상태 변경 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-luxe space-y-5 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">역량 메타데이터</p>
        <h3 className="mt-1 text-xl font-bold text-foreground">{competency.nameKo}</h3>
        <p className="mt-1 font-mono text-xs text-muted">{competency.code}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "출처", value: competency.source },
          { label: "역량군", value: competency.clusterNameKo ?? "—" },
          { label: "문항 수", value: String(competency.questionCount) },
          {
            label: "라이프사이클",
            value: LIFECYCLE_LABEL[competency.lifecycleStatus],
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-card-border bg-background/50 px-4 py-3">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="font-medium text-foreground">한글명</span>
          <input
            className="input-luxe mt-1 w-full"
            value={nameKo}
            onChange={(e) => setNameKo(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">정의 · 설명</span>
          <textarea
            className="input-luxe mt-1 min-h-[100px] w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveMeta()}
          className="btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          메타데이터 저장
        </button>
      </div>

      <div className="rounded-xl border border-card-border bg-background/40 p-4">
        <p className="text-sm font-semibold text-foreground">라이프사이클</p>
        <p className="mt-1 text-xs text-muted">
          ACTIVE만 면접 풀에 노출됩니다. isActive와 lifecycleStatus는 동기화됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy || competency.lifecycleStatus === status}
              onClick={() => void setLifecycle(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-100 ${
                competency.lifecycleStatus === status
                  ? "bg-accent text-white"
                  : "border border-card-border text-muted hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {LIFECYCLE_LABEL[status]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

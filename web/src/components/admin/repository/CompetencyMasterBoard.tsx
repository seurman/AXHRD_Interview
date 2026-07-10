"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { LIFECYCLE_LABEL } from "@/lib/repository/types";

type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "ARCHIVED";

type Props = {
  onSelect?: (competency: RepositoryCompetencyRow) => void;
  selectedId?: string | null;
};

function StatusToggle({
  status,
  disabled,
  onChange,
}: {
  status: RepositoryCompetencyRow["lifecycleStatus"];
  disabled?: boolean;
  onChange: (next: "ACTIVE" | "DRAFT" | "ARCHIVED") => void;
}) {
  const isActive = status === "ACTIVE";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      disabled={disabled}
      onClick={() => onChange(isActive ? "DRAFT" : "ACTIVE")}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${
        isActive ? "bg-emerald-500" : status === "ARCHIVED" ? "bg-zinc-400" : "bg-amber-400"
      }`}
      title={isActive ? "활성화 — 클릭 시 개발중으로" : "비활성 — 클릭 시 활성화"}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function CompetencyMasterBoard({ onSelect, selectedId }: Props) {
  const [items, setItems] = useState<RepositoryCompetencyRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", nameKo: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === "ALL" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/admin/repository/competencies${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setItems(data.competencies ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { key: StatusFilter; label: string }[] = useMemo(
    () => [
      { key: "ALL", label: "전체" },
      { key: "ACTIVE", label: "🟢 활성화" },
      { key: "DRAFT", label: "🟡 개발중" },
    ],
    [],
  );

  async function patchStatus(id: string, lifecycleStatus: "ACTIVE" | "DRAFT" | "ARCHIVED") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/repository/competencies/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "상태 변경 실패");
      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                lifecycleStatus: data.competency.lifecycleStatus,
                isActive: data.competency.isActive,
              }
            : c,
        ),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "상태 변경 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function createCompetency() {
    setBusyId("create");
    try {
      const res = await fetch("/api/admin/repository/competencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setForm({ code: "", nameKo: "", description: "" });
      setShowCreate(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCompetency(id: string, code: string) {
    if (!confirm(`${code} 역량을 삭제할까요? 연결된 질문이 있으면 삭제되지 않습니다.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/repository/competencies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제 실패");
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">역량 리포지토리</h2>
          <p className="mt-0.5 text-sm text-muted">
            플랫폼 마스터 역량 — 상태별 필터 · 즉시 활성화 토글
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/40"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            역량 추가
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2 sm:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="border-b border-border bg-muted/20 px-4 py-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              placeholder="코드 (예: COMP_COMM)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="역량명"
              value={form.nameKo}
              onChange={(e) => setForm((f) => ({ ...f, nameKo: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="설명 (선택)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busyId === "create"}
              onClick={() => void createCompetency()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {busyId === "create" ? "저장 중…" : "저장 (DRAFT)"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          불러오는 중…
        </div>
      ) : error ? (
        <p className="px-6 py-8 text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="px-6 py-8 text-sm text-muted">표시할 역량이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium sm:px-6">코드</th>
                <th className="px-4 py-3 font-medium">역량명</th>
                <th className="px-4 py-3 font-medium">카테고리</th>
                <th className="px-4 py-3 font-medium">질문</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const isDraft = row.lifecycleStatus === "DRAFT";
                const isSelected = selectedId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelect?.(row)}
                    className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/20 ${
                      isDraft ? "opacity-60" : ""
                    } ${isSelected ? "bg-accent/10" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs sm:px-6">{row.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.nameKo}</p>
                      {row.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{row.category}</td>
                    <td className="px-4 py-3 tabular-nums">{row.questionCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusToggle
                          status={row.lifecycleStatus}
                          disabled={busyId === row.id}
                          onChange={(next) => void patchStatus(row.id, next)}
                        />
                        <span className="text-xs text-muted">
                          {LIFECYCLE_LABEL[row.lifecycleStatus]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {row.lifecycleStatus !== "ARCHIVED" && (
                          <button
                            type="button"
                            title="숨김"
                            disabled={busyId === row.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void patchStatus(row.id, "ARCHIVED");
                            }}
                            className="rounded p-1.5 text-muted hover:bg-muted/40 hover:text-foreground"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        {row.lifecycleStatus === "ARCHIVED" && (
                          <button
                            type="button"
                            title="복원"
                            disabled={busyId === row.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void patchStatus(row.id, "DRAFT");
                            }}
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="삭제"
                          disabled={busyId === row.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteCompetency(row.id, row.code);
                          }}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

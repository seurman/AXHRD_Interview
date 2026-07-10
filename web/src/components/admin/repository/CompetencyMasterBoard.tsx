"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import type { RepositoryCompetencyRow } from "@/lib/repository/types";
import { LIFECYCLE_LABEL } from "@/lib/repository/types";

type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "ARCHIVED";

type Props = {
  onSelect?: (competency: RepositoryCompetencyRow) => void;
  selectedId?: string | null;
  refreshKey?: number;
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
      onClick={(e) => {
        e.stopPropagation();
        onChange(isActive ? "DRAFT" : "ACTIVE");
      }}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        isActive ? "bg-emerald-500" : status === "ARCHIVED" ? "bg-zinc-400" : "bg-amber-400"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          isActive ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function CompetencyMasterBoard({ onSelect, selectedId, refreshKey }: Props) {
  const [items, setItems] = useState<RepositoryCompetencyRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [query, setQuery] = useState("");
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
  }, [load, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.nameKo.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [items, query]);

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

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-foreground">역량 목록</h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg p-1.5 text-muted hover:bg-muted/40"
              title="새로고침"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-lg p-1.5 text-accent hover:bg-accent/10"
              title="역량 추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="코드·역량명 검색"
            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(
            [
              ["ALL", "전체"],
              ["ACTIVE", "활성"],
              ["DRAFT", "개발"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                filter === key ? "bg-accent/15 text-accent" : "text-muted hover:bg-muted/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className="space-y-2 border-b border-border bg-muted/15 p-4">
          <input
            placeholder="코드"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="역량명"
            value={form.nameKo}
            onChange={(e) => setForm((f) => ({ ...f, nameKo: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busyId === "create"}
            onClick={() => void createCompetency()}
            className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            DRAFT로 저장
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted">역량이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border/60 p-2">
            {filtered.map((row) => {
              const isDraft = row.lifecycleStatus === "DRAFT";
              const selected = selectedId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(row)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      selected ? "bg-accent/10 ring-1 ring-accent/30" : "hover:bg-muted/20"
                    } ${isDraft ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{row.nameKo}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted">{row.code}</p>
                      </div>
                      <StatusToggle
                        status={row.lifecycleStatus}
                        disabled={busyId === row.id}
                        onChange={(next) => void patchStatus(row.id, next)}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span>{row.category}</span>
                      <span>·</span>
                      <span>질문 {row.questionCount}</span>
                      <span>·</span>
                      <span>{LIFECYCLE_LABEL[row.lifecycleStatus]}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        <Link
          href="/admin/content"
          className="block text-center text-xs text-accent hover:underline"
        >
          문항 뱅크 CMS →
        </Link>
      </div>
    </aside>
  );
}

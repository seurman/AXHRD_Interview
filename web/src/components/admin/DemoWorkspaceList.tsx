"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  _count: { competencies: number; questions: number };
};

export function DemoWorkspaceList({ initialWorkspaces }: { initialWorkspaces: WorkspaceRow[] }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cloneFromProduction, setCloneFromProduction] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("데모 이름을 입력해 주세요.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/demo/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, cloneFromProduction }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof d.error === "string" ? d.error : `생성 실패 (${res.status})`,
        );
      }
      if (typeof d.warning === "string" && d.warning) {
        alert(d.warning);
      }
      const workspace = d.workspace as { id: string };
      router.push(`/admin/demo/${workspace.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (ws: WorkspaceRow) => {
    if (!confirm(`「${ws.name}」 데모를 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/demo/workspaces/${ws.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("삭제 실패");
      return;
    }
    setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setError(null);
          }}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          새 데모 만들기
        </button>
      ) : (
        <form
          onSubmit={create}
          className="space-y-3 rounded-xl border border-card-border bg-card p-4"
        >
          <label className="block text-sm font-medium text-foreground">
            데모 이름
            <input
              type="text"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="예: AX대학 상담용"
              autoFocus
              disabled={creating}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={cloneFromProduction}
              onChange={(ev) => setCloneFromProduction(ev.target.checked)}
              disabled={creating}
              className="mt-0.5"
            />
            <span>운영 문항 뱅크(NCS 6역량)를 복사해 시작</span>
          </label>
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={creating}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              {creating ? "생성 중… (문항 복사 포함, 최대 1분)" : "만들기"}
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => {
                setShowForm(false);
                setName("");
                setError(null);
              }}
              className="btn-secondary px-4 py-2 text-sm"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {workspaces.length === 0 ? (
        <p className="text-sm text-muted">고객사 미팅용 데모를 만들어 보세요.</p>
      ) : (
        <ul className="divide-y divide-card-border rounded-xl border border-card-border bg-card">
          {workspaces.map((ws) => (
            <li key={ws.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={`/admin/demo/${ws.id}`} className="font-medium text-foreground hover:underline">
                  {ws.name}
                </Link>
                <p className="text-xs text-muted">
                  /demo/{ws.slug} · 역량 {ws._count.competencies} · 문항 {ws._count.questions}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/demo/${ws.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  미리보기
                </a>
                <button type="button" onClick={() => remove(ws)} className="text-xs text-muted hover:text-red-500">
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

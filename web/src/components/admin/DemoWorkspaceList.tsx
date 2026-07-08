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

  const create = async () => {
    const name = prompt("데모 이름 (예: AX대학 상담용)")?.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/demo/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cloneFromProduction: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "생성 실패");
      }
      const { workspace } = await res.json();
      router.push(`/admin/demo/${workspace.id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "생성 실패");
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
      <button
        type="button"
        onClick={create}
        disabled={creating}
        className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        {creating ? "생성 중…" : "새 데모 만들기"}
      </button>

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

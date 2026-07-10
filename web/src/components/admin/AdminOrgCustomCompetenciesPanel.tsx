"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpCircle } from "lucide-react";

type OrgComp = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  rubricByLevel: unknown;
  forkedFromId: string | null;
  forkedFrom: { code: string; nameKo: string; rubricByLevel: unknown } | null;
  questionCount: number;
  organizationName: string | null;
};

type Group = { organizationName: string; competencies: OrgComp[] };

export function AdminOrgCustomCompetenciesPanel() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<OrgComp | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content/competencies?scope=ORG");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "불러오기 실패");
        return;
      }
      setGroups(json.groups ?? []);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPromote(mode: "merge_into_base" | "promote_as_new_base") {
    if (!promoteId) return;
    setMessage(null);
    const res = await fetch(`/api/admin/content/competencies/${promoteId}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "승격 실패");
      return;
    }
    setMessage(`승격 완료 (${mode}) — ${json.code}`);
    setPromoteId(null);
    setPromoteTarget(null);
    void load();
  }

  if (loading) return <p className="text-sm text-muted">기관 커스텀 역량 불러오는 중…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        기관이 작성·포크한 역량입니다. 승격 시 플랫폼 기본 뱅크에 반영됩니다.
      </p>

      {groups.length === 0 ? (
        <p className="text-sm text-muted">등록된 기관 커스텀 역량이 없습니다.</p>
      ) : (
        groups.map((g) => (
          <section key={g.organizationName} className="space-y-2">
            <h3 className="text-sm font-semibold">{g.organizationName}</h3>
            <ul className="space-y-2">
              {g.competencies.map((c) => (
                <li key={c.id} className="card-luxe flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.nameKo}</p>
                    <p className="text-xs text-muted">
                      {c.code}
                      {c.forkedFrom ? ` · 포크: ${c.forkedFrom.code}` : ""} · {c.questionCount}문항
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-1 text-xs"
                    onClick={() => {
                      setPromoteId(c.id);
                      setPromoteTarget(c);
                    }}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    기본으로 승격
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {promoteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-card-border bg-card p-5 shadow-luxe">
            <h3 className="font-semibold">승격: {promoteTarget.nameKo}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted">기본 (포크 원본)</p>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-background p-3 text-[11px]">
                  {JSON.stringify(promoteTarget.forkedFrom?.rubricByLevel ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">기관 버전</p>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-background p-3 text-[11px]">
                  {JSON.stringify(promoteTarget.rubricByLevel ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={!promoteTarget.forkedFromId}
                title={!promoteTarget.forkedFromId ? "포크가 아니면 비활성" : undefined}
                onClick={() => void runPromote("merge_into_base")}
              >
                기존 기본에 병합
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => void runPromote("promote_as_new_base")}
              >
                신규 기본으로 복제
              </button>
              <button
                type="button"
                className="text-sm text-muted"
                onClick={() => {
                  setPromoteId(null);
                  setPromoteTarget(null);
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="text-center text-xs text-muted">{message}</p>}
    </div>
  );
}

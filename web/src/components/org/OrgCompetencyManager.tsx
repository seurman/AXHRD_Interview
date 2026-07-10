"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Copy, Pencil, ChevronRight } from "lucide-react";

type PlatformComp = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  rubricByLevel: Record<string, string[]>;
  ownerScope: "PLATFORM";
  questionCount: number;
};

type OrgComp = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  rubricByLevel: unknown;
  ownerScope: "ORG";
  forkedFromId: string | null;
  forkedFrom: { code: string; nameKo: string; rubricByLevel: unknown } | null;
  questionCount: number;
};

type Payload = {
  organizationName: string;
  canWrite: boolean;
  platformCompetencies: PlatformComp[];
  orgCompetencies: OrgComp[];
};

type Props = {
  organizationId?: string;
};

function apiBase(organizationId?: string) {
  const base = "/api/org/content/competencies";
  return organizationId ? `${base}?organizationId=${encodeURIComponent(organizationId)}` : base;
}

export function OrgCompetencyManager({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nameKo: "", definition: "", rubricJson: "{}" });
  const [forkFromId, setForkFromId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase(organizationId));
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "불러오기 실패");
        return;
      }
      setData(json as Payload);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startFork(platform: PlatformComp) {
    if (!data?.canWrite) return;
    setForkFromId(platform.id);
    setEditingId("new");
    setForm({
      nameKo: `${platform.nameKo} (맞춤)`,
      definition: platform.description ?? "",
      rubricJson: JSON.stringify(platform.rubricByLevel ?? {}, null, 2),
    });
  }

  function startEdit(comp: OrgComp) {
    if (!data?.canWrite) return;
    setForkFromId(null);
    setEditingId(comp.id);
    setForm({
      nameKo: comp.nameKo,
      definition: comp.description ?? "",
      rubricJson: JSON.stringify(comp.rubricByLevel ?? {}, null, 2),
    });
  }

  async function save() {
    if (!data?.canWrite) return;
    let rubricByLevel: Record<string, string[]> = {};
    try {
      rubricByLevel = JSON.parse(form.rubricJson) as Record<string, string[]>;
    } catch {
      setMessage("rubricByLevel JSON 형식이 올바르지 않습니다.");
      return;
    }

    const body = {
      nameKo: form.nameKo,
      definition: form.definition,
      rubricByLevel,
      ...(forkFromId ? { forkedFromId: forkFromId } : {}),
    };

    const isNew = editingId === "new";
    const url = isNew
      ? apiBase(organizationId)
      : `${apiBase(organizationId).replace(/\?.*$/, "")}/${editingId}${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""}`;

    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "저장 실패");
      return;
    }
    setMessage(isNew ? "역량이 생성되었습니다." : "저장되었습니다.");
    setEditingId(null);
    setForkFromId(null);
    void load();
  }

  if (loading) {
    return <p className="animate-pulse text-sm text-muted">역량 목록 불러오는 중…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!data) return null;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">플랫폼 기본 역량</h2>
        <p className="text-xs text-muted">잠금 — 복제해서 기관 맞춤 역량을 만드세요.</p>
        <ul className="space-y-2">
          {data.platformCompetencies.map((c) => (
            <li
              key={c.id}
              className="card-luxe flex items-center gap-3 p-4"
            >
              <Lock className="h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.nameKo}</p>
                <p className="text-xs text-muted">
                  {c.code} · {c.questionCount}문항
                </p>
              </div>
              {data.canWrite && (
                <button
                  type="button"
                  onClick={() => startFork(c)}
                  className="btn-secondary flex items-center gap-1 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  복제
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">우리 기관 커스텀 역량</h2>
        {data.orgCompetencies.length === 0 ? (
          <p className="text-sm text-muted">아직 커스텀 역량이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {data.orgCompetencies.map((c) => (
              <li key={c.id} className="card-luxe flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.nameKo}</p>
                  <p className="text-xs text-muted">
                    {c.code}
                    {c.forkedFrom ? ` · 포크: ${c.forkedFrom.nameKo}` : ""} · {c.questionCount}문항
                  </p>
                </div>
                {data.canWrite ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="btn-secondary flex items-center gap-1 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      편집
                    </button>
                    <Link
                      href={`/org/settings/competencies/${c.id}/questions`}
                      className="flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      문항
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                ) : (
                  <span className="text-xs text-muted">조회만</span>
                )}
                <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
                  승격 요청 → 수퍼어드민
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingId && data.canWrite && (
        <div className="card-luxe space-y-3 p-5">
          <h3 className="font-semibold">{editingId === "new" ? "새 역량" : "역량 편집"}</h3>
          <label className="block text-xs">
            <span className="text-muted">이름</span>
            <input
              className="input mt-1 w-full"
              value={form.nameKo}
              onChange={(e) => setForm((f) => ({ ...f, nameKo: e.target.value }))}
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted">정의</span>
            <textarea
              className="input mt-1 w-full min-h-[80px]"
              value={form.definition}
              onChange={(e) => setForm((f) => ({ ...f, definition: e.target.value }))}
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted">rubricByLevel (JSON)</span>
            <textarea
              className="input mt-1 w-full min-h-[120px] font-mono text-[11px]"
              value={form.rubricJson}
              onChange={(e) => setForm((f) => ({ ...f, rubricJson: e.target.value }))}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" onClick={() => void save()}>
              저장
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                setEditingId(null);
                setForkFromId(null);
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-center text-xs text-muted">{message}</p>}
    </div>
  );
}

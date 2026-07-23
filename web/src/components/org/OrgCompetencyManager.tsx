"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Copy, Pencil, ChevronRight, Plus, X } from "lucide-react";

const RUBRIC_LEVELS = ["1", "2", "3", "4", "5"] as const;

function emptyRubric(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const level of RUBRIC_LEVELS) result[level] = [];
  return result;
}

/** 플랫폼/기관 rubricByLevel(JSON, 임의 형태 가능)을 레벨 1~5 문자열 배열 편집기 상태로 정규화 */
function normalizeRubric(raw: unknown): Record<string, string[]> {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = emptyRubric();
  for (const level of RUBRIC_LEVELS) {
    const items = obj[level];
    if (Array.isArray(items)) {
      result[level] = items.filter((v): v is string => typeof v === "string");
    }
  }
  return result;
}

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
  const [form, setForm] = useState({ nameKo: "", definition: "", rubric: emptyRubric() });
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
      rubric: normalizeRubric(platform.rubricByLevel),
    });
  }

  function startEdit(comp: OrgComp) {
    if (!data?.canWrite) return;
    setForkFromId(null);
    setEditingId(comp.id);
    setForm({
      nameKo: comp.nameKo,
      definition: comp.description ?? "",
      rubric: normalizeRubric(comp.rubricByLevel),
    });
  }

  function updateRubricItem(level: string, index: number, value: string) {
    setForm((f) => {
      const items = [...(f.rubric[level] ?? [])];
      items[index] = value;
      return { ...f, rubric: { ...f.rubric, [level]: items } };
    });
  }

  function addRubricItem(level: string) {
    setForm((f) => ({
      ...f,
      rubric: { ...f.rubric, [level]: [...(f.rubric[level] ?? []), ""] },
    }));
  }

  function removeRubricItem(level: string, index: number) {
    setForm((f) => {
      const items = [...(f.rubric[level] ?? [])];
      items.splice(index, 1);
      return { ...f, rubric: { ...f.rubric, [level]: items } };
    });
  }

  async function save() {
    if (!data?.canWrite) return;
    const rubricByLevel: Record<string, string[]> = {};
    for (const level of RUBRIC_LEVELS) {
      const items = (form.rubric[level] ?? []).map((s) => s.trim()).filter(Boolean);
      if (items.length > 0) rubricByLevel[level] = items;
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
          <div className="space-y-2">
            <span className="text-xs text-muted">레벨별 행동지표</span>
            <div className="space-y-2">
              {RUBRIC_LEVELS.map((level) => (
                <div key={level} className="rounded-lg border border-card-border p-3">
                  <p className="text-xs font-semibold text-foreground">레벨 {level}</p>
                  <div className="mt-2 space-y-2">
                    {form.rubric[level].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className="input flex-1 text-xs"
                          value={item}
                          placeholder="행동지표 문장"
                          onChange={(e) => updateRubricItem(level, i, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeRubricItem(level, i)}
                          className="shrink-0 text-muted hover:text-danger"
                          aria-label="항목 삭제"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRubricItem(level)}
                      className="flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      항목 추가
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

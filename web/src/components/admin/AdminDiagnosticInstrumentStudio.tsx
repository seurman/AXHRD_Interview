"use client";

import { useCallback, useEffect, useState } from "react";

type ItemRow = {
  id: string;
  itemCode: string;
  textKo: string;
  scaleType: string;
  hasImportanceAxis: boolean;
  isReversed: boolean;
  isDemographic: boolean;
  order: number;
};

type SubscaleRow = {
  id: string;
  code: string;
  nameKo: string;
  items: ItemRow[];
};

type SectionRow = {
  id: string;
  code: string;
  nameKo: string;
  directItems: ItemRow[];
  subscales: SubscaleRow[];
};

type InstrumentDetail = {
  id: string;
  code: string;
  nameKo: string;
  version: string;
  estimatedMinutes: number | null;
  minGroupSize: number;
  sections: SectionRow[];
};

type Props = {
  instrumentId: string;
  onSync: () => void;
  syncing: boolean;
};

export function AdminDiagnosticInstrumentStudio({ instrumentId, onSync, syncing }: Props) {
  const [instrument, setInstrument] = useState<InstrumentDetail | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  /** 모바일 3단 → 단계형: sections | items | editor */
  const [mobilePane, setMobilePane] = useState<"sections" | "items" | "editor">("sections");
  const [editText, setEditText] = useState("");
  const [editReversed, setEditReversed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(`/api/admin/diagnostic/instruments/${instrumentId}`);
    const json = await res.json();
    if (!res.ok) {
      setLoadError(json.error ?? "불러오기 실패");
      return;
    }
    setInstrument(json.instrument);
    setSelectedSection((prev) => prev ?? json.instrument.sections[0]?.code ?? null);
  }, [instrumentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const section = instrument?.sections.find((s) => s.code === selectedSection) ?? null;

  const allItems: Array<ItemRow & { subscaleCode?: string }> = section
    ? [
        ...section.directItems.map((i) => ({ ...i })),
        ...section.subscales.flatMap((sub) =>
          sub.items.map((i) => ({ ...i, subscaleCode: sub.code })),
        ),
      ].sort((a, b) => a.order - b.order)
    : [];

  const selectedItem = allItems.find((i) => i.id === selectedItemId) ?? null;

  useEffect(() => {
    if (selectedItem) {
      setEditText(selectedItem.textKo);
      setEditReversed(selectedItem.isReversed);
    }
  }, [selectedItem]);

  async function saveItem() {
    if (!selectedItemId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnostic/items/${selectedItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textKo: editText, isReversed: editReversed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "저장 실패");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-rose-600">{loadError}</p>;
  }

  if (!instrument) {
    return <p className="text-sm text-muted">문항뱅크 불러오는 중…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{instrument.nameKo}</p>
          <p className="text-xs text-muted">
            {instrument.code} · {instrument.version} · 약 {instrument.estimatedMinutes}분 · 최소 N=
            {instrument.minGroupSize}
          </p>
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={onSync}
          className="btn-secondary min-h-10 px-3 py-2 text-xs disabled:opacity-50 sm:py-1.5"
        >
          {syncing ? "동기화 중…" : "원본 동기화"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[12rem_1fr_20rem]">
        <ul
          className={`space-y-1 rounded-xl border border-card-border p-2 text-sm ${
            mobilePane === "sections" ? "" : "hidden lg:block"
          }`}
        >
          {instrument.sections.map((sec) => {
            const count =
              sec.directItems.length +
              sec.subscales.reduce((n, sub) => n + sub.items.length, 0);
            return (
              <li key={sec.code}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection(sec.code);
                    setSelectedItemId(null);
                    setMobilePane("items");
                  }}
                  className={`min-h-11 w-full rounded-lg px-2 py-2 text-left ${
                    selectedSection === sec.code ? "bg-accent/15 font-medium" : "hover:bg-background/60"
                  }`}
                >
                  <span className="text-foreground">{sec.code}</span>
                  <span className="ml-1 text-xs text-muted">({count})</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div
          className={`max-h-[min(28rem,60dvh)] overflow-y-auto overscroll-contain rounded-xl border border-card-border lg:max-h-[28rem] ${
            mobilePane === "items" ? "" : "hidden lg:block"
          }`}
        >
          {section ? (
            <>
              <button
                type="button"
                onClick={() => setMobilePane("sections")}
                className="min-h-10 w-full border-b border-card-border px-3 py-2 text-left text-sm font-medium text-accent hover:underline lg:hidden"
              >
                ← 섹션 목록
              </button>
              <ul className="divide-y divide-card-border text-sm">
                {allItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setMobilePane("editor");
                      }}
                      className={`flex min-h-14 w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-background/60 ${
                        selectedItemId === item.id ? "bg-accent/10" : ""
                      }`}
                    >
                      <span className="text-xs font-mono text-muted">
                        {item.itemCode}
                        {item.subscaleCode ? ` · ${item.subscaleCode}` : ""}
                        {item.isReversed ? " ★" : ""}
                      </span>
                      <span className="line-clamp-2 text-foreground">{item.textKo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="p-4 text-sm text-muted">섹션을 선택하세요.</p>
          )}
        </div>

        <div
          className={`rounded-xl border border-card-border p-3 ${
            mobilePane === "editor" ? "" : "hidden lg:block"
          }`}
        >
          {selectedItem ? (
            <div className="space-y-3 text-sm">
              <button
                type="button"
                onClick={() => setMobilePane("items")}
                className="min-h-10 text-left text-sm font-medium text-accent hover:underline lg:hidden"
              >
                ← 문항 목록
              </button>
              <p className="font-mono text-xs text-muted">{selectedItem.itemCode}</p>
              <label className="block">
                <span className="text-xs text-muted">문항 텍스트</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-base sm:text-sm"
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
              </label>
              {!selectedItem.isDemographic && (
                <label className="flex min-h-10 items-center gap-2 text-sm sm:text-xs">
                  <input
                    type="checkbox"
                    checked={editReversed}
                    onChange={(e) => setEditReversed(e.target.checked)}
                  />
                  역문항 (★)
                </label>
              )}
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveItem()}
                className="btn-primary min-h-11 w-full py-2 text-sm disabled:opacity-50 sm:text-xs"
              >
                {saving ? "저장 중…" : "문항 저장"}
              </button>
              <p className="text-xs text-muted">
                정본: <code>docs/arc-index/source/*.md</code> — DM이 5개만 보이면 우측 상단
                「원본 동기화」를 눌러 DM06~12(성별·고용형태·학력·관리자·근무형태·지역·장애)를
                반영하세요.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">문항을 선택하면 편집할 수 있습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

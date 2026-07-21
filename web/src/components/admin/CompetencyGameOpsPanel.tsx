"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { GAME_TYPE_LABEL_KO, type GameType } from "@/lib/competency-game/types";

type GameTypeRow = { type: GameType; labelKo: string; enabled: boolean };
type LevelRow = {
  id: string;
  unitId: string;
  unitTitleKo: string;
  titleKo: string;
  gameType: string;
  difficulty: number;
  itemCount: number;
  xpReward: number;
};
type CatalogCourse = {
  competency: string;
  titleKo: string;
  levels: LevelRow[];
};

export function CompetencyGameOpsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameTypes, setGameTypes] = useState<GameTypeRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());
  const [disabledLevels, setDisabledLevels] = useState<Set<string>>(new Set());
  const [activeComp, setActiveComp] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/competency-game/config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setGameTypes(data.gameTypes ?? []);
      setCatalog(data.catalog ?? []);
      setDisabledTypes(new Set(data.config?.disabledGameTypes ?? []));
      setDisabledLevels(new Set(data.config?.disabledLevelIds ?? []));
      setUpdatedAt(data.config?.updatedAt ?? null);
      setActiveComp((prev) => prev ?? data.catalog?.[0]?.competency ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeCourse = useMemo(
    () => catalog.find((c) => c.competency === activeComp) ?? null,
    [catalog, activeComp],
  );

  function toggleType(type: string) {
    setDisabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleLevel(id: string) {
    setDisabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setCourseAll(enabled: boolean) {
    if (!activeCourse) return;
    setDisabledLevels((prev) => {
      const next = new Set(prev);
      for (const lv of activeCourse.levels) {
        if (enabled) next.delete(lv.id);
        else next.add(lv.id);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/competency-game/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disabledGameTypes: [...disabledTypes],
          disabledLevelIds: [...disabledLevels],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      setGameTypes(data.gameTypes ?? gameTypes);
      setDisabledTypes(new Set(data.config?.disabledGameTypes ?? []));
      setDisabledLevels(new Set(data.config?.disabledLevelIds ?? []));
      setUpdatedAt(data.config?.updatedAt ?? null);
      toast.success("역량게임 운영 설정을 저장했습니다. 플레이어 패스에 즉시 반영됩니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> 설정 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-600">{error}</p>
        <button type="button" className="btn-secondary text-sm" onClick={() => void load()}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Competency Game Ops
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground">레벨·게임 타입 운영</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            의도 독해·베스트/워스트를 포함한 전 레벨이 기본 활성입니다. 타입 또는 개별 레벨을
            끄면 플레이어 패스에서 숨겨집니다.
          </p>
          {updatedAt ? (
            <p className="mt-1 text-xs text-muted">
              마지막 저장: {new Date(updatedAt).toLocaleString("ko-KR")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-primary inline-flex min-h-11 items-center gap-1.5 text-sm"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장 · 운영 반영
        </button>
      </div>

      <section className="card-luxe space-y-3 p-4">
        <h3 className="text-sm font-bold text-foreground">1) 게임 타입 킬스위치</h3>
        <p className="text-xs text-muted">
          타입을 끄면 해당 타입의 모든 레벨이 숨겨집니다. (보스 `mixed`는 레벨 단위로만 제어)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {gameTypes.map((gt) => {
            const on = !disabledTypes.has(gt.type);
            return (
              <button
                key={gt.type}
                type="button"
                onClick={() => toggleType(gt.type)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  on
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-card-border bg-muted/10 opacity-70"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">
                  {gt.labelKo}
                  <span className="ml-2 text-[11px] font-normal text-muted">{gt.type}</span>
                </p>
                <p className="mt-1 text-xs font-semibold">
                  {on ? (
                    <span className="text-emerald-700 dark:text-emerald-300">활성 · 패스에 표시</span>
                  ) : (
                    <span className="text-zinc-500">비활성 · 숨김</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-luxe space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">2) 레벨별 넣고 빼기</h3>
            <p className="text-xs text-muted">코스마다 레벨을 개별 on/off 합니다.</p>
          </div>
          {activeCourse ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary min-h-9 px-3 text-xs"
                onClick={() => setCourseAll(true)}
              >
                이 코스 전부 켜기
              </button>
              <button
                type="button"
                className="btn-secondary min-h-9 px-3 text-xs"
                onClick={() => setCourseAll(false)}
              >
                이 코스 전부 끄기
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {catalog.map((c) => (
            <button
              key={c.competency}
              type="button"
              onClick={() => setActiveComp(c.competency)}
              className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${
                activeComp === c.competency
                  ? "border-accent/50 bg-accent/15 text-foreground"
                  : "border-card-border text-muted"
              }`}
            >
              {c.titleKo}
            </button>
          ))}
        </div>

        {activeCourse ? (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border">
            {activeCourse.levels.map((lv, i) => {
              const typeOff =
                lv.gameType !== "mixed" && disabledTypes.has(lv.gameType);
              const levelOff = disabledLevels.has(lv.id);
              const effectivelyOn = !typeOff && !levelOff;
              return (
                <li
                  key={lv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {i + 1}. {lv.titleKo}
                    </p>
                    <p className="text-[11px] text-muted">
                      {lv.unitTitleKo} ·{" "}
                      {GAME_TYPE_LABEL_KO[lv.gameType as GameType] ?? lv.gameType} · 문항{" "}
                      {lv.itemCount} · +{lv.xpReward} XP
                    </p>
                    <p className="font-mono text-[10px] text-muted">{lv.id}</p>
                    {typeOff ? (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        상위 타입 스위치로 숨겨진 상태
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleLevel(lv.id)}
                    className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${
                      effectivelyOn
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-500/15 text-zinc-600"
                    }`}
                  >
                    {levelOff ? "레벨 끔" : "레벨 켬"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

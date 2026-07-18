"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Copy, ExternalLink, Plus } from "lucide-react";

type TeamLink = {
  id: string;
  name: string;
  department: string | null;
  slug: string;
  link: string;
};

type HierarchyNode = {
  id: string;
  name: string;
  level: "DIVISION" | "UNIT" | "TEAM";
  parentId: string | null;
};

type SectionMeta = { code: string; nameKo: string };

type Wave = {
  id: string;
  slug: string;
  waveNumber: number;
  label: string | null;
  status: string;
  statusLabel?: string;
  responseCount: number;
  sectionBadge?: string;
  orgWideLink: string;
  opensAt: string | null;
  closesAt: string | null;
  teams: TeamLink[];
  hierarchy?: HierarchyNode[];
};

/** id로부터 사업본부 › 사업부 › 팀 전체 경로 이름을 조립한다. 하이어라키가 없으면 팀 이름만 반환. */
function nodePath(nodeId: string, hierarchy: HierarchyNode[] | undefined): string {
  if (!hierarchy?.length) return "";
  const byId = new Map(hierarchy.map((n) => [n.id, n]));
  const path: string[] = [];
  let current = byId.get(nodeId);
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path.join(" › ");
}

function statusTone(status: string): string {
  const s = status.toUpperCase();
  if (s.includes("OPEN") || s.includes("ACTIVE") || s.includes("진행")) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (s.includes("CLOSE") || s.includes("END") || s.includes("마감") || s.includes("완료")) {
    return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300";
  }
  if (s.includes("DRAFT") || s.includes("준비") || s.includes("SCHEDULE")) {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  }
  return "bg-card text-muted";
}

function CopyLinkButton({
  value,
  label = "복사",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-card-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-accent/40 hover:text-accent"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "복사됨" : label}
    </button>
  );
}

export function DiagnosisOrgConsole() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [orgName, setOrgName] = useState("");
  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [enabledSections, setEnabledSections] = useState<string[]>(["OHI", "ORI", "OVI", "OAI"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [teamText, setTeamText] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [wavesRes, instRes] = await Promise.all([
      fetch("/api/org/diagnosis/waves"),
      fetch("/api/org/diagnosis/instruments"),
    ]);
    const wavesJson = await wavesRes.json();
    const instJson = await instRes.json();
    if (!wavesRes.ok) {
      setError(wavesJson.error ?? "불러오기 실패");
      setLoading(false);
      return;
    }
    setOrgName(wavesJson.organizationName);
    setWaves(wavesJson.waves);
    if (instRes.ok && instJson.instrument?.sections) {
      setSections(instJson.instrument.sections);
      setEnabledSections(
        instJson.instrument.defaultSectionCodes ??
          instJson.instrument.sections.map((s: SectionMeta) => s.code),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && waves.length === 0) setShowCreate(true);
  }, [loading, waves.length]);

  // 한 줄에 팀 하나. 콤마로 구분한 열 개수에 따라 하이어라키 깊이가 달라진다.
  const parseTeams = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cols = line.split(",").map((s) => s.trim()).filter(Boolean);
        if (cols.length >= 3) {
          const [divisionName, unitName, name] = cols;
          return { name, divisionName, unitName };
        }
        if (cols.length === 2) {
          const [unitName, name] = cols;
          return { name, unitName };
        }
        return { name: cols[0] ?? "" };
      })
      .filter((t) => t.name);

  const toggleSection = (code: string) => {
    setEnabledSections((prev) => {
      if (prev.includes(code)) {
        const next = prev.filter((c) => c !== code);
        return next.length > 0 ? next : prev;
      }
      return [...prev, code];
    });
  };

  const createWave = async () => {
    const teams = parseTeams(teamText);
    setCreating(true);
    setError(null);
    const res = await fetch("/api/org/diagnosis/waves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        teams,
        enabledSectionCodes: enabledSections,
        opensAt: opensAt || null,
        closesAt: closesAt || null,
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error ?? "생성 실패");
      return;
    }
    setLabel("");
    setTeamText("");
    setOpensAt("");
    setClosesAt("");
    setShowCreate(false);
    await load();
  };

  const exportCsv = (wave: Wave) => {
    const rows = [
      ["유형", "조직 경로", "응답 링크"],
      ["조직 전체", "—", wave.orgWideLink],
      ...wave.teams.map((t) => ["팀", nodePath(t.id, wave.hierarchy) || t.name, t.link]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arc-index-wave-${wave.waveNumber}-links.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-1 py-10 text-sm text-muted sm:px-0">
        조직진단을 불러오는 중…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-card-border bg-gradient-to-br from-[#0f1419] via-[#1a2330] to-[#0f1419] px-5 py-6 text-white sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(201,162,39,0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(100,116,139,0.35), transparent 50%)",
          }}
        />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">ARC Index</p>
          <h1 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">조직진단</h1>
          <p className="mt-1 text-sm text-white/70">{orgName}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">
            캠페인을 만들고 응답 링크를 배포하세요. 결과는 최소 표본 충족 후 리포트에서 확인할 수
            있습니다.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-[#0f1419]"
            >
              <Plus className="h-4 w-4" />
              {showCreate ? "작성 닫기" : "새 캠페인"}
            </button>
            {waves[0] ? (
              <Link
                href={`/org/diagnosis/waves/${waves[0].id}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
              >
                최근 리포트 보기
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <section className="rounded-2xl border border-card-border bg-card/50 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">새 진단 캠페인</h2>
          <p className="mt-1 text-sm text-muted">
            축·기간을 정한 뒤 생성하면 조직 전체 링크가 바로 발급됩니다.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-medium text-muted">
              캠페인 이름
              <input
                className="mt-1.5 w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-base text-foreground sm:text-sm"
                placeholder="예: 2026 상반기 조직진단"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>

            {sections.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted">활성 진단 축</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {sections.map((sec) => {
                    const on = enabledSections.includes(sec.code);
                    return (
                      <button
                        key={sec.code}
                        type="button"
                        onClick={() => toggleSection(sec.code)}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition ${
                          on
                            ? "border-accent/40 bg-accent/10 font-medium text-foreground"
                            : "border-card-border text-muted"
                        }`}
                        aria-pressed={on}
                      >
                        <span className="font-semibold">{sec.code}</span>
                        <span className="mt-0.5 block text-xs opacity-80">{sec.nameKo}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-muted">
                시작일 (선택)
                <input
                  type="date"
                  className="mt-1.5 w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-base sm:text-sm"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                종료일 (선택)
                <input
                  type="date"
                  className="mt-1.5 w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-base sm:text-sm"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </label>
            </div>

            <details className="rounded-xl border border-card-border bg-background/50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                조직 구조 · 팀별 링크 (선택)
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                비워두면 조직 전체 링크만 사용합니다. 한 줄에 팀 하나, 쉼표로 깊이를 정합니다.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                <li>
                  팀만: <code className="rounded bg-card px-1">콘텐츠팀</code>
                </li>
                <li>
                  사업부, 팀:{" "}
                  <code className="rounded bg-card px-1">마케팅사업부, 콘텐츠팀</code>
                </li>
                <li>
                  본부, 사업부, 팀:{" "}
                  <code className="rounded bg-card px-1">그로스본부, 마케팅사업부, 콘텐츠팀</code>
                </li>
              </ul>
              <textarea
                className="mt-3 min-h-[120px] w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-base sm:text-sm"
                placeholder={
                  "그로스본부, 마케팅사업부, 콘텐츠팀\n그로스본부, 마케팅사업부, 퍼포먼스팀\n오퍼레이션본부, 운영사업부, CS팀"
                }
                value={teamText}
                onChange={(e) => setTeamText(e.target.value)}
              />
            </details>

            <button
              type="button"
              className="btn-primary min-h-11 w-full sm:w-auto"
              disabled={creating}
              onClick={() => void createWave()}
            >
              {creating ? "생성 중…" : "캠페인 생성"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">캠페인</h2>
            <p className="mt-0.5 text-sm text-muted">{waves.length}개</p>
          </div>
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-sm font-medium text-accent hover:underline"
            >
              + 새 캠페인
            </button>
          ) : null}
        </div>

        {waves.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border bg-card/30 px-5 py-10 text-center">
            <p className="font-medium text-foreground">아직 캠페인이 없습니다</p>
            <p className="mt-2 text-sm text-muted">위에서 첫 조직진단을 만들어 링크를 배포하세요.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {waves.map((w) => {
              const linksOpen = expandedLinks[w.id] ?? false;
              const statusText = w.statusLabel ?? w.status;
              return (
                <li
                  key={w.id}
                  className="rounded-2xl border border-card-border bg-card/40 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(statusText)}`}
                        >
                          {statusText}
                        </span>
                        <span className="text-xs text-muted">{w.sectionBadge ?? "전체 4축"}</span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
                        Wave {w.waveNumber}
                        {w.label ? ` — ${w.label}` : ""}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        제출 {w.responseCount}건 · 팀 링크 {w.teams.length}개
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <CopyLinkButton value={w.orgWideLink} label="전체 링크" />
                      <button
                        type="button"
                        className="btn-secondary min-h-10 text-xs"
                        onClick={() => exportCsv(w)}
                      >
                        CSV
                      </button>
                      <Link
                        href={`/org/diagnosis/waves/${w.id}`}
                        className="btn-primary col-span-2 inline-flex min-h-10 items-center justify-center text-sm sm:col-span-1"
                      >
                        리포트
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-card-border/70 bg-background/60 p-3">
                    <p className="text-xs font-medium text-foreground">조직 전체 응답 링크</p>
                    <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted">
                      {w.orgWideLink}
                    </p>
                  </div>

                  {w.teams.length > 0 ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLinks((prev) => ({ ...prev, [w.id]: !linksOpen }))
                        }
                        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-accent hover:underline"
                      >
                        팀별 링크 {w.teams.length}개
                        <ChevronDown
                          className={`h-4 w-4 transition ${linksOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {linksOpen ? (
                        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                          {w.teams.map((t) => {
                            const path = nodePath(t.id, w.hierarchy);
                            return (
                              <li
                                key={t.id}
                                className="flex flex-col gap-2 rounded-xl border border-card-border/60 bg-background/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground">
                                    {path || t.name}
                                  </p>
                                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted">
                                    {t.link}
                                  </p>
                                </div>
                                <CopyLinkButton value={t.link} />
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

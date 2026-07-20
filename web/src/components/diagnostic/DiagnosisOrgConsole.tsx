"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  HierarchyTeamFields,
  draftFromFields,
} from "@/components/diagnostic/HierarchyTeamFields";
import { parseHierarchyPaste } from "@/lib/diagnostic/hierarchy-paste";
import {
  buildDraftHierarchyPreview,
  buildOrderedTree,
  levelDepth,
  levelLabel,
  type DraftTeamInput,
  type HierarchyTreeNode,
} from "@/lib/diagnostic/hierarchy-tree";
import { OrgStudioFrame, OrgStudioSkeleton } from "@/components/org/OrgStudioFrame";
import { toast } from "sonner";

type TeamLink = {
  id: string;
  name: string;
  department: string | null;
  slug: string;
  link: string;
};

type HierarchyNode = HierarchyTreeNode & {
  department?: string | null;
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

function LevelBadge({ level }: { level: HierarchyNode["level"] }) {
  return (
    <span className="inline-flex rounded-md border border-card-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted">
      {levelLabel(level)}
    </span>
  );
}

function HierarchyTreeList({
  nodes,
  teamLinkById,
}: {
  nodes: HierarchyNode[];
  teamLinkById: Map<string, string>;
}) {
  const ordered = useMemo(() => buildOrderedTree(nodes), [nodes]);
  if (ordered.length === 0) {
    return <p className="text-sm text-muted">아직 등록된 사업부·팀이 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {ordered.map((node) => {
        const depth = levelDepth(node.level);
        const link = node.level === "TEAM" ? teamLinkById.get(node.id) : null;
        return (
          <li
            key={node.id}
            className="rounded-xl border border-card-border/70 bg-background/50 px-3 py-2.5"
            style={{ marginLeft: depth * 16 }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={node.level} />
              <span className="text-sm font-medium text-foreground">{node.name}</span>
            </div>
            {link ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 truncate font-mono text-[11px] text-muted">{link}</p>
                <CopyLinkButton value={link} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function DraftHierarchyPreview({ teams }: { teams: DraftTeamInput[] }) {
  const preview = useMemo(() => buildDraftHierarchyPreview(teams), [teams]);
  if (preview.length === 0) return null;
  return (
    <div className="rounded-xl border border-card-border bg-background/40 p-3">
      <p className="text-xs font-semibold text-foreground">구조 미리보기</p>
      <ul className="mt-2 space-y-1.5">
        {preview.map((n) => (
          <li
            key={n.key}
            className="flex items-center gap-2 text-sm"
            style={{ marginLeft: n.depth * 16 }}
          >
            <LevelBadge level={n.level} />
            <span className="font-medium text-foreground">{n.name}</span>
          </li>
        ))}
      </ul>
    </div>
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
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedStructure, setExpandedStructure] = useState<Record<string, boolean>>({});
  const [editingWaveId, setEditingWaveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [draftTeams, setDraftTeams] = useState<DraftTeamInput[]>([]);
  const [divisionName, setDivisionName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [pasteInput, setPasteInput] = useState("");

  const [editDivision, setEditDivision] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [editPaste, setEditPaste] = useState("");

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

  const resetCreateHierarchy = () => {
    setDraftTeams([]);
    setDivisionName("");
    setUnitName("");
    setTeamName("");
    setPasteInput("");
  };

  const addDraftOne = () => {
    const row = draftFromFields(divisionName, unitName, teamName);
    if (!row) {
      setError("팀명을 입력해 주세요.");
      return;
    }
    setError(null);
    setDraftTeams((prev) => [...prev, row]);
    setTeamName("");
  };

  const addDraftPaste = () => {
    const rows = parseHierarchyPaste(pasteInput).map((r) => ({
      name: r.name,
      divisionName: r.divisionName ?? undefined,
      unitName: r.unitName ?? undefined,
    }));
    if (rows.length === 0) {
      setError("붙여넣을 줄을 입력해 주세요. 예: 그로스본부,사업부,팀명");
      return;
    }
    setError(null);
    setDraftTeams((prev) => [...prev, ...rows]);
    setPasteInput("");
  };

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
    setCreating(true);
    setError(null);
    const res = await fetch("/api/org/diagnosis/waves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        teams: draftTeams,
        enabledSectionCodes: enabledSections,
        opensAt: opensAt || null,
        closesAt: closesAt || null,
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error ?? "생성 실패");
      toast.error(json.error ?? "생성 실패");
      return;
    }
    setLabel("");
    setOpensAt("");
    setClosesAt("");
    resetCreateHierarchy();
    setShowCreate(false);
    toast.success("진단 캠페인을 만들었습니다.");
    await load();
  };

  const postTeams = async (waveId: string, teams: DraftTeamInput[]) => {
    if (teams.length === 0) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/diagnosis/waves/${waveId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "팀 추가 실패");
      setEditDivision("");
      setEditUnit("");
      setEditTeam("");
      setEditPaste("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "팀 추가 오류");
    } finally {
      setAdding(false);
    }
  };

  const exportCsv = (wave: Wave) => {
    const ordered = buildOrderedTree(wave.hierarchy ?? []);
    const rows = [
      ["레벨", "이름", "응답 링크"],
      ["조직 전체", "—", wave.orgWideLink],
      ...ordered.map((n) => [
        levelLabel(n.level),
        `${"  ".repeat(levelDepth(n.level))}${n.name}`,
        n.level === "TEAM" ? (wave.teams.find((t) => t.id === n.id)?.link ?? "") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arc-index-wave-${wave.waveNumber}-links.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <OrgStudioSkeleton rows={4} />;
  }

  return (
    <OrgStudioFrame
      eyebrow={`${orgName} · ARC Index`}
      title="조직진단"
      description="캠페인을 만들고 사업본부 → 사업부 → 팀 구조를 등록한 뒤 응답 링크를 배포하세요."
      actions={
        <>
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:border-gold/40"
            >
              최근 리포트
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Link>
          ) : null}
        </>
      }
    >
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <section className="rounded-2xl border border-card-border bg-card/50 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">새 진단 캠페인</h2>
          <p className="mt-1 text-sm text-muted">
            축·기간을 정한 뒤 생성하면 조직 전체 링크가 발급됩니다. 조직 구조는 선택이며, 나중에
            추가할 수도 있습니다.
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
                            ? "border-gold/50 bg-gold/15 font-medium text-foreground"
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

            <div className="space-y-3 rounded-xl border border-card-border bg-background/40 p-3 sm:p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">사업부·팀 구조 (선택)</p>
                <p className="mt-1 text-xs text-muted">
                  하이어라키: 사업본부 → 사업부 → 팀. 비워두면 조직 전체 링크만 사용합니다.
                </p>
              </div>
              <HierarchyTeamFields
                divisionName={divisionName}
                unitName={unitName}
                teamName={teamName}
                pasteInput={pasteInput}
                onDivisionChange={setDivisionName}
                onUnitChange={setUnitName}
                onTeamChange={setTeamName}
                onPasteChange={setPasteInput}
                onAddOne={addDraftOne}
                onAddPaste={addDraftPaste}
                addOneLabel="목록에 추가"
                addPasteLabel="붙여넣기 → 목록"
              />
              {draftTeams.length > 0 ? (
                <>
                  <DraftHierarchyPreview teams={draftTeams} />
                  <ul className="space-y-1.5">
                    {draftTeams.map((t, idx) => (
                      <li
                        key={`${t.divisionName ?? ""}-${t.unitName ?? ""}-${t.name}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-foreground">
                          {[t.divisionName, t.unitName, t.name].filter(Boolean).join(" › ")}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-rose-500/10 hover:text-rose-600"
                          aria-label="삭제"
                          onClick={() => setDraftTeams((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

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
              const structureOpen = expandedStructure[w.id] ?? (w.hierarchy?.length ?? 0) > 0;
              const statusText = w.statusLabel ?? w.status;
              const teamLinkById = new Map(w.teams.map((t) => [t.id, t.link]));
              const isEditing = editingWaveId === w.id;
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
                        제출 {w.responseCount}건 · 팀(리프) {w.teams.length}개
                        {(w.hierarchy?.length ?? 0) > 0
                          ? ` · 노드 ${w.hierarchy!.length}개`
                          : ""}
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

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStructure((prev) => ({
                          ...prev,
                          [w.id]: !structureOpen,
                        }))
                      }
                      className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-accent hover:underline"
                    >
                      사업부·팀 구조
                      {(w.hierarchy?.length ?? 0) > 0
                        ? ` (${w.hierarchy!.length})`
                        : ""}
                      <ChevronDown
                        className={`h-4 w-4 transition ${structureOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {structureOpen ? (
                      <div className="mt-3 space-y-3">
                        <HierarchyTreeList
                          nodes={w.hierarchy ?? []}
                          teamLinkById={teamLinkById}
                        />
                        {isEditing ? (
                          <div className="rounded-xl border border-card-border bg-background/50 p-3">
                            <HierarchyTeamFields
                              divisionName={editDivision}
                              unitName={editUnit}
                              teamName={editTeam}
                              pasteInput={editPaste}
                              busy={adding}
                              onDivisionChange={setEditDivision}
                              onUnitChange={setEditUnit}
                              onTeamChange={setEditTeam}
                              onPasteChange={setEditPaste}
                              onAddOne={() => {
                                const row = draftFromFields(editDivision, editUnit, editTeam);
                                if (!row) {
                                  setError("팀명을 입력해 주세요.");
                                  return;
                                }
                                void postTeams(w.id, [row]);
                              }}
                              onAddPaste={() => {
                                const rows = parseHierarchyPaste(editPaste).map((r) => ({
                                  name: r.name,
                                  divisionName: r.divisionName ?? undefined,
                                  unitName: r.unitName ?? undefined,
                                }));
                                if (rows.length === 0) {
                                  setError("붙여넣을 줄을 입력해 주세요.");
                                  return;
                                }
                                void postTeams(w.id, rows);
                              }}
                            />
                            <button
                              type="button"
                              className="mt-2 text-xs text-muted hover:text-foreground"
                              onClick={() => setEditingWaveId(null)}
                            >
                              닫기
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-sm font-medium text-accent hover:underline"
                            onClick={() => {
                              setEditingWaveId(w.id);
                              setExpandedStructure((prev) => ({ ...prev, [w.id]: true }));
                            }}
                          >
                            + 구조 추가
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </OrgStudioFrame>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type TeamLink = {
  id: string;
  name: string;
  department: string | null;
  slug: string;
  link: string;
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
};

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
        instJson.instrument.defaultSectionCodes ?? instJson.instrument.sections.map((s: SectionMeta) => s.code),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parseTeams = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, department] = line.split(",").map((s) => s.trim());
        return { name, department: department || undefined };
      });

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
    await load();
  };

  const exportCsv = (wave: Wave) => {
    const rows = [
      ["유형", "이름", "부서", "응답 링크"],
      ["조직 전체", "—", "—", wave.orgWideLink],
      ...wave.teams.map((t) => ["팀", t.name, t.department ?? "", t.link]),
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

  if (loading) return <p className="text-sm text-muted">불러오는 중…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">ARC Index</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">조직진단 — {orgName}</h1>
        <p className="mt-1 text-sm text-muted">
          캠페인을 만들고 조직 전체·팀별 응답 링크를 복사해 사내에 배포하세요. (발송은 하지 않습니다)
        </p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">새 진단 캠페인</h2>
        <input
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          placeholder="캠페인 라벨 (예: 2026 상반기 조직진단)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        {sections.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted">활성 진단 축</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sections.map((sec) => (
                <label
                  key={sec.code}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={enabledSections.includes(sec.code)}
                    onChange={() => toggleSection(sec.code)}
                  />
                  <span>
                    {sec.code} — {sec.nameKo}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-muted">시작일 (선택)</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted">종료일 (선택)</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </label>
        </div>

        <details className="rounded-lg border border-card-border bg-background/40 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            팀별 링크 (선택)
          </summary>
          <p className="mt-2 text-xs text-muted">
            비워두면 조직 전체 링크만 사용합니다. 한 줄에 팀 하나, 부서는 쉼표로 구분합니다.
          </p>
          <textarea
            className="mt-2 min-h-[100px] w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            placeholder={"전략기획팀, 경영지원\n개발1팀"}
            value={teamText}
            onChange={(e) => setTeamText(e.target.value)}
          />
        </details>

        <button type="button" className="btn-primary" disabled={creating} onClick={() => void createWave()}>
          {creating ? "생성 중…" : "캠페인 생성"}
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-foreground">캠페인 목록</h2>
        {waves.length === 0 ? (
          <p className="text-sm text-muted">등록된 캠페인이 없습니다.</p>
        ) : (
          waves.map((w) => (
            <div key={w.id} className="card-luxe space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    Wave {w.waveNumber}
                    {w.label ? ` — ${w.label}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {w.statusLabel ?? w.status} · {w.sectionBadge ?? "전체 4축"} · 제출 {w.responseCount}건 · 팀{" "}
                    {w.teams.length}개
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-sm" onClick={() => exportCsv(w)}>
                    링크 CSV
                  </button>
                  <Link href={`/org/diagnosis/waves/${w.id}`} className="btn-primary text-sm">
                    리포트
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-card-border/60 bg-background/50 px-3 py-2">
                <p className="text-xs font-medium text-foreground">조직 전체 링크</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <code className="truncate rounded bg-background px-1 py-0.5">{w.orgWideLink}</code>
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => void navigator.clipboard.writeText(w.orgWideLink)}
                  >
                    복사
                  </button>
                </div>
              </div>

              {w.teams.length > 0 && (
                <ul className="space-y-1 text-xs text-muted">
                  {w.teams.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{t.name}</span>
                      <code className="truncate rounded bg-background px-1 py-0.5">{t.link}</code>
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => void navigator.clipboard.writeText(t.link)}
                      >
                        복사
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

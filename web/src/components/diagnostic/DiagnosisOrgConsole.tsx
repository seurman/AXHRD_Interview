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

type Wave = {
  id: string;
  slug: string;
  waveNumber: number;
  label: string | null;
  status: string;
  responseCount: number;
  teams: TeamLink[];
};

export function DiagnosisOrgConsole() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [teamText, setTeamText] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/org/diagnosis/waves");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "불러오기 실패");
      setLoading(false);
      return;
    }
    setOrgName(json.organizationName);
    setWaves(json.waves);
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

  const createWave = async () => {
    const teams = parseTeams(teamText);
    if (!teams.length) {
      setError("팀 목록을 한 줄에 하나씩 입력해 주세요.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch("/api/org/diagnosis/waves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, teams }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error ?? "생성 실패");
      return;
    }
    setLabel("");
    setTeamText("");
    await load();
  };

  const exportCsv = (wave: Wave) => {
    const rows = [
      ["팀명", "부서", "응답 링크"],
      ...wave.teams.map((t) => [t.name, t.department ?? "", t.link]),
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
          웨이브·팀을 등록하고 응답 링크를 CSV로 내려받아 사내에 직접 배포하세요. (발송은 하지 않습니다)
        </p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">새 웨이브 + 팀 일괄 등록</h2>
        <input
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          placeholder="웨이브 라벨 (예: 2026 상반기 조직진단)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          placeholder={"팀 목록 (한 줄에 하나, 부서는 쉼표로 구분)\n전략기획팀, 경영지원\n개발1팀"}
          value={teamText}
          onChange={(e) => setTeamText(e.target.value)}
        />
        <button type="button" className="btn-primary" disabled={creating} onClick={() => void createWave()}>
          {creating ? "생성 중…" : "웨이브 생성"}
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-foreground">웨이브 목록</h2>
        {waves.length === 0 ? (
          <p className="text-sm text-muted">등록된 웨이브가 없습니다.</p>
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
                    상태 {w.status} · 제출 {w.responseCount}건 · 팀 {w.teams.length}개
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}

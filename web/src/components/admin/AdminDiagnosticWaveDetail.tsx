"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type WaveDetail = {
  id: string;
  label: string | null;
  waveNumber: number;
  statusLabel: string;
  sectionBadge: string;
  opensAt: string | null;
  closesAt: string | null;
  responseCount: number;
  orgWideLink: string;
  organization: { id: string; name: string };
  instrument: { nameKo: string };
  teams: Array<{ id: string; name: string; slug: string; link: string }>;
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? "복사됨" : label ?? "복사"}
    </button>
  );
}

export function AdminDiagnosticWaveDetail({ waveId }: { waveId: string }) {
  const searchParams = useSearchParams();
  const showCreated = searchParams.get("created") === "1";
  const [wave, setWave] = useState<WaveDetail | null>(null);
  const [teamInput, setTeamInput] = useState("");
  const [teamOpen, setTeamOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/diagnostic/waves/${waveId}`);
    const json = await res.json();
    if (res.ok) setWave(json.wave);
    else setError(json.error ?? "불러오기 실패");
  }, [waveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addTeams = async () => {
    const names = teamInput
      .split(/[,，\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnostic/waves/${waveId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "팀 추가 실패");
      setTeamInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "팀 추가 오류");
    } finally {
      setAdding(false);
    }
  };

  if (!wave) {
    return <p className="text-sm text-muted">{error ?? "불러오는 중…"}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/diagnostic" className="text-accent hover:underline">
          ← 조직진단 CMS
        </Link>
      </div>

      {showCreated && (
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          ARC Index 조직진단이 생성되었습니다.
        </div>
      )}

      <div className="card-luxe space-y-3 p-6">
        <h1 className="text-xl font-bold text-foreground">
          {wave.label ?? `Wave ${wave.waveNumber}`}
        </h1>
        <div className="flex flex-wrap gap-2 text-sm text-muted">
          <span>{wave.organization.name}</span>
          <span>·</span>
          <span>{wave.instrument.nameKo}</span>
          <span>·</span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
            {wave.sectionBadge}
          </span>
          <span>·</span>
          <span>{wave.statusLabel}</span>
          <span>·</span>
          <span>응답 {wave.responseCount}건</span>
        </div>
        {(wave.opensAt || wave.closesAt) && (
          <p className="text-xs text-muted">
            {wave.opensAt ? new Date(wave.opensAt).toLocaleDateString("ko-KR") : "—"} ~{" "}
            {wave.closesAt ? new Date(wave.closesAt).toLocaleDateString("ko-KR") : "수동 마감"}
          </p>
        )}
        <Link
          href={`/admin/diagnostic/waves/${waveId}/report`}
          className="btn-primary inline-flex px-4 py-2 text-sm"
        >
          보고서
        </Link>
      </div>

      <section className="card-luxe space-y-3 p-6">
        <h2 className="font-semibold text-foreground">기본 응답 링크</h2>
        <p className="text-xs text-muted">조직 전체용 — 팀 미지정 응답 (teamId: null)</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-3 py-2 text-xs">
            {wave.orgWideLink}
          </code>
          <CopyButton text={wave.orgWideLink} />
        </div>
      </section>

      <section id="team-links" className="card-luxe p-6 scroll-mt-6">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left font-semibold text-foreground"
          onClick={() => setTeamOpen((v) => !v)}
        >
          팀별 링크 (선택)
          <span className="text-xs text-muted">{teamOpen ? "접기" : "펼치기"}</span>
        </button>
        {teamOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted">
              팀 이름을 쉼표 또는 Enter로 구분해 추가하세요. 없어도 캠페인 운영에 문제 없습니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                className="input-luxe min-w-[12rem] flex-1 text-sm"
                placeholder="예: 개발팀, HR팀"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addTeams();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                disabled={adding}
                onClick={() => void addTeams()}
              >
                {adding ? "추가 중…" : "팀 추가"}
              </button>
            </div>
            {wave.teams.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border text-xs text-muted">
                    <th className="py-2">팀</th>
                    <th className="py-2">링크</th>
                  </tr>
                </thead>
                <tbody>
                  {wave.teams.map((t) => (
                    <tr key={t.id} className="border-b border-card-border last:border-0">
                      <td className="py-2 pr-4">{t.name}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="max-w-[14rem] truncate text-xs">{t.link}</code>
                          <CopyButton text={t.link} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted">아직 팀별 링크가 없습니다.</p>
            )}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

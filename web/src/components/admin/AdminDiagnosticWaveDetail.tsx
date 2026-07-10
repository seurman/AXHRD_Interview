"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminCopyField } from "@/components/admin/AdminCopyField";
import { Badge } from "@/components/admin/Badge";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

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

export function AdminDiagnosticWaveDetail({ waveId }: { waveId: string }) {
  const searchParams = useSearchParams();
  const showCreated = searchParams.get("created") === "1";
  const [wave, setWave] = useState<WaveDetail | null>(null);
  const [teamInput, setTeamInput] = useState("");
  const [teamOpen, setTeamOpen] = useState(showCreated);
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

  const title = wave.label ?? `Wave ${wave.waveNumber}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.diagnostic}
        title={title}
        breadcrumb={[
          { label: "조직진단 CMS", href: "/admin/diagnostic" },
          { label: title },
        ]}
        actions={
          <Link
            href={`/admin/diagnostic/waves/${waveId}/report`}
            className="btn-primary px-4 py-2 text-sm"
          >
            보고서
          </Link>
        }
      />

      {showCreated && (
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          ARC Index 조직진단이 생성되었습니다.
        </div>
      )}

      <div className="card-luxe p-5">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-medium text-foreground">{wave.organization.name}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{wave.instrument.nameKo}</span>
          <Badge tone="accent">{wave.sectionBadge}</Badge>
          <Badge tone="neutral">{wave.statusLabel}</Badge>
          <span className="text-muted">응답 {wave.responseCount}건</span>
        </div>
        {(wave.opensAt || wave.closesAt) && (
          <p className="mt-2 text-xs text-muted">
            {wave.opensAt ? new Date(wave.opensAt).toLocaleDateString("ko-KR") : "—"} ~{" "}
            {wave.closesAt ? new Date(wave.closesAt).toLocaleDateString("ko-KR") : "수동 마감"}
          </p>
        )}
        <Link
          href={`/admin/organizations/${wave.organization.id}`}
          className="mt-3 inline-block text-xs text-accent hover:underline"
        >
          기관 허브 →
        </Link>
      </div>

      <AdminSection title="기본 응답 링크" description="조직 전체용 — teamId null 응답">
        <AdminCopyField label="배포 URL" hint="복사 후 이메일·메신저로 직접 전달" value={wave.orgWideLink} />
      </AdminSection>

      <AdminSection
        id="team-links"
        title="팀별 링크 (선택)"
        description="없어도 캠페인 운영에 문제 없습니다. 팀 이름 입력 후 Enter."
        actions={
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground"
            onClick={() => setTeamOpen((v) => !v)}
          >
            {teamOpen ? "접기" : "펼치기"}
          </button>
        }
      >
        {teamOpen && (
          <div className="space-y-4">
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
              <ul className="space-y-3">
                {wave.teams.map((t) => (
                  <li key={t.id}>
                    <p className="mb-1 text-sm font-medium text-foreground">{t.name}</p>
                    <AdminCopyField value={t.link} label="" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">아직 팀별 링크가 없습니다.</p>
            )}
          </div>
        )}
        {!teamOpen && wave.teams.length > 0 && (
          <p className="text-sm text-muted">{wave.teams.length}개 팀 링크 발급됨 — 펼쳐서 관리</p>
        )}
      </AdminSection>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

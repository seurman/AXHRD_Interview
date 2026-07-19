"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminCopyField } from "@/components/admin/AdminCopyField";
import { Badge } from "@/components/admin/Badge";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import type { HierarchyNodeDto, TeamInput } from "@/lib/diagnostic/campaigns";
import { parseHierarchyPaste } from "@/lib/diagnostic/hierarchy-paste";
import {
  buildOrderedTree,
  levelDepth,
  levelLabel,
} from "@/lib/diagnostic/hierarchy-tree";

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
  hierarchy: HierarchyNodeDto[];
};

export function AdminDiagnosticWaveDetail({
  waveId,
  navContext = "cms",
}: {
  waveId: string;
  /** org = 기관 허브 표준 경로, cms = 진단 CMS 크로스-기관 진입 */
  navContext?: "org" | "cms";
}) {
  const searchParams = useSearchParams();
  const showCreated = searchParams.get("created") === "1";
  const [wave, setWave] = useState<WaveDetail | null>(null);
  const [pasteInput, setPasteInput] = useState("");
  const [divisionName, setDivisionName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamOpen, setTeamOpen] = useState(showCreated);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/diagnostic/waves/${waveId}`);
    const json = await res.json();
    if (res.ok) setWave({ ...json.wave, hierarchy: json.wave.hierarchy ?? [] });
    else setError(json.error ?? "불러오기 실패");
  }, [waveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedHierarchy = useMemo(
    () => buildOrderedTree(wave?.hierarchy ?? []),
    [wave?.hierarchy],
  );

  const teamLinkById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of wave?.teams ?? []) map.set(t.id, t.link);
    return map;
  }, [wave?.teams]);

  const postTeams = async (teams: TeamInput[]) => {
    if (teams.length === 0) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/diagnostic/waves/${waveId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "팀 추가 실패");
      setPasteInput("");
      setDivisionName("");
      setUnitName("");
      setTeamName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "팀 추가 오류");
    } finally {
      setAdding(false);
    }
  };

  const addFromForm = async () => {
    const name = teamName.trim();
    if (!name) {
      setError("팀명을 입력해 주세요.");
      return;
    }
    await postTeams([
      {
        name,
        divisionName: divisionName.trim() || undefined,
        unitName: unitName.trim() || undefined,
      },
    ]);
  };

  const addFromPaste = async () => {
    const rows = parseHierarchyPaste(pasteInput);
    if (rows.length === 0) {
      setError("붙여넣을 줄을 입력해 주세요. 예: 본사,영업본부,서울팀");
      return;
    }
    await postTeams(rows);
  };

  if (!wave) {
    return <p className="text-sm text-muted">{error ?? "불러오는 중…"}</p>;
  }

  const title = wave.label ?? `Wave ${wave.waveNumber}`;
  const leafCount = wave.teams.length;
  const orgBase = `/admin/organizations/${wave.organization.id}`;
  const waveBase =
    navContext === "org"
      ? `${orgBase}/waves/${waveId}`
      : `/admin/diagnostic/waves/${waveId}`;
  const breadcrumb =
    navContext === "org"
      ? [
          { label: "기관 관리", href: "/admin/organizations" },
          { label: wave.organization.name, href: orgBase },
          { label: "조직진단", href: `${orgBase}/waves` },
          { label: title },
        ]
      : [
          { label: "조직진단 CMS", href: "/admin/diagnostic" },
          { label: title },
        ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={navContext === "org" ? PLATFORM_EYEBROW.tenants : PLATFORM_EYEBROW.diagnostic}
        title={title}
        breadcrumb={breadcrumb}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/diagnostic/waves/${waveId}/export`}
              className="btn-secondary px-4 py-2 text-sm"
            >
              엑셀 다운로드
            </a>
            <Link href={`${waveBase}/report`} className="btn-primary px-4 py-2 text-sm">
              보고서
            </Link>
          </div>
        }
      />

      {showCreated && (
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          ARC Index 조직진단이 생성되었습니다. 아래에서 사업부·팀 구조를 등록하세요.
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
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <Link href={orgBase} className="text-accent hover:underline">
            기관 허브 →
          </Link>
          <Link href={`${orgBase}/waves`} className="text-accent hover:underline">
            이 기관 웨이브 목록 →
          </Link>
        </div>
      </div>

      <AdminSection title="기본 응답 링크" description="조직 전체용 — teamId null 응답">
        <AdminCopyField label="배포 URL" hint="복사 후 이메일·메신저로 직접 전달" value={wave.orgWideLink} />
      </AdminSection>

      <AdminSection
        id="team-links"
        title="사업부·팀 구조"
        description="사업본부 → 사업부 → 팀. 응답 링크는 팀(리프)에만 발급됩니다."
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
          <div className="space-y-5">
            <div className="space-y-2 rounded-xl border border-card-border bg-background/40 p-3">
              <p className="text-xs font-semibold text-foreground">한 줄 추가</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="input-luxe text-sm"
                  placeholder="사업본부 (선택)"
                  value={divisionName}
                  onChange={(e) => setDivisionName(e.target.value)}
                />
                <input
                  className="input-luxe text-sm"
                  placeholder="사업부 (선택)"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                />
                <input
                  className="input-luxe text-sm"
                  placeholder="팀명 (필수)"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addFromForm();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                disabled={adding}
                onClick={() => void addFromForm()}
              >
                {adding ? "추가 중…" : "팀 추가"}
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-card-border bg-background/40 p-3">
              <p className="text-xs font-semibold text-foreground">여러 줄 붙여넣기</p>
              <p className="text-[11px] text-muted">
                한 줄에 <code className="text-[10px]">사업본부,사업부,팀명</code> (엑셀에서 복사
                가능). 콤마 1개=팀만, 2개=사업부+팀, 3개=사업본부+사업부+팀.
              </p>
              <textarea
                className="input-luxe min-h-[6rem] w-full text-sm"
                placeholder={"본사,영업본부,서울팀\n본사,영업본부,부산팀\n지원팀"}
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                disabled={adding}
                onClick={() => void addFromPaste()}
              >
                {adding ? "추가 중…" : "붙여넣기 추가"}
              </button>
            </div>

            {orderedHierarchy.length > 0 ? (
              <ul className="space-y-2">
                {orderedHierarchy.map((node) => {
                  const depth = levelDepth(node.level);
                  const link = node.level === "TEAM" ? teamLinkById.get(node.id) : null;
                  return (
                    <li
                      key={node.id}
                      className="rounded-lg border border-card-border/70 bg-card/40 px-3 py-2"
                      style={{ marginLeft: depth * 16 }}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{levelLabel(node.level)}</Badge>
                        <span className="text-sm font-medium text-foreground">{node.name}</span>
                        {node.department ? (
                          <span className="text-[11px] text-muted">{node.department}</span>
                        ) : null}
                      </div>
                      {link ? <AdminCopyField value={link} label="" /> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">아직 등록된 사업부·팀이 없습니다.</p>
            )}
          </div>
        )}
        {!teamOpen && leafCount > 0 && (
          <p className="text-sm text-muted">
            팀(리프) {leafCount}개 · 노드 {orderedHierarchy.length}개 — 펼쳐서 관리
          </p>
        )}
      </AdminSection>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

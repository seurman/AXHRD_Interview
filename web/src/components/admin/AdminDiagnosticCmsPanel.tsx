"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminDiagnosticWizard } from "@/components/admin/AdminDiagnosticWizard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusDot, type DotTone } from "@/components/admin/StatusDot";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

type InstrumentSummary = {
  id: string;
  code: string;
  nameKo: string;
  version: string;
  estimatedMinutes: number | null;
  sections: {
    code: string;
    nameKo: string;
    itemCount: number;
    subscales: { code: string; nameKo: string; itemCount: number }[];
  }[];
};

type WaveRow = {
  id: string;
  waveNumber: number;
  label: string | null;
  statusLabel: string;
  sectionBadge: string;
  instrumentName: string;
  organizationName: string;
  opensAt: string | null;
  closesAt: string | null;
  teamCount: number;
  responseCount: number;
};

type Props = {
  instruments: InstrumentSummary[];
  waves: WaveRow[];
  dbError?: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR");
}

const WAVE_STATUS_TONE: Record<string, DotTone> = {
  "준비중": "neutral",
  "진행중": "accent",
  "마감": "success",
};

export function AdminDiagnosticCmsPanel({ instruments, waves, dbError = null }: Props) {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const seeded = instruments.length > 0;

  async function runSeed() {
    if (!confirm("ARC Index 문항뱅크(OHI·ORI·OVI·OAI)를 DB에 등록합니다. 계속할까요?")) return;
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/diagnostic/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSeedError(json.error ?? "시드 실패");
        return;
      }
      router.refresh();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.diagnostic}
        title="조직진단 CMS"
        subtitle={
          <>
            수퍼어드민 전용 캠페인 관리 화면입니다. 기관 셀프서브{" "}
            <code className="text-xs">/org/diagnosis</code>와 별개로 운영합니다.
          </>
        }
        actions={
          seeded ? (
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => setWizardOpen(true)}
            >
              + 새 진단 시작
            </button>
          ) : undefined
        }
      />

      <section className="card-luxe p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">① 문항뱅크 (ARC Index)</h2>
            <p className="mt-1 text-sm text-muted">정본: docs/arc-index/source/*.md</p>
          </div>
          {!seeded && (
            <button
              type="button"
              disabled={seeding}
              onClick={() => void runSeed()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {seeding ? "설치 중…" : "문항뱅크 설치"}
            </button>
          )}
        </div>

        {dbError && (
          <div className="mt-4 rounded-xl border border-rose-300/60 bg-rose-50/80 p-4 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
            <p className="font-medium">DB 연결/스키마 오류</p>
            <p className="mt-1 text-xs opacity-90">{dbError}</p>
            <p className="mt-2 text-xs">
              운영 Supabase에서{" "}
              <code className="rounded bg-black/10 px-1">npx prisma migrate deploy</code> 실행 후
              다시 시도하세요.
            </p>
          </div>
        )}

        {seedError && <p className="mt-3 text-sm text-rose-600">{seedError}</p>}

        {!seeded ? (
          <div className="mt-6 rounded-xl border border-dashed border-amber-300/60 bg-amber-50/50 p-6 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              문항뱅크가 아직 설치되지 않았습니다.
            </p>
            <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-200/80">
              운영 DB에 마이그레이션 후 위 「문항뱅크 설치」를 누르거나, 서버에서{" "}
              <code className="text-xs">npx tsx prisma/seed/arc-index.ts</code> 를 실행하세요.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {instruments.map((inst) => (
              <li key={inst.id} className="rounded-xl border border-card-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-foreground">{inst.nameKo}</p>
                  <span className="text-xs text-muted">
                    {inst.code} · {inst.version} · 약 {inst.estimatedMinutes}분
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {inst.sections.map((sec) => (
                    <div key={sec.code} className="rounded-lg bg-background/60 px-3 py-2 text-xs">
                      <p className="font-medium text-foreground">
                        {sec.code} — {sec.nameKo}
                      </p>
                      <p className="mt-1 text-muted">문항 {sec.itemCount}개</p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-luxe p-6">
        <h2 className="mb-1 font-semibold text-foreground">② 진단 캠페인</h2>
        <p className="mb-4 text-sm text-muted">
          기관 선택·신규 등록 → 진단도구·섹션 → 일정 순으로 캠페인을 생성합니다. 팀별 링크는 생성 후
          상세 화면에서 선택적으로 추가합니다.
        </p>
        {waves.length === 0 ? (
          <p className="rounded-xl border border-dashed border-card-border p-6 text-sm text-muted">
            아직 캠페인이 없습니다. 문항뱅크 설치 후 「+ 새 진단 시작」으로 첫 캠페인을 만드세요.
          </p>
        ) : (
          <ul className="-mx-6 -mb-6 border-t border-card-border">
            {waves.map((w) => (
              <li key={w.id} className="border-b border-card-border last:border-0">
                <Link
                  href={`/admin/diagnostic/waves/${w.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-6 py-3 text-sm transition hover:bg-background/60"
                >
                  <StatusDot tone={WAVE_STATUS_TONE[w.statusLabel] ?? "neutral"} className="w-16 shrink-0">
                    {w.statusLabel}
                  </StatusDot>

                  <span className="min-w-[10rem] flex-1 truncate">
                    <span className="font-medium text-foreground">{w.organizationName}</span>
                    <span className="text-muted"> · {w.label ?? `Wave ${w.waveNumber}`}</span>
                  </span>

                  <span className="shrink-0 text-xs text-muted">{w.sectionBadge}</span>

                  <span className="shrink-0 text-xs text-muted">
                    {formatDate(w.opensAt)} → {w.closesAt ? formatDate(w.closesAt) : "수동 마감"}
                  </span>

                  <span className="shrink-0 text-xs text-muted">응답 {w.responseCount}</span>

                  <span className="ml-auto shrink-0 text-xs text-accent">상세 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {wizardOpen && (
        <AdminDiagnosticWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

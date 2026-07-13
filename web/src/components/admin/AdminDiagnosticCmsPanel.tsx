"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminDiagnosticWizard } from "@/components/admin/AdminDiagnosticWizard";
import { AdminDiagnosticInstrumentStudio } from "@/components/admin/AdminDiagnosticInstrumentStudio";
import { AdminDiagnosticReportStudio } from "@/components/admin/AdminDiagnosticReportStudio";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminPagination } from "@/components/admin/AdminPagination";
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
  wavePage?: number;
  wavePageSize?: number;
  waveTotal?: number;
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

export function AdminDiagnosticCmsPanel({
  instruments,
  waves,
  dbError = null,
  wavePage = 1,
  wavePageSize = waves.length,
  waveTotal = waves.length,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"instrument" | "campaign" | "report">("campaign");
  const [seeding, setSeeding] = useState(false);
  const [demoSeeding, setDemoSeeding] = useState<"arc" | "suite" | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const seeded = instruments.length > 0;

  async function runSeed() {
    if (!confirm("docs/arc-index/source 정본을 DB와 동기화합니다. 계속할까요?")) return;
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/diagnostic/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setSeedError(json.error ?? "동기화 실패");
        return;
      }
      if (json.message) alert(json.message);
      router.refresh();
    } finally {
      setSeeding(false);
    }
  }

  async function runDemoSeed(kind: "arc" | "suite") {
    const message =
      kind === "arc"
        ? "운영 DB에 ARC 데모 캠페인(테크노바 + 쇼케이스)을 생성합니다. 기존 해당 기관 웨이브는 교체됩니다. 계속할까요?"
        : "운영 DB에 통합 시연 데이터(개인·기관·쇼케이스·ARC)를 모두 넣습니다. 수 분 걸릴 수 있습니다. 계속할까요?";
    if (!confirm(message)) return;

    setDemoSeeding(kind);
    setSeedError(null);
    try {
      const path =
        kind === "arc" ? "/api/admin/diagnostic/demo-arc-seed" : "/api/admin/diagnostic/demo-suite-seed";
      const res = await fetch(path, {
        method: "POST",
        headers: kind === "arc" ? { "Content-Type": "application/json" } : undefined,
        body: kind === "arc" ? JSON.stringify({ scope: "both" }) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        setSeedError(json.error ?? "데모 시드 실패");
        return;
      }
      if (json.message) alert(json.message);
      router.refresh();
    } finally {
      setDemoSeeding(null);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.diagnostic}
        title="Diagnostic Studio"
        subtitle={
          <>
            Instrument · Campaign · Report를 한 콘솔에서 관리합니다. 기관 셀프서브{" "}
            <code className="text-xs">/org/diagnosis</code>와 동일한 캠페인 엔진을 공유합니다.
          </>
        }
        actions={
          seeded && tab === "campaign" ? (
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

      <div className="flex flex-wrap gap-2 border-b border-card-border pb-2">
        {(
          [
            ["instrument", "Instrument"],
            ["campaign", "Campaign"],
            ["report", "Report"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === id ? "bg-accent text-white" : "text-muted hover:bg-card-border/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "instrument" && (
      <AdminSection
        title="Instrument Studio"
        description="정본: docs/arc-index/source/*.md — 원본 동기화 후 문항 편집"
        actions={
          <button
            type="button"
            disabled={seeding}
            onClick={() => void runSeed()}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            {seeding ? "동기화 중…" : "원본 동기화"}
          </button>
        }
      >
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
              문항뱅크가 아직 등록되지 않았습니다.
            </p>
            <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-200/80">
              「원본 동기화」를 누르거나 서버에서{" "}
              <code className="text-xs">npx tsx prisma/seed/arc-index.ts</code> 를 실행하세요.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <AdminDiagnosticInstrumentStudio
              instrumentId={instruments[0]!.id}
              onSync={() => void runSeed()}
              syncing={seeding}
            />
          </div>
        )}
      </AdminSection>
      )}

      {tab === "campaign" && (
      <AdminSection
        title="진단 캠페인"
        description="기관 선택 → 섹션 → 일정. 팀별 링크는 생성 후 상세 화면에서 추가합니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={demoSeeding !== null}
              onClick={() => void runDemoSeed("arc")}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              {demoSeeding === "arc" ? "ARC 데모 생성 중…" : "운영 ARC 데모"}
            </button>
            <button
              type="button"
              disabled={demoSeeding !== null}
              onClick={() => void runDemoSeed("suite")}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              {demoSeeding === "suite" ? "통합 시드 중…" : "운영 통합 시연 시드"}
            </button>
          </div>
        }
      >
        {seedError && <p className="mb-4 text-sm text-rose-600">{seedError}</p>}

        {waves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/50 p-6 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              아직 캠페인이 없습니다.
            </p>
            <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-200/80">
              운영(Vercel) DB는 로컬 CLI 시드가 연결되지 않습니다. 슈퍼어드민으로 「운영 ARC 데모」 또는
              「운영 통합 시연 시드」를 실행하세요. 로컬 개발은{" "}
              <code className="text-xs">npm run db:seed:demo</code> 를 사용합니다.
            </p>
          </div>
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
        <AdminPagination
          page={wavePage}
          pageSize={wavePageSize}
          total={waveTotal}
          basePath="/admin/diagnostic"
        />
      </AdminSection>
      )}

      {tab === "report" && (
        <AdminSection
          title="Report Studio"
          description="보고서 탭·축·최소 표본 프리셋. 캠페인별 override 가능."
        >
          <AdminDiagnosticReportStudio
            instruments={instruments.map((i) => ({
              id: i.id,
              code: i.code,
              nameKo: i.nameKo,
            }))}
            waves={waves}
          />
        </AdminSection>
      )}

      {wizardOpen && (
        <AdminDiagnosticWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

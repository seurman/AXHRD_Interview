"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AdminDiagnosticWizard } from "@/components/admin/AdminDiagnosticWizard";
import { AdminDiagnosticInstrumentStudio } from "@/components/admin/AdminDiagnosticInstrumentStudio";
import { AdminDiagnosticReportStudio } from "@/components/admin/AdminDiagnosticReportStudio";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminStudioTabs } from "@/components/admin/AdminStudioTabs";
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
  organizationId: string;
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

type PendingConfirm =
  | { kind: "seed" }
  | { kind: "demo"; demo: "arc" | "suite" }
  | null;

export function AdminDiagnosticCmsPanel({
  instruments,
  waves,
  dbError = null,
  wavePage = 1,
  wavePageSize = waves.length,
  waveTotal = waves.length,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("campaign");
  const [seeding, setSeeding] = useState(false);
  const [demoSeeding, setDemoSeeding] = useState<"arc" | "suite" | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pending, setPending] = useState<PendingConfirm>(null);

  const seeded = instruments.length > 0;

  async function runSeed() {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch("/api/admin/diagnostic/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error ?? "동기화 실패";
        setSeedError(msg);
        toast.error(msg);
        return;
      }
      toast.success(json.message ?? "원본 동기화가 완료되었습니다.");
      router.refresh();
    } finally {
      setSeeding(false);
      setPending(null);
    }
  }

  async function runDemoSeed(kind: "arc" | "suite") {
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
        const msg = json.error ?? "데모 시드 실패";
        setSeedError(msg);
        toast.error(msg);
        return;
      }
      toast.success(json.message ?? "데모 시드가 완료되었습니다.");
      router.refresh();
    } finally {
      setDemoSeeding(null);
      setPending(null);
    }
  }

  const instrumentTab = (
    <AdminSection
      title="Instrument Studio"
      description="정본: docs/arc-index/source/*.md — 「원본 동기화」로 DM06~12 등 시드 문항을 DB에 반영합니다"
      actions={
        <button
          type="button"
          disabled={seeding}
          onClick={() => setPending({ kind: "seed" })}
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
            onSync={() => setPending({ kind: "seed" })}
            syncing={seeding}
          />
        </div>
      )}
    </AdminSection>
  );

  const campaignTab = (
    <AdminSection
      title="진단 캠페인 (크로스-기관)"
      description="전체 기관 웨이브 목록. 클릭하면 기관 → 웨이브 상세로 이동합니다. 생성은 모달 마법사, 상세·리포트는 별도 페이지(참여 현황·킷과 동일)."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={demoSeeding !== null}
            onClick={() => setPending({ kind: "demo", demo: "arc" })}
            className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            {demoSeeding === "arc" ? "ARC 데모 생성 중…" : "운영 ARC 데모"}
          </button>
          <button
            type="button"
            disabled={demoSeeding !== null}
            onClick={() => setPending({ kind: "demo", demo: "suite" })}
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
        <ul className="-mx-4 -mb-4 border-t border-[var(--platform-border)] sm:-mx-5 sm:-mb-5 lg:-mx-6 lg:-mb-6">
          {waves.map((w) => (
            <li key={w.id} className="border-b border-[var(--platform-border)] last:border-0">
              <Link
                href={`/admin/organizations/${w.organizationId}/waves/${w.id}`}
                className="flex flex-col gap-1.5 px-4 py-3.5 text-sm transition hover:bg-[var(--platform-canvas)] sm:px-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:px-6"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StatusDot
                    tone={WAVE_STATUS_TONE[w.statusLabel] ?? "neutral"}
                    className="w-16 shrink-0"
                  >
                    {w.statusLabel}
                  </StatusDot>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-[var(--platform-text)]">{w.organizationName}</span>
                    <span className="text-[var(--platform-text-muted)]">
                      {" "}
                      · {w.label ?? `Wave ${w.waveNumber}`}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[4.5rem] text-xs text-[var(--platform-text-muted)] lg:ml-auto lg:pl-0">
                  <span>{w.sectionBadge}</span>
                  <span>
                    {formatDate(w.opensAt)} → {w.closesAt ? formatDate(w.closesAt) : "수동 마감"}
                  </span>
                  <span>응답 {w.responseCount}</span>
                  <span className="text-[var(--platform-accent)]">상세 →</span>
                </div>
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
  );

  const reportTab = (
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
  );

  const tabs = [
    { id: "instrument", label: "Instrument", content: instrumentTab },
    { id: "campaign", label: "Campaign", content: campaignTab },
    { id: "report", label: "Report", content: reportTab },
  ];

  const confirmTitle =
    pending?.kind === "seed"
      ? "원본 동기화"
      : pending?.kind === "demo" && pending.demo === "arc"
        ? "운영 ARC 데모"
        : pending?.kind === "demo"
          ? "운영 통합 시연 시드"
          : "";

  const confirmDescription =
    pending?.kind === "seed"
      ? "docs/arc-index/source 정본을 DB와 동기화합니다. 계속할까요?"
      : pending?.kind === "demo" && pending.demo === "arc"
        ? "운영 DB에 ARC 데모 캠페인(테크노바 + 쇼케이스)을 생성합니다. 기존 해당 기관 웨이브는 교체됩니다."
        : pending?.kind === "demo"
          ? "운영 DB에 시연 데이터(개인·쇼케이스·지원자·쇼케이스 ARC)를 넣습니다. 약 1~2분 소요됩니다."
          : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.diagnostic}
        title="Diagnostic Studio"
        subtitle={
          <>
            Instrument · 크로스-기관 Campaign 목록 · Report Studio. 일상 운영은{" "}
            <strong className="font-medium text-[var(--platform-text)]">기관 → 조직진단 웨이브</strong>
            에서 합니다(참여 현황·인터뷰 킷과 동일).
          </>
        }
        actions={
          seeded && tab === "campaign" ? (
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => setWizardOpen(true)}
            >
              + 새 웨이브
            </button>
          ) : undefined
        }
      />

      <AdminStudioTabs tabs={tabs} value={tab} onValueChange={setTab} />

      <AdminConfirmDialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="실행"
        confirmTone="primary"
        busy={seeding || demoSeeding != null}
        onConfirm={() => {
          if (pending?.kind === "seed") return runSeed();
          if (pending?.kind === "demo") return runDemoSeed(pending.demo);
        }}
      />

      {wizardOpen && (
        <AdminDiagnosticWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}

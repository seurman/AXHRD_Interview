"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminDiagnosticWizard } from "@/components/admin/AdminDiagnosticWizard";
import { AdminSection } from "@/components/admin/AdminSection";
import { StatusDot, type DotTone } from "@/components/admin/StatusDot";

type WaveRow = {
  id: string;
  waveNumber: number;
  label: string | null;
  statusLabel: string;
  sectionBadge: string;
  instrumentName: string;
  opensAt: string | null;
  closesAt: string | null;
  teamCount: number;
  responseCount: number;
};

type Props = {
  organizationId: string;
  organizationName: string;
  waves: WaveRow[];
  diagnosticEnabled: boolean;
};

const WAVE_STATUS_TONE: Record<string, DotTone> = {
  "준비중": "neutral",
  "진행중": "accent",
  "마감": "success",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function AdminOrgWavesPanel({
  organizationId,
  organizationName,
  waves,
  diagnosticEnabled,
}: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const base = `/admin/organizations/${organizationId}/waves`;

  return (
    <div className="space-y-4">
      {!diagnosticEnabled && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          이 기관의 조직진단 SKU가 꺼져 있습니다. 기관 허브에서 Entitlement를 켠 뒤 캠페인을
          운영하세요. 수퍼어드민은 계속 웨이브를 만들 수 있습니다.
        </div>
      )}

      <AdminSection
        title={`${organizationName} · 웨이브`}
        description="웨이브를 연 뒤 사업부·팀 구조를 관리합니다. 응답 링크는 팀(리프) 단위로 발급됩니다."
        actions={
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => setWizardOpen(true)}>
            + 새 웨이브
          </button>
        }
      >
        {waves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border p-6 text-sm text-muted">
            아직 웨이브가 없습니다. 「새 웨이브」로 진단을 시작하세요.
          </div>
        ) : (
          <ul className="-mx-4 -mb-4 border-t border-card-border sm:-mx-5 sm:-mb-5 lg:-mx-6 lg:-mb-6">
            {waves.map((w) => (
              <li key={w.id} className="border-b border-card-border last:border-0">
                <Link
                  href={`${base}/${w.id}`}
                  className="flex flex-col gap-1.5 px-4 py-3.5 text-sm transition hover:bg-background/60 sm:px-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:px-6"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <StatusDot
                      tone={WAVE_STATUS_TONE[w.statusLabel] ?? "neutral"}
                      className="w-16 shrink-0"
                    >
                      {w.statusLabel}
                    </StatusDot>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {w.label ?? `Wave ${w.waveNumber}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[4.5rem] text-xs text-muted lg:ml-auto lg:pl-0">
                    <span>{w.sectionBadge}</span>
                    <span>{w.instrumentName}</span>
                    <span>
                      {formatDate(w.opensAt)} → {w.closesAt ? formatDate(w.closesAt) : "수동 마감"}
                    </span>
                    <span>팀 {w.teamCount}</span>
                    <span>응답 {w.responseCount}</span>
                    <span className="text-accent">구조·링크 →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <p className="text-xs text-muted">
        문항뱅크·리포트 프리셋은{" "}
        <Link href="/admin/diagnostic" className="text-accent hover:underline">
          조직진단 CMS
        </Link>
        에서 관리합니다.
      </p>

      {wizardOpen && (
        <AdminDiagnosticWizard
          lockedOrganizationId={organizationId}
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
          }}
        />
      )}
    </div>
  );
}

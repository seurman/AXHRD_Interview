import Link from "next/link";
import { requireDiagnosticUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DiagnosisWaveDashboard } from "@/components/diagnostic/DiagnosisWaveDashboard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ waveId: string }> };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "준비",
  SCHEDULED: "예정",
  OPEN: "진행 중",
  CLOSED: "마감",
  ARCHIVED: "보관",
};

export default async function OrgDiagnosisWavePage({ params }: Props) {
  const { waveId } = await params;
  const { organizationId } = await requireDiagnosticUser(`/org/diagnosis/waves/${waveId}`);

  const wave = await prisma.diagnosticWave.findFirst({
    where: { id: waveId, organizationId },
    select: {
      id: true,
      label: true,
      waveNumber: true,
      status: true,
      _count: { select: { responses: true } },
    },
  });
  if (!wave) {
    return <p className="text-muted">웨이브를 찾을 수 없습니다.</p>;
  }

  const statusLabel = STATUS_LABEL[wave.status] ?? wave.status;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:space-y-6">
      <div>
        <Link
          href="/org/diagnosis"
          className="inline-flex min-h-9 items-center text-sm text-accent hover:underline"
        >
          ← 조직진단 홈
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-muted">
            {statusLabel}
          </span>
          <span className="text-xs text-muted">제출 {wave._count.responses}건</span>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-snug text-foreground sm:text-2xl">
          Wave {wave.waveNumber}
          {wave.label ? ` — ${wave.label}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">축 점수 · 조직별 비교 · 추이</p>
      </div>
      <DiagnosisWaveDashboard waveId={waveId} />
    </div>
  );
}

import Link from "next/link";
import { requireDiagnosticUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DiagnosisWaveDashboard } from "@/components/diagnostic/DiagnosisWaveDashboard";
import { OrgStudioFrame } from "@/components/org/OrgStudioFrame";

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
    <OrgStudioFrame
      maxWidth="5xl"
      eyebrow="Org Studio · ARC Index"
      title={`Wave ${wave.waveNumber}${wave.label ? ` — ${wave.label}` : ""}`}
      description={`축 점수 · 조직별 비교 · 추이 · 제출 ${wave._count.responses}건`}
      actions={
        <>
          <span className="inline-flex min-h-9 items-center rounded-md border border-card-border bg-card px-2.5 text-[11px] font-semibold text-muted">
            {statusLabel}
          </span>
          <Link
            href="/org/diagnosis"
            className="inline-flex min-h-9 items-center rounded-xl border border-card-border bg-card px-3 text-sm text-foreground hover:border-gold/40"
          >
            ← 조직진단
          </Link>
        </>
      }
    >
      <DiagnosisWaveDashboard waveId={waveId} />
    </OrgStudioFrame>
  );
}

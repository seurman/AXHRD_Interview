import Link from "next/link";
import { requireDiagnosticUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { DiagnosisWaveDashboard } from "@/components/diagnostic/DiagnosisWaveDashboard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ waveId: string }> };

export default async function OrgDiagnosisWavePage({ params }: Props) {
  const { waveId } = await params;
  const { organizationId } = await requireDiagnosticUser(`/org/diagnosis/waves/${waveId}`);

  const wave = await prisma.diagnosticWave.findFirst({
    where: { id: waveId, organizationId },
    select: { id: true, label: true, waveNumber: true, status: true },
  });
  if (!wave) {
    return <p className="text-muted">웨이브를 찾을 수 없습니다.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/org/diagnosis" className="text-sm text-accent hover:underline">
          ← 조직진단 홈
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Wave {wave.waveNumber}
          {wave.label ? ` — ${wave.label}` : ""}
        </h1>
        <p className="text-sm text-muted">상태: {wave.status}</p>
      </div>
      <DiagnosisWaveDashboard waveId={waveId} />
    </div>
  );
}

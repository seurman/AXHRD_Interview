import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireOrganizationsViewer } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminDiagnosticWaveDetail } from "@/components/admin/AdminDiagnosticWaveDetail";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; waveId: string }> };

export default async function AdminOrgWaveDetailPage({ params }: Props) {
  await requireOrganizationsViewer("/admin/organizations");
  const { id: organizationId, waveId } = await params;

  const wave = await prisma.diagnosticWave.findFirst({
    where: { id: waveId, organizationId },
    select: { id: true },
  });
  if (!wave) notFound();

  return (
    <div className={ADMIN_CONTAINER.detail}>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <AdminDiagnosticWaveDetail waveId={waveId} navContext="org" />
      </Suspense>
    </div>
  );
}

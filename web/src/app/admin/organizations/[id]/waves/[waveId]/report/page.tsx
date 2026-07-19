import { notFound } from "next/navigation";
import { requireOrganizationsViewer } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminDiagnosticReport } from "@/components/admin/AdminDiagnosticReport";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; waveId: string }> };

export default async function AdminOrgWaveReportPage({ params }: Props) {
  await requireOrganizationsViewer("/admin/organizations");
  const { id: organizationId, waveId } = await params;

  const wave = await prisma.diagnosticWave.findFirst({
    where: { id: waveId, organizationId },
    select: { id: true },
  });
  if (!wave) notFound();

  return (
    <div className={ADMIN_CONTAINER.detail}>
      <AdminDiagnosticReport waveId={waveId} />
    </div>
  );
}

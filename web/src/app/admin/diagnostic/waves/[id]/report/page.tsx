import { redirect } from "next/navigation";
import { requireDiagnosticConsoleViewer } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** 레거시 리포트 경로 → 기관→웨이브→리포트 표준 경로 */
export default async function AdminDiagnosticReportRedirectPage({ params }: Props) {
  await requireDiagnosticConsoleViewer("/admin/diagnostic");
  const { id } = await params;
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  });
  if (!wave) redirect("/admin/diagnostic");
  redirect(`/admin/organizations/${wave.organizationId}/waves/${wave.id}/report`);
}

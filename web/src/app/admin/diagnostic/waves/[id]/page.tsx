import { redirect } from "next/navigation";
import { requireDiagnosticConsoleViewer } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 레거시 CMS 경로 → 기관→웨이브 표준 경로로 리다이렉트 */
export default async function AdminDiagnosticWaveRedirectPage({ params, searchParams }: Props) {
  await requireDiagnosticConsoleViewer("/admin/diagnostic");
  const { id } = await params;
  const sp = await searchParams;
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  });
  if (!wave) redirect("/admin/diagnostic");
  const q = sp.created === "1" ? "?created=1" : "";
  redirect(`/admin/organizations/${wave.organizationId}/waves/${wave.id}${q}`);
}

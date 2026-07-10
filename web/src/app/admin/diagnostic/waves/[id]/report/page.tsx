import { requireSuperadmin } from "@/lib/auth/guards";
import { AdminDiagnosticReport } from "@/components/admin/AdminDiagnosticReport";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDiagnosticReportPage({ params }: Props) {
  await requireSuperadmin("/admin/diagnostic");
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <AdminDiagnosticReport waveId={id} />
    </div>
  );
}

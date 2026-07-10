import { requireSuperadmin } from "@/lib/auth/guards";
import { AdminDiagnosticReport } from "@/components/admin/AdminDiagnosticReport";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDiagnosticReportPage({ params }: Props) {
  await requireSuperadmin("/admin/diagnostic");
  const { id } = await params;
  return (
    <div className={ADMIN_CONTAINER.detail}>
      <AdminDiagnosticReport waveId={id} />
    </div>
  );
}

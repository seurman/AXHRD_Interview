import { Suspense } from "react";
import { requireDiagnosticConsoleViewer } from "@/lib/auth/guards";
import { AdminDiagnosticWaveDetail } from "@/components/admin/AdminDiagnosticWaveDetail";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDiagnosticWavePage({ params }: Props) {
  await requireDiagnosticConsoleViewer("/admin/diagnostic");
  const { id } = await params;
  return (
    <div className={ADMIN_CONTAINER.detail}>
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <AdminDiagnosticWaveDetail waveId={id} />
      </Suspense>
    </div>
  );
}

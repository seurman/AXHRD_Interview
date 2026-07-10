import { Suspense } from "react";
import { requireSuperadmin } from "@/lib/auth/guards";
import { AdminDiagnosticWaveDetail } from "@/components/admin/AdminDiagnosticWaveDetail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDiagnosticWavePage({ params }: Props) {
  await requireSuperadmin("/admin/diagnostic");
  const { id } = await params;
  return (
    <div className="px-4 pt-6">
      <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
        <AdminDiagnosticWaveDetail waveId={id} />
      </Suspense>
    </div>
  );
}

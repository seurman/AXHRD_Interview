import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminAuditPanel } from "@/components/admin/AdminAuditPanel";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireSuperadmin("/admin/audit");

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Superadmin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">ADMIN 감사 로그 · 롤백</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          플랫폼 ADMIN(및 레거시 콘텐츠 관리자)의 CMS·권한 변경 기록입니다.
          SUPERADMIN만 롤백할 수 있으며, beforeState 기준으로 복원됩니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/users" className="text-accent hover:underline">
            ADMIN 권한 부여 →
          </Link>
          <Link href="/admin/content" className="text-accent hover:underline">
            문항 뱅크 →
          </Link>
        </div>
      </div>

      <div className="card-luxe p-6">
        <AdminAuditPanel
          initialLogs={logs.map((l) => ({
            id: l.id,
            actorEmail: l.actorEmail,
            actorRole: l.actorRole,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            summary: l.summary,
            rolledBackAt: l.rolledBackAt?.toISOString() ?? null,
            createdAt: l.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}

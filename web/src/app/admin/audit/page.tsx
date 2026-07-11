import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminAuditPanel } from "@/components/admin/AdminAuditPanel";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireSuperadmin("/admin/audit");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.adminAuditLog.count(),
  ]);

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="ADMIN 감사 로그 · 롤백"
        subtitle="플랫폼 ADMIN(및 레거시 콘텐츠 관리자)의 CMS·권한 변경 기록입니다. SUPERADMIN만 롤백할 수 있으며, beforeState 기준으로 복원됩니다."
        links={[
          { href: "/admin/users", label: "ADMIN 권한 부여 →" },
          { href: "/admin/sessions", label: "면접 세션 로그 →" },
          { href: "/admin/content", label: "문항 뱅크 →" },
        ]}
      />

      <AdminSection
        title={`감사 로그 (총 ${total}건)`}
        description="행별 롤백은 beforeState 기준 복원입니다. SUPERADMIN만 실행 가능합니다."
      >
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
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/audit" />
      </AdminSection>
    </div>
  );
}

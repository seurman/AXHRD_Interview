import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOrganizationsViewer, hasSuperadminAccess } from "@/lib/auth/guards";
import { isBusinessAdminUser } from "@/lib/auth/platform-ops";
import { prisma } from "@/lib/prisma";
import { OrgKitStudioEditor } from "@/components/admin/OrgKitStudioEditor";
import { KitShareManager } from "@/components/org/KitShareManager";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgInterviewKitPage({ params }: Props) {
  const user = await requireOrganizationsViewer("/admin/organizations");
  const readOnlyConsole = isBusinessAdminUser(user) && !hasSuperadminAccess(user);
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const hubBase = `/admin/organizations/${org.id}`;

  return (
    <div className={ADMIN_CONTAINER.editor}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.tenants}
        title={org.name}
        subtitle="플랫폼 문항 뱅크를 기반으로 기관 면접 킷을 조립합니다. 역량 선택 · 문항 매핑 · 루브릭 조정 후 공유 링크로 실행할 수 있습니다. 슈퍼어드민 · 기관 ADMIN과 동일한 킷 스튜디오입니다."
        breadcrumb={[
          { label: "기관 관리", href: "/admin/organizations" },
          { label: org.name, href: hubBase },
          { label: "인터뷰 킷" },
        ]}
        actions={
          <Link href={hubBase} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            기관 허브
          </Link>
        }
      />

      {readOnlyConsole && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-muted">
          조회 전용 모드 — 킷 저장·공유 링크 발급은 슈퍼어드민만 가능합니다.
        </p>
      )}

      <OrgKitStudioEditor
        organizationId={org.id}
        backHref={hubBase}
        backLabel="기관 허브로"
      />

      <KitShareManager organizationId={org.id} />
    </div>
  );
}

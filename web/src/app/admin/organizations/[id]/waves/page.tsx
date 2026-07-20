import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizationsViewer } from "@/lib/auth/guards";
import { getOrgHubSnapshot } from "@/lib/org/hub-data";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminOrgWavesPanel } from "@/components/admin/AdminOrgWavesPanel";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { waveStatusLabel } from "@/lib/diagnostic/wave-status";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrgWavesPage({ params }: Props) {
  await requireOrganizationsViewer("/admin/organizations");
  const { id } = await params;
  const hub = await getOrgHubSnapshot(id);
  if (!hub) notFound();

  const hubBase = `/admin/organizations/${hub.id}`;

  const waves = await prisma.diagnosticWave.findMany({
    where: { organizationId: hub.id },
    include: {
      instrument: { select: { nameKo: true } },
      _count: {
        select: {
          responses: { where: { submittedAt: { not: null } } },
          teams: { where: { level: "TEAM" } },
        },
      },
    },
    orderBy: { waveNumber: "desc" },
  });

  const waveRows = waves.map((w) => {
    const enabled = parseEnabledSectionCodes(w.enabledSectionCodes);
    return {
      id: w.id,
      waveNumber: w.waveNumber,
      label: w.label,
      statusLabel: waveStatusLabel(w.status),
      sectionBadge: sectionBadgeLabel(enabled),
      instrumentName: w.instrument.nameKo,
      opensAt: w.opensAt?.toISOString() ?? null,
      closesAt: w.closesAt?.toISOString() ?? null,
      teamCount: w._count.teams,
      responseCount: w._count.responses,
    };
  });

  return (
    <div className={ADMIN_CONTAINER.detail}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.tenants}
        title="조직진단 웨이브"
        subtitle="기관 → 웨이브 → 사업부·팀 구조. 참여 현황·인터뷰 킷과 같은 기관 허브 진입 패턴입니다."
        breadcrumb={[
          { label: "기관 관리", href: "/admin/organizations" },
          { label: hub.name, href: hubBase },
          { label: "조직진단" },
        ]}
        actions={
          <Link href={hubBase} className="btn-secondary px-4 py-2 text-sm">
            기관 허브
          </Link>
        }
      />

      <AdminOrgWavesPanel
        organizationId={hub.id}
        organizationName={hub.name}
        waves={waveRows}
        diagnosticEnabled={hub.entitlements.diagnostic}
      />
    </div>
  );
}

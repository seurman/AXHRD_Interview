import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { OrgCreatePanel } from "@/components/admin/OrgCreatePanel";
import { OrgDiagnosticToggle } from "@/components/admin/OrgDiagnosticToggle";
import { OrgKindBadge } from "@/components/admin/OrgKindBadge";
import { OrgReviewActions } from "@/components/admin/OrgReviewActions";
import { OrgStatusBadge } from "@/components/admin/OrgStatusBadge";
import { Badge } from "@/components/admin/Badge";
import { AdminSection } from "@/components/admin/AdminSection";
import { StatusDot } from "@/components/admin/StatusDot";
import {
  getOrgContractStatus,
  resolveOrgSeatCap,
} from "@/lib/org/contract";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  await requireSuperadmin("/admin/organizations");

  const orgs = await prisma.organization.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      members: {
        where: { orgRole: "ADMIN" },
        select: { name: true, email: true },
        take: 1,
      },
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        select: { planTier: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
      _count: { select: { members: true, interviewKits: true } },
    },
  });

  const pending = orgs.filter((o) => o.status === "PENDING");
  const active = orgs.filter((o) => o.status === "APPROVED");
  const inactive = orgs.filter((o) => o.status === "REJECTED");

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.tenants}
        title="기관"
        subtitle="테넌트 생성·승인·유형(취업센터/인사팀)·이용 기간·플랜·권한을 한곳에서 관리합니다."
        links={[{ href: "/admin/organizations/benchmark", label: "기관 비교 →" }]}
      />
      <OrgCreatePanel />

      {pending.length > 0 && (
        <AdminSection
          id="pending"
          title="승인 대기"
          description="신규 기관 등록 요청 — 승인 또는 반려 후 허브에서 계약을 설정합니다."
          actions={<Badge tone="warning">{pending.length}건</Badge>}
        >
          <div className="space-y-3">
            {pending.map((org) => {
              const admin = org.members[0];
              return (
                <div
                  key={org.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-50/30 p-4 dark:bg-amber-950/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="font-semibold text-foreground hover:text-accent"
                      >
                        {org.name}
                      </Link>
                      <OrgStatusBadge status={org.status} />
                      <OrgKindBadge kind={org.kind} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {admin ? `${admin.name} · ${admin.email}` : "요청자 미상"} ·{" "}
                      <span className="font-mono">{org.joinCode}</span>
                    </p>
                  </div>
                  <OrgReviewActions orgId={org.id} />
                </div>
              );
            })}
          </div>
        </AdminSection>
      )}

      <AdminSection
        id="active"
        title={`운영 중인 기관 (${active.length})`}
        description="행을 클릭해 허브로 이동합니다. 조직진단 SKU는 목록 하단 토글 또는 허브에서 설정합니다."
      >
        {active.length === 0 ? (
          <p className="text-sm text-muted">승인된 기관이 없습니다.</p>
        ) : (
          <ul className="-mx-6 -mb-4 border-t border-card-border">
            {active.map((org) => {
              const seatCap = resolveOrgSeatCap(org, org.subscriptions[0]);
              const contractStatus = getOrgContractStatus(org);
              return (
                <li key={org.id} className="border-b border-card-border last:border-0">
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="block px-6 py-3 transition hover:bg-background/60"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="min-w-[10rem] flex-1 font-medium text-foreground">
                        {org.name}
                      </span>
                      <OrgKindBadge kind={org.kind} />
                      {org.diagnosticEnabled && (
                        <Badge tone="accent" className="text-[10px]">
                          진단
                        </Badge>
                      )}
                      {org.saasPersonalizationEnabled && (
                        <Badge tone="gold" className="text-[10px]">
                          맞춤
                        </Badge>
                      )}
                      <span className="text-xs text-muted">
                        {org._count.members}명{seatCap != null ? ` / ${seatCap}` : ""}
                      </span>
                      <span className="text-xs text-muted">킷 {org._count.interviewKits}</span>
                      <span className="font-mono text-xs text-muted">{org.joinCode}</span>
                      {contractStatus === "expired" && (
                        <StatusDot tone="danger">만료</StatusDot>
                      )}
                      {seatCap != null && org._count.members >= seatCap && (
                        <StatusDot tone="warning">좌석 초과</StatusDot>
                      )}
                      <span className="ml-auto text-xs text-accent">허브 →</span>
                    </div>
                  </Link>
                  <div className="border-t border-card-border/60 px-6 py-2">
                    <OrgDiagnosticToggle
                      organizationId={org.id}
                      organizationName={org.name}
                      enabled={org.diagnosticEnabled}
                      compact
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted">반려됨 ({inactive.length})</h2>
          <div className="space-y-2">
            {inactive.map((org) => (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="flex items-center justify-between rounded-xl border border-card-border px-4 py-3 text-sm opacity-70 transition hover:opacity-100"
              >
                <span>{org.name}</span>
                <OrgStatusBadge status={org.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

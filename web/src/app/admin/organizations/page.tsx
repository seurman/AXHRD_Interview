import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { OrgCreatePanel } from "@/components/admin/OrgCreatePanel";
import { OrgReviewActions } from "@/components/admin/OrgReviewActions";
import { OrgStatusBadge } from "@/components/admin/OrgStatusBadge";
import {
  formatOrgPeriod,
  getOrgContractStatus,
  resolveOrgSeatCap,
} from "@/lib/org/contract";
import {
  Building2,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Users,
} from "lucide-react";

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
    <div className="mx-auto max-w-5xl space-y-10 pb-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin · Tenants</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">기관 관리</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          테넌트 생성·승인·가입 코드·이용 기간·좌석 상한을 한곳에서 관리합니다.
        </p>
        <div className="mt-5">
          <OrgCreatePanel />
        </div>
      </header>

      {pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-xs text-amber-700">
              {pending.length}
            </span>
            승인 대기
          </h2>
          <div className="space-y-3">
            {pending.map((org) => {
              const admin = org.members[0];
              return (
                <div
                  key={org.id}
                  className="card-luxe flex flex-wrap items-center justify-between gap-4 border-amber-500/20 p-5"
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
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-semibold text-foreground">운영 중인 기관 ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">승인된 기관이 없습니다.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((org) => {
              const seatCap = resolveOrgSeatCap(org, org.subscriptions[0]);
              const contractStatus = getOrgContractStatus(org);
              return (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="group card-luxe block p-5 transition hover:border-gold/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f172a] text-gold">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-gold" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground group-hover:text-accent">
                  {org.name}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <OrgStatusBadge status={org.status} />
                  {org.saasPersonalizationEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                      <Sparkles className="h-3 w-3" />
                      맞춤 설정 ON
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {org._count.members}명
                    {seatCap != null ? ` / ${seatCap}` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {formatOrgPeriod(org.validFrom, org.validUntil)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    킷 {org._count.interviewKits}
                  </span>
                  <span className="font-mono">{org.joinCode}</span>
                </div>
                {contractStatus === "expired" && (
                  <p className="mt-2 text-xs font-medium text-danger">이용 기간 만료</p>
                )}
                {seatCap != null && org._count.members >= seatCap && (
                  <p className="mt-2 text-xs font-medium text-amber-700">좌석 상한 도달</p>
                )}
              </Link>
            );
            })}
          </div>
        )}
      </section>

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

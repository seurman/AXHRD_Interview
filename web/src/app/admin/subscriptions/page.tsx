import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminSubscriptionEditor } from "@/components/admin/AdminSubscriptionEditor";
import { planLabel } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  await requireSuperadmin("/admin/subscriptions");

  const [subscriptions, organizations] = await Promise.all([
    prisma.subscription.findMany({
      where: { organizationId: { not: null } },
      include: { organization: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.organization.findMany({
      where: { status: "APPROVED" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Superadmin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">기관 구독 · Enterprise 수동 계약</h1>
        <p className="mt-1 text-sm text-muted">
          ORG_ENTERPRISE는 토스페이먼츠 자동결제 없이 세금계산서·계좌이체 계약 후
          SUPERADMIN이 기간을 직접 부여합니다.
        </p>
        <Link href="/admin/users" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← 사용자 관리
        </Link>
      </div>

      <div className="card-luxe p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">수동 구독 등록</h2>
        <AdminSubscriptionEditor organizations={organizations} />
      </div>

      <div className="card-luxe p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">기관 구독 목록</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted">등록된 기관 구독이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-3">기관</th>
                  <th className="py-2 pr-3">플랜</th>
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3">종료일</th>
                  <th className="py-2 pr-3">결제</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-3">{s.organization?.name ?? "—"}</td>
                    <td className="py-2 pr-3">{planLabel(s.planTier)}</td>
                    <td className="py-2 pr-3 text-muted">{s.status}</td>
                    <td className="py-2 pr-3 text-xs text-muted">
                      {s.currentPeriodEnd.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted">
                      {s.billingKey ? "토스 자동" : "수동 계약"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

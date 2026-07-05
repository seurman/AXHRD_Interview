import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { OrgReviewActions } from "@/components/admin/OrgReviewActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
};

export default async function AdminOrganizationsPage() {
  await requireSuperadmin("/admin/organizations");

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        where: { orgRole: "ADMIN" },
        select: { name: true, email: true },
        take: 1,
      },
    },
  });

  const pending = orgs.filter((o) => o.status === "PENDING");
  const decided = orgs.filter((o) => o.status !== "PENDING");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">기관 생성 승인 관리</h1>
        <p className="mt-1 text-sm text-muted">
          신규 기관은 승인 전까지 가입 코드로 학생을 받을 수 없고 코호트 대시보드도
          열리지 않습니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4">
          <Link
            href="/admin/organizations/benchmark"
            className="inline-block text-sm text-accent hover:underline"
          >
            기관 간 퍼포먼스 비교 보기 →
          </Link>
          <Link href="/admin/users" className="inline-block text-sm text-accent hover:underline">
            전체 사용자 · 권한 관리 →
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">
          승인 대기 중 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">대기 중인 요청이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((org) => {
              const admin = org.members[0];
              return (
                <div
                  key={org.id}
                  className="card-luxe flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-medium text-foreground">{org.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      요청자: {admin ? `${admin.name} (${admin.email})` : "알 수 없음"} · 가입
                      코드 <span className="font-mono">{org.joinCode}</span> ·{" "}
                      {org.createdAt.toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <OrgReviewActions orgId={org.id} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-foreground">처리 완료</h2>
        {decided.length === 0 ? (
          <p className="text-sm text-muted">아직 처리된 요청이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">기관명</th>
                  <th className="py-2 pr-4 font-medium">요청자</th>
                  <th className="py-2 pr-4 font-medium">상태</th>
                  <th className="py-2 pr-4 font-medium">처리일</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((org) => {
                  const admin = org.members[0];
                  const decidedAt = org.approvedAt ?? org.rejectedAt ?? org.createdAt;
                  return (
                    <tr key={org.id} className="border-b border-card-border last:border-0">
                      <td className="py-2 pr-4 text-foreground">{org.name}</td>
                      <td className="py-2 pr-4 text-muted">
                        {admin ? `${admin.name} (${admin.email})` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted">{STATUS_LABEL[org.status]}</td>
                      <td className="py-2 pr-4 text-muted">
                        {decidedAt.toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

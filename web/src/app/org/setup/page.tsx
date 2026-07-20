import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { OrgSetupForm } from "@/components/org/OrgSetupForm";
import { getPendingRequestForUser } from "@/lib/org/membership";

export const dynamic = "force-dynamic";

export default async function OrgSetupPage() {
  const user = await requirePageUser("/org/setup");

  if (user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, status: true },
    });

    const isStaff = user.orgRole === "ADMIN" || user.orgRole === "STAFF";

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-foreground">기관 연결</h1>
        <div className="card-luxe p-6">
          <p className="text-foreground">
            이미 <span className="font-semibold">{org?.name ?? "알 수 없는 기관"}</span>에
            소속되어 있습니다.
          </p>
          {isStaff && org?.status === "PENDING" && (
            <p className="mt-2 text-sm text-muted">
              기관 생성 요청이 승인 대기 중입니다. 승인 후 멤버·승인 메뉴를 이용할 수 있습니다.
            </p>
          )}
          {isStaff && org?.status === "REJECTED" && (
            <p className="mt-2 text-sm text-muted">
              기관 생성 요청이 승인되지 않았습니다. 문의사항이 있으시면 운영팀에 연락해 주세요.
            </p>
          )}
          {isStaff && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/org/members" className="btn-primary inline-block">
                멤버 · 승인 →
              </Link>
              <Link href="/org/dashboard" className="btn-secondary inline-block">
                코호트 대시보드
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const pending = await getPendingRequestForUser(user.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">기관 연결</h1>
        <p className="mt-2 text-sm text-muted">
          회원가입 후 소속 기관을 선택하세요. 담당자 승인이 끝나면 좌석이 배정되어 인별 과금
          대상이 됩니다.
        </p>
      </div>
      <OrgSetupForm
        initialPending={
          pending
            ? {
                id: pending.id,
                organization: pending.organization,
                createdAt: pending.createdAt.toISOString(),
                message: pending.message,
              }
            : null
        }
      />
    </div>
  );
}

import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { OrgSetupForm } from "@/components/org/OrgSetupForm";

export const dynamic = "force-dynamic";

export default async function OrgSetupPage() {
  const user = await requirePageUser("/org/setup");

  if (user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-foreground">기관 연결</h1>
        <div className="card-luxe p-6">
          <p className="text-foreground">
            이미 <span className="font-semibold">{org?.name ?? "알 수 없는 기관"}</span>에
            소속되어 있습니다.
          </p>
          {(user.orgRole === "ADMIN" || user.orgRole === "STAFF") && (
            <Link href="/org/dashboard" className="btn-primary mt-4 inline-block">
              코호트 대시보드 보기 →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">기관 연결</h1>
        <p className="mt-2 text-sm text-muted">
          대학 취업센터 등 소속 기관이 있으신가요? 학생이라면 코드로 가입하시고,
          담당자시라면 기관을 새로 만들어 코호트 현황을 확인하세요.
        </p>
      </div>
      <OrgSetupForm />
    </div>
  );
}

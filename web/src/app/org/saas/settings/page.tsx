import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { canUseInterviewKitBuilder } from "@/lib/org/interview-kit";

export const dynamic = "force-dynamic";

export default async function OrgSaasSettingsPage() {
  const user = await requirePageUser("/org/saas/settings");
  const access = await canUseInterviewKitBuilder(user);

  const items = access.allowed
    ? [
        {
          href: "/org/saas/settings/interview-kit",
          title: "인터뷰 킷 빌더",
          description:
            "관리자 문항 뱅크와 동일한 문항·루브릭 데이터로 역량별 킷을 구성합니다.",
          icon: ClipboardList,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">SaaS · Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">기관 설정</h1>
        <p className="mt-2 text-sm text-muted">
          B2B 기능 — 소속 학생 면접 경험을 기관 정책에 맞게 조정합니다.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card-luxe p-6 text-sm text-muted">
          {!access.allowed && access.reason === "not_admin"
            ? "기관 ADMIN 또는 플랫폼 ADMIN(문항 관리) 권한이 필요합니다."
            : "연결된 기관이 없습니다. 프로필에서 기관을 연결하거나 기관을 생성해 주세요."}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="card-luxe flex items-center gap-4 p-5 transition hover:border-gold/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <item.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted">
        <Link href="/org/dashboard" className="text-accent hover:underline">
          코호트 대시보드로 돌아가기
        </Link>
      </p>
    </div>
  );
}

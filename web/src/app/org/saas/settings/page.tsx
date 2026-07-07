import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { requireOrgStaff } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function OrgSaasSettingsPage() {
  const user = await requireOrgStaff("/org/saas/settings");
  const isAdmin = user.orgRole === "ADMIN";

  const items = isAdmin
    ? [
        {
          href: "/org/saas/settings/interview-kit",
          title: "인터뷰 킷 빌더",
          description:
            "플랫폼 문항 뱅크에서 역량별 문항 선택·순서·루브릭 강조점을 기관 맞춤으로 설정합니다.",
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
          설정 메뉴는 기관 관리자(ADMIN)만 이용할 수 있습니다.
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

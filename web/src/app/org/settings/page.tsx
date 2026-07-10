import Link from "next/link";
import { ChevronRight, ClipboardList, BarChart3, Layers } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { resolveInterviewKitAccess } from "@/lib/org/interview-kit";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage() {
  const user = await requirePageUser("/org/settings");
  const access = await resolveInterviewKitAccess(user);

  const items = access.allowed
    ? [
        {
          href: "/org/settings/interview-kit",
          title: "인터뷰 킷",
          description: "역량·문항·L1~L5 루브릭을 기관에 맞게 구성합니다.",
          icon: ClipboardList,
        },
        {
          href: "/org/settings/competencies",
          title: "역량 관리",
          description: "기본 역량 복제·기관 맞춤 역량·문항 작성.",
          icon: Layers,
        },
      ]
    : [];

  const blockedMessage = !access.allowed
    ? access.reason === "not_admin"
      ? "기관 ADMIN 권한이 필요합니다."
      : access.reason === "not_enabled"
        ? "면접 맞춤 설정이 아직 활성화되지 않았습니다. 플랫폼 운영자에게 문의하세요."
        : "연결된 기관이 없습니다."
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">
          {access.allowed ? access.organizationName : "기관"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">면접 설정</h1>
        <p className="mt-2 text-sm text-muted">
          소속 학생의 AI 모의 면접 경험을 기관 정책에 맞게 조정합니다.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card-luxe p-6 text-sm text-muted">{blockedMessage}</div>
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
        <Link href="/org/dashboard" className="inline-flex items-center gap-1 text-accent hover:underline">
          <BarChart3 className="h-3.5 w-3.5" />
          코호트 대시보드
        </Link>
      </p>
    </div>
  );
}

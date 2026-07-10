import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/admin/Badge";
import { formatRelativeTime } from "@/lib/admin/relative-time";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import type { PlatformHomeSnapshot } from "@/lib/admin/platform-home-data";
import {
  Activity,
  Building2,
  ClipboardList,
  FileSearch,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

const QUICK_MODULES = [
  {
    href: "/admin/organizations",
    label: "기관 관리",
    desc: "승인·계약·SKU",
    icon: Building2,
  },
  {
    href: "/admin/users",
    label: "사용자 권한",
    desc: "역할·리뷰 플래그",
    icon: Users,
  },
  {
    href: "/admin/content",
    label: "문항 뱅크",
    desc: "IRT·역량 풀",
    icon: ClipboardList,
  },
  {
    href: "/admin/diagnostic",
    label: "조직진단 CMS",
    desc: "캠페인·리포트",
    icon: Activity,
  },
  {
    href: "/admin/sessions",
    label: "면접 세션",
    desc: "실행 로그",
    icon: FileSearch,
  },
  {
    href: "/admin/subscriptions",
    label: "구독 관리",
    desc: "플랜·결제",
    icon: Wallet,
  },
] as const;

function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone?: "warning" | "accent" | "neutral";
}) {
  return (
    <Link href={href} className="card-luxe block p-5 transition hover:border-accent/30">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {tone === "warning" && value > 0 && (
        <Badge tone="warning" className="mt-2">
          조치 필요
        </Badge>
      )}
    </Link>
  );
}

export function PlatformHomeDashboard({ snapshot }: { snapshot: PlatformHomeSnapshot }) {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.home}
        title="Platform Console"
        subtitle="기관·사용자·권한·콘텐츠·조직진단을 한곳에서 운영합니다. 아래 지표는 실시간 DB 집계입니다."
        links={[
          { href: "/admin/permissions", label: "권한 매트릭스 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="승인 대기 기관"
          value={snapshot.pendingOrgs}
          href="/admin/organizations"
          tone="warning"
        />
        <StatCard label="운영 중 기관" value={snapshot.approvedOrgs} href="/admin/organizations" />
        <StatCard
          label="진행 중 진단"
          value={snapshot.openDiagnosticWaves}
          href="/admin/diagnostic"
        />
        <StatCard label="오늘 면접 세션" value={snapshot.sessionsToday} href="/admin/sessions" />
        <StatCard
          label="가입 리뷰 플래그"
          value={snapshot.reviewFlagUsers}
          href="/admin/users?flag=review"
          tone="warning"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-luxe p-6">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Shield className="h-4 w-4 text-gold" />
            최근 감사 로그
          </h2>
          {snapshot.recentAudit.length === 0 ? (
            <p className="mt-4 text-sm text-muted">아직 기록이 없습니다.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {snapshot.recentAudit.map((log) => (
                <li key={log.id} className="border-b border-card-border pb-3 text-sm last:border-0">
                  <p className="font-medium text-foreground">{log.summary}</p>
                  <p className="mt-1 text-xs text-muted">
                    {log.actorEmail} · {formatRelativeTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/audit" className="mt-4 inline-block text-sm text-accent hover:underline">
            전체 감사 로그 →
          </Link>
        </section>

        <section className="card-luxe p-6">
          <h2 className="font-semibold text-foreground">모듈 바로가기</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="flex items-start gap-3 rounded-xl border border-card-border p-4 transition hover:border-accent/30 hover:bg-background/60"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{mod.label}</p>
                    <p className="text-xs text-muted">{mod.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

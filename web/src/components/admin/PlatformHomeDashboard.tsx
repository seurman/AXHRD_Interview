import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminTodoQueue } from "@/components/admin/AdminTodoQueue";
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
  { href: "/admin/organizations", label: "기관", desc: "승인·계약·SKU", icon: Building2 },
  { href: "/admin/users", label: "사용자", desc: "역할·리뷰 플래그", icon: Users },
  { href: "/admin/content", label: "IRT 문항", desc: "IRT·역량 풀", icon: ClipboardList },
  { href: "/admin/diagnostic", label: "진단 캠페인", desc: "캠페인·리포트", icon: Activity },
  { href: "/admin/sessions", label: "면접 세션", desc: "실행 로그", icon: FileSearch },
  { href: "/admin/subscriptions", label: "구독·결제", desc: "플랜·결제", icon: Wallet },
] as const;

function StatCard({
  label,
  value,
  href,
  urgent,
}: {
  label: string;
  value: number;
  href: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href} className="card-luxe block p-4 transition hover:border-accent/30">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {urgent && value > 0 && (
        <Badge tone="warning" className="mt-2">
          조치 필요
        </Badge>
      )}
    </Link>
  );
}

export function PlatformHomeDashboard({ snapshot }: { snapshot: PlatformHomeSnapshot }) {
  const urgentCount = snapshot.todos.length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.home}
        title="개요"
        subtitle="운영 할 일 → KPI → 모듈 순으로 확인하세요. 모든 숫자는 DB 실시간 집계입니다."
        links={[
          { href: "/admin/permissions", label: "권한 매트릭스 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
        ]}
      />

      <AdminSection
        id="todos"
        title="운영 할 일"
        description={
          urgentCount > 0
            ? `${urgentCount}건이 처리를 기다리고 있습니다.`
            : "승인 대기·가입 리뷰 등 긴급 항목이 여기에 표시됩니다."
        }
        actions={
          urgentCount > 0 ? (
            <Badge tone="warning">{urgentCount}건</Badge>
          ) : (
            <Badge tone="success">비어 있음</Badge>
          )
        }
      >
        <AdminTodoQueue items={snapshot.todos} />
      </AdminSection>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="승인 대기 기관"
          value={snapshot.pendingOrgs}
          href="/admin/organizations#pending"
          urgent
        />
        <StatCard label="운영 중 기관" value={snapshot.approvedOrgs} href="/admin/organizations#active" />
        <StatCard label="진행 중 진단" value={snapshot.openDiagnosticWaves} href="/admin/diagnostic" />
        <StatCard label="오늘 면접 세션" value={snapshot.sessionsToday} href="/admin/sessions" />
        <StatCard
          label="가입 리뷰 플래그"
          value={snapshot.reviewFlagUsers}
          href="/admin/users?flag=review"
          urgent
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title="최근 감사 로그" description="플랫폼 CMS·권한 변경 기록">
          {snapshot.recentAudit.length === 0 ? (
            <p className="text-sm text-muted">아직 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
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
        </AdminSection>

        <AdminSection title="모듈 바로가기" description="자주 쓰는 운영 화면">
          <div className="grid gap-2 sm:grid-cols-2">
            {QUICK_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="flex items-center gap-3 rounded-lg border border-card-border px-3 py-2.5 text-sm transition hover:border-accent/30 hover:bg-background/60"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{mod.label}</p>
                    <p className="truncate text-xs text-muted">{mod.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </AdminSection>
      </div>
    </div>
  );
}

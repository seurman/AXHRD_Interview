import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  KeyRound,
  Users,
  UserCog,
  ExternalLink,
} from "lucide-react";
import { requireSuperadmin } from "@/lib/auth/guards";
import { getOrgHubSnapshot } from "@/lib/org/hub-data";
import { OrgContractEditor } from "@/components/admin/OrgContractEditor";
import { OrgKindBadge } from "@/components/admin/OrgKindBadge";
import { OrgHubPersonalizationToggle } from "@/components/admin/OrgHubPersonalizationToggle";
import { OrgReviewActions } from "@/components/admin/OrgReviewActions";
import { OrgStatusBadge } from "@/components/admin/OrgStatusBadge";
import { planLabel } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "기관 관리자",
  STAFF: "담당자",
  STUDENT: "학생",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgHubPage({ params }: Props) {
  await requireSuperadmin("/admin/organizations");
  const { id } = await params;
  const hub = await getOrgHubSnapshot(id);
  if (!hub) notFound();

  const hubBase = `/admin/organizations/${hub.id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/organizations" className="inline-flex items-center gap-1 hover:text-accent">
          <ArrowLeft className="h-4 w-4" />
          기관 관리
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{hub.name}</span>
      </nav>

      <header className="overflow-hidden rounded-3xl border border-card-border bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-8 text-white shadow-luxe">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{hub.name}</h1>
              <OrgStatusBadge status={hub.status} />
              <OrgKindBadge kind={hub.kind} />
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/60">
              <KeyRound className="h-4 w-4 shrink-0" />
              가입 코드 <span className="font-mono text-gold">{hub.joinCode}</span>
            </p>
            <p className="mt-1 text-xs text-white/40">
              등록 {hub.createdAt.toLocaleDateString("ko-KR")}
              {hub.approvedAt && ` · 승인 ${hub.approvedAt.toLocaleDateString("ko-KR")}`}
              {hub.contractPeriodLabel !== "기간 제한 없음" && ` · ${hub.contractPeriodLabel}`}
              {hub.subscription && ` · ${planLabel(hub.subscription.planTier)}`}
            </p>
            {hub.seatCap != null && (
              <p className="mt-2 text-xs text-white/50">
                좌석 {hub.memberCount} / {hub.seatCap}
                {hub.memberCount >= hub.seatCap && (
                  <span className="ml-2 text-amber-300">상한 도달</span>
                )}
              </p>
            )}
          </div>
          {hub.status === "PENDING" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-sm text-white/80">신규 기관 승인</p>
              <OrgReviewActions orgId={hub.id} />
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "전체 멤버", value: hub.memberCount, icon: Users },
            { label: "학생", value: hub.studentCount, icon: Users },
            { label: "인터뷰 킷", value: `${hub.kitCount} 역량`, icon: ClipboardList },
            {
              label: "완료 면접",
              value: hub.cohort?.totalCompletedSessions ?? 0,
              icon: BarChart3,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-white/50">
                <stat.icon className="h-4 w-4" />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      <OrgContractEditor
        organizationId={hub.id}
        initial={{
          name: hub.name,
          kind: hub.kind,
          joinCode: hub.joinCode,
          status: hub.status,
          validFrom: hub.validFrom?.toISOString() ?? null,
          validUntil: hub.validUntil?.toISOString() ?? null,
          maxSeats: hub.maxSeats,
          adminNotes: hub.adminNotes,
          memberCount: hub.memberCount,
          seatCap: hub.seatCap,
        }}
      />

      {hub.status === "APPROVED" && (
        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href={`${hubBase}/cohort`}
            className="group rounded-2xl border border-card-border bg-card p-6 shadow-sm transition hover:border-accent/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <BarChart3 className="h-5 w-5" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
            </div>
            <h2 className="mt-4 font-semibold text-foreground">코호트 대시보드</h2>
            <p className="mt-1 text-sm text-muted">
              학생 면접 현황·역량 집계. 기관 ADMIN이 보는 화면과 동일합니다.
            </p>
            {hub.cohort?.overallAvgPercentile != null && (
              <p className="mt-3 text-xs text-gold">
                평균 백분위 {Math.round(hub.cohort.overallAvgPercentile)}
              </p>
            )}
          </Link>

          <Link
            href={`${hubBase}/interview-kit`}
            className="group rounded-2xl border border-card-border bg-card p-6 shadow-sm transition hover:border-gold/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <ClipboardList className="h-5 w-5" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
            </div>
            <h2 className="mt-4 font-semibold text-foreground">인터뷰 킷</h2>
            <p className="mt-1 text-sm text-muted">
              역량·문항·L1~L5 루브릭 맞춤. 플랫폼 문항 뱅크 기반입니다.
            </p>
            <p className="mt-3 text-xs text-muted">
              {hub.kitCount > 0 ? `${hub.kitCount}개 역량 설정됨` : "아직 설정 없음"}
            </p>
          </Link>
        </section>
      )}

      {hub.status === "APPROVED" && (
        <OrgHubPersonalizationToggle
          organizationId={hub.id}
          enabled={hub.personalizationEnabled}
          enabledAt={hub.personalizationEnabledAt?.toISOString() ?? null}
        />
      )}

      <section className="card-luxe overflow-hidden">
        <div className="flex items-center gap-2 border-b border-card-border px-6 py-4">
          <UserCog className="h-5 w-5 text-gold" />
          <h2 className="font-semibold text-foreground">팀 · 권한</h2>
        </div>
        {hub.members.length === 0 ? (
          <p className="p-6 text-sm text-muted">소속 멤버가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border bg-background/50 text-xs text-muted">
                  <th className="px-6 py-3 font-medium">이름</th>
                  <th className="px-6 py-3 font-medium">이메일</th>
                  <th className="px-6 py-3 font-medium">기관 역할</th>
                  <th className="px-6 py-3 font-medium">플랫폼</th>
                </tr>
              </thead>
              <tbody>
                {hub.members.map((m) => (
                  <tr key={m.id} className="border-b border-card-border last:border-0">
                    <td className="px-6 py-3 font-medium text-foreground">{m.name}</td>
                    <td className="px-6 py-3 text-muted">{m.email}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.orgRole === "ADMIN"
                            ? "bg-gold/15 text-gold"
                            : m.orgRole === "STAFF"
                              ? "bg-accent/10 text-accent"
                              : "bg-background text-muted"
                        }`}
                      >
                        {ROLE_LABEL[m.orgRole] ?? m.orgRole}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted">
                      {m.platformRole === "NONE" ? "—" : m.platformRole}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-card-border bg-background/30 px-6 py-3 text-xs text-muted">
          <Link href="/admin/users" className="text-accent hover:underline">
            사용자 권한에서 역할 변경 →
          </Link>
        </div>
      </section>
    </div>
  );
}

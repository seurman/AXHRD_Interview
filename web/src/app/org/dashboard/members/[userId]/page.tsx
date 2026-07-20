import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgStaff } from "@/lib/auth/guards";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { getCompetencyDashboardData } from "@/lib/dashboard/get-competency-dashboard-data";

export const dynamic = "force-dynamic";

export default async function OrgMemberDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const orgUser = await requireOrgStaff("/org/dashboard");
  const { userId } = await params;

  const member = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      organizationId: true,
      orgCoachingConsent: true,
    },
  });

  if (!member || member.organizationId !== orgUser.organizationId) {
    notFound();
  }

  if (!member.orgCoachingConsent) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/org/dashboard" className="text-sm text-accent hover:underline">
          ← 참여 현황
        </Link>
        <div className="card-luxe p-8 text-center text-muted">
          <p className="font-medium text-foreground">{member.name}</p>
          <p className="mt-3 text-sm">아직 상세 공유에 동의하지 않은 구성원입니다.</p>
        </div>
      </div>
    );
  }

  const dashboard = await getCompetencyDashboardData(member.id);
  if (!dashboard) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/org/dashboard" className="text-sm text-accent hover:underline">
          ← 참여 현황
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-gold">
          Coaching view · read-only
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{member.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {member.email} · 학생이 동의한 상세 역량 리포트입니다.
        </p>
      </div>

      {dashboard.hasDashboardContent ? (
        <CompetencyDashboard
          snapshots={dashboard.snapshots}
          latestByCompetency={dashboard.latestByCompetency}
          sessionCount={dashboard.sessionCount}
          dimensionTimeline={dashboard.dimensionTimeline}
          quests={dashboard.quests}
          totalXp={dashboard.totalXp}
          level={dashboard.level}
          strengthDeck={dashboard.strengthDeck}
          readOnly
        />
      ) : (
        <div className="card-luxe p-8 text-center text-muted">
          <p>아직 완료된 면접이나 자기발견 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

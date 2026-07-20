import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Activity,
} from "lucide-react";
import { requireOrganizationsViewer } from "@/lib/auth/guards";
import { getOrgHubSnapshot } from "@/lib/org/hub-data";
import { OrgContractEditor } from "@/components/admin/OrgContractEditor";
import { OrgKindBadge } from "@/components/admin/OrgKindBadge";
import { OrgEntitlementsPanel } from "@/components/admin/OrgEntitlementsPanel";
import { OrgProductBadges } from "@/components/admin/OrgProductBadges";
import { OrgReviewActions } from "@/components/admin/OrgReviewActions";
import { OrgStatusBadge } from "@/components/admin/OrgStatusBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminHubTile } from "@/components/admin/AdminHubTile";
import { AdminCopyField } from "@/components/admin/AdminCopyField";
import { Badge } from "@/components/admin/Badge";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { planLabel } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "기관 관리자",
  STAFF: "담당자",
  MEMBER: "구성원",
  STUDENT: "구성원",
};

const ROLE_BADGE: Record<string, "gold" | "accent" | "neutral"> = {
  ADMIN: "gold",
  STAFF: "accent",
  MEMBER: "neutral",
  STUDENT: "neutral",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgHubPage({ params }: Props) {
  await requireOrganizationsViewer("/admin/organizations");
  const { id } = await params;
  const hub = await getOrgHubSnapshot(id);
  if (!hub) notFound();

  const hubBase = `/admin/organizations/${hub.id}`;

  return (
    <div className={ADMIN_CONTAINER.detail}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.tenants}
        title={hub.name}
        breadcrumb={[
          { label: "기관 관리", href: "/admin/organizations" },
          { label: hub.name },
        ]}
        actions={
          hub.status === "PENDING" ? <OrgReviewActions orgId={hub.id} /> : undefined
        }
      />

      <div className="platform-panel overflow-hidden">
        <div className="platform-panel-body">
        <div className="flex flex-wrap items-center gap-2">
          <OrgStatusBadge status={hub.status} />
          <OrgKindBadge kind={hub.kind} />
          {hub.subscription && (
            <Badge tone="neutral">{planLabel(hub.subscription.planTier)}</Badge>
          )}
          <OrgProductBadges entitlements={hub.entitlements} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "전체 멤버", value: hub.memberCount },
            { label: "학생", value: hub.studentCount },
            { label: "인터뷰 킷 역량", value: hub.kitCount },
            { label: "완료 면접", value: hub.cohort?.totalCompletedSessions ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-card-border bg-background/50 px-4 py-3">
              <p className="text-xs text-muted">{s.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AdminCopyField label="가입 코드" value={hub.joinCode} />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">계약·등록</p>
            <p className="text-muted">
              등록 {hub.createdAt.toLocaleDateString("ko-KR")}
              {hub.approvedAt && ` · 승인 ${hub.approvedAt.toLocaleDateString("ko-KR")}`}
            </p>
            <p className="text-muted">{hub.contractPeriodLabel}</p>
            {hub.seatCap != null && (
              <p className="text-muted">
                좌석 {hub.memberCount} / {hub.seatCap}
                {hub.memberCount >= hub.seatCap && (
                  <span className="ml-1 text-warning">상한 도달</span>
                )}
              </p>
            )}
          </div>
        </div>
        </div>
      </div>

      {hub.status === "APPROVED" && !hub.entitlements.diagnostic && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/80 px-5 py-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <strong>조직진단 제품이 꺼져 있습니다.</strong> 아래 토글을 켜야 기관 ADMIN 메뉴에 조직진단이
          표시됩니다. 수퍼어드민은 기관 허브의 「조직진단 웨이브」또는{" "}
          <Link href="/admin/diagnostic" className="text-accent hover:underline">
            조직진단 CMS
          </Link>
          에서 웨이브를 만들 수 있습니다.
        </div>
      )}

      {hub.status === "APPROVED" && (
        <AdminSection
          title="제품 Entitlement"
          description="기관 1개에 면접·역량평가·조직진단 SKU를 독립적으로 켜고 끕니다."
        >
          <OrgEntitlementsPanel
            organizationId={hub.id}
            organizationName={hub.name}
            entitlements={hub.entitlements}
            competencyEnabledAt={hub.personalizationEnabledAt?.toISOString() ?? null}
          />
        </AdminSection>
      )}

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
          diagnosticPricing: hub.diagnosticPricing,
          requireMembershipApproval: hub.requireMembershipApproval,
        }}
      />

      {hub.status === "APPROVED" && (
        <AdminSection title="워크스페이스" description="기관 ADMIN이 보는 화면과 동일한 미리보기·편집 진입점">
          <div className="grid gap-4 md:grid-cols-2">
            {hub.entitlements.interview && (
              <AdminHubTile
                href={`${hubBase}/cohort`}
                title="코호트 대시보드"
                description="학생 면접 현황·역량 집계"
                meta={
                  hub.cohort?.overallAvgPercentile != null
                    ? `평균 백분위 ${Math.round(hub.cohort.overallAvgPercentile)}`
                    : undefined
                }
                icon={BarChart3}
              />
            )}
            {hub.entitlements.competency && (
              <AdminHubTile
                href={`${hubBase}/interview-kit`}
                title="인터뷰 킷"
                description="역량·문항·L1~L5 루브릭 조립"
                meta={hub.kitCount > 0 ? `${hub.kitCount}개 역량 설정됨` : "아직 설정 없음"}
                icon={ClipboardList}
              />
            )}
            {hub.entitlements.diagnostic && (
              <AdminHubTile
                href={`${hubBase}/waves`}
                title="조직진단 웨이브"
                description="기관 → 웨이브 → 사업부·팀 구조 · 응답 링크 · 리포트"
                meta="코호트·인터뷰 킷과 같은 기관 허브 진입"
                icon={Activity}
                className="md:col-span-2"
              />
            )}
          </div>
        </AdminSection>
      )}

      <AdminSection
        title="팀 · 권한"
        description="멤버 역할 확인 후 사용자 권한 화면에서 플랫폼 역할을 변경할 수 있습니다."
        actions={
          <Link href="/admin/users" className="text-sm text-accent hover:underline">
            사용자 권한 →
          </Link>
        }
      >
        {hub.members.length === 0 ? (
          <p className="text-sm text-muted">소속 멤버가 없습니다.</p>
        ) : (
          <ul className="-mx-6 -mb-4 border-t border-card-border">
            {hub.members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-card-border px-6 py-3 text-sm last:border-0"
              >
                <span className="min-w-[8rem] font-medium text-foreground">{m.name}</span>
                <span className="min-w-[12rem] flex-1 text-muted">{m.email}</span>
                <Badge tone={ROLE_BADGE[m.orgRole] ?? "neutral"}>
                  {ROLE_LABEL[m.orgRole] ?? m.orgRole}
                </Badge>
                <span className="text-xs text-muted">
                  {m.platformRole === "NONE" ? "플랫폼 —" : m.platformRole}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}

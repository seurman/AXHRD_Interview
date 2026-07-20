import { notFound } from "next/navigation";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getOrgMemberPeopleDetail } from "@/lib/org/people-dashboard";
import { OrgMemberPeopleDetailClient } from "@/components/org/OrgMemberPeopleDetailClient";

export const dynamic = "force-dynamic";

export default async function OrgPeopleMemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const staff = await requireOrgStaff("/org/people");
  const { userId } = await params;
  const detail = await getOrgMemberPeopleDetail(staff.organizationId, userId);
  if (!detail) notFound();

  const consentRequired = !detail.member.coachingConsent;
  const payload = consentRequired
    ? {
        ...detail,
        competencySeries: [],
        dimensionTimeline: [],
        scores: { ...detail.scores, latestByCompetency: [], avgPercentile: detail.scores.avgPercentile },
        consentRequired: true,
      }
    : { ...detail, consentRequired: false };

  // 동의 없을 때 세부 점수 목록은 가리되 평균은 집계로 유지 — 평균도 숨기려면 null
  if (consentRequired) {
    payload.scores = {
      avgPercentile: detail.scores.avgPercentile,
      latestByCompetency: [],
    };
  }

  return (
    <OrgMemberPeopleDetailClient
      initial={payload}
      canWriteFeedback={staff.orgRole === "ADMIN" || staff.orgRole === "STAFF"}
    />
  );
}

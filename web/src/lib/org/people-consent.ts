import type { OrgMemberDetailData } from "@/lib/org/people-dashboard";

/** 코칭 동의 없을 때 시계열·세부 점수를 가린 페이로드 */
export function redactPeopleDetailForConsent(
  detail: OrgMemberDetailData,
): OrgMemberDetailData & { consentRequired: boolean } {
  if (detail.member.coachingConsent) {
    return { ...detail, consentRequired: false };
  }
  return {
    ...detail,
    competencySeries: [],
    dimensionTimeline: [],
    scores: {
      avgPercentile: detail.scores.avgPercentile,
      latestByCompetency: [],
    },
    consentRequired: true,
  };
}

/** 조직 전체 링크 1개 + 리프(TEAM) 초대 링크 수 = 발급된 설문 진입점 수 */
export function countInviteLinks(leafTeamCount: number, includeOrgWide = true): number {
  return Math.max(0, leafTeamCount) + (includeOrgWide ? 1 : 0);
}

/**
 * 수집률(%) = 제출 응답 ÷ 초대 링크 발급 수.
 * 팀 공유 링크는 1개로 다수가 응답하므로 100%를 넘을 수 있다.
 */
export function computeCollectionRatePercent(
  submittedResponseCount: number,
  inviteLinkCount: number,
): number | null {
  if (inviteLinkCount <= 0) return null;
  return Math.round((submittedResponseCount / inviteLinkCount) * 100);
}

export function formatCollectionRateMeta(
  submittedResponseCount: number,
  inviteLinkCount: number | null | undefined,
  collectionRate: number | null,
): string | null {
  if (inviteLinkCount == null || inviteLinkCount <= 0 || collectionRate == null) return null;
  if (collectionRate <= 100) {
    return `수집률 ${collectionRate}% (초대 링크 ${inviteLinkCount}개)`;
  }
  const perLink = submittedResponseCount / inviteLinkCount;
  return `초대 링크 ${inviteLinkCount}개 · 응답 ${submittedResponseCount}명 (링크당 평균 ${perLink.toFixed(1)}명)`;
}

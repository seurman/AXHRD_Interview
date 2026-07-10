/**
 * Vercel Deployments 목록처럼 "N분 전" 형태의 짧은 상대 시각을 표시하기 위한 헬퍼.
 * 로그성 admin 목록(세션 로그, 감사 로그, 진단 웨이브 등)에서 공통으로 사용한다.
 */
export function formatRelativeTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "—";

  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "방금 전";
  if (diffSec < 60) return `${diffSec}초 전`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;

  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}개월 전`;

  const diffYear = Math.round(diffMonth / 12);
  return `${diffYear}년 전`;
}

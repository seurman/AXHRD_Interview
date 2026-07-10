/**
 * 관리자(admin) 화면 전역에서 공유하는 레이아웃 상수.
 *
 * 목적: 19개 admin/** 페이지가 각자 다른 max-w(4xl~7xl)와 spacing을 하드코딩해서
 * 화면마다 폭과 여백이 들쭉날쭉했던 문제를 하나의 소스로 고정한다.
 *
 * - DEFAULT: 대부분의 목록/폼 페이지(카드+표 중심)
 * - WIDE: 표 컬럼이 많아 더 넓은 폭이 필요한 페이지(세션 로그, 레포지토리 콘솔 등)
 * - DETAIL: 상세/허브 페이지(뒤로가기 버튼 포함 헤더와 함께 사용)
 * - EDITOR: 다단 에디터(킷 스튜디오, 데모 워크스페이스 편집 등) 넓은 작업 공간이 필요한 경우만
 *
 * 새 admin 페이지를 추가할 때는 이 상수와 AdminPageHeader를 우선 사용하고,
 * 정말 필요한 경우에만 예외를 둔다(예외를 두는 경우 이유를 주석으로 남길 것).
 */
export const ADMIN_CONTAINER = {
  default: "mx-auto max-w-5xl space-y-8 pb-12",
  wide: "mx-auto max-w-6xl space-y-8 pb-12",
  detail: "mx-auto max-w-5xl space-y-8 pb-12",
  editor: "mx-auto max-w-7xl space-y-6 pb-12",
} as const;

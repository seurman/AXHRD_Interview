/** 클라이언트 컴포넌트용 — 외부 패키지 의존 없음 */

export function competencyLabel(code: string): string {
  const map: Record<string, string> = {
    COMMUNICATION: "의사소통",
    PROBLEM_SOLVING: "문제해결",
    JOB_FIT: "직무전문성",
    ORG_FIT: "조직적합",
    LEADERSHIP: "리더십",
    GROWTH: "성장·학습",
  };
  return map[code] ?? code;
}

export function jobRoleLabel(role: string): string {
  const map: Record<string, string> = {
    MARKETING: "마케팅",
    DEVELOPMENT: "개발",
    BUSINESS_SUPPORT: "경영지원",
    SALES: "영업",
    DESIGN: "디자인",
    HR: "HR",
    FINANCE: "재무",
    OTHER: "기타",
  };
  return map[role] ?? role;
}

export function companySizeLabel(size: string): string {
  const map: Record<string, string> = {
    LARGE: "대기업",
    MID: "중견기업",
    SMALL: "중소기업",
    STARTUP: "스타트업",
    PUBLIC: "공기업/공사",
  };
  return map[size] ?? size;
}

export function formatPercentile(p: number): string {
  return `상위 ${Math.max(0, Math.min(100, 100 - p)).toFixed(0)}%`;
}

export function dimensionLabel(key: string): string {
  const map: Record<string, string> = {
    structure: "구조",
    specificity: "구체성",
    relevance: "관련성",
    clarity: "명확성",
  };
  return map[key] ?? key;
}

export function thetaToLevel(theta: number): number {
  if (theta <= -1.5) return 1;
  if (theta <= -0.5) return 2;
  if (theta <= 0.5) return 3;
  if (theta <= 1.5) return 4;
  return 5;
}

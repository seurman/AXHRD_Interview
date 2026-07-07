import { competencyLabel } from "@/lib/labels";
import type { JobRole } from "@prisma/client";

/** VIA 강점 → NCS 역량 기본 매핑 (리포트·카드·mock 공용) */
export const VIA_TO_COMPETENCY: Record<string, string> = {
  CREATIVITY: "PROBLEM_SOLVING",
  CURIOSITY: "GROWTH",
  JUDGMENT: "PROBLEM_SOLVING",
  LOVE_OF_LEARNING: "GROWTH",
  PERSPECTIVE: "COMMUNICATION",
  BRAVERY: "LEADERSHIP",
  PERSEVERANCE: "GROWTH",
  HONESTY: "ORG_FIT",
  ZEST: "LEADERSHIP",
  LOVE: "ORG_FIT",
  KINDNESS: "COMMUNICATION",
  SOCIAL_INTELLIGENCE: "COMMUNICATION",
  TEAMWORK: "ORG_FIT",
  FAIRNESS: "ORG_FIT",
  LEADERSHIP: "LEADERSHIP",
  FORGIVENESS: "ORG_FIT",
  HUMILITY: "COMMUNICATION",
  SELF_REGULATION: "JOB_FIT",
  PRUDENCE: "JOB_FIT",
  APPRECIATION_OF_BEAUTY: "JOB_FIT",
  GRATITUDE: "ORG_FIT",
  HOPE: "GROWTH",
  HUMOR: "COMMUNICATION",
  SPIRITUALITY: "ORG_FIT",
};

const JOB_TIP: Record<JobRole, string> = {
  MARKETING: "캠페인·브랜드 경험을 수치와 함께 말하면 설득력이 커집니다",
  DEVELOPMENT: "기술 선택의 이유와 트레이드오프를 설명하면 직무전문성이 드러납니다",
  BUSINESS_SUPPORT: "프로세스 개선 전후 비교를 들려주면 실행력이 보입니다",
  SALES: "고객 니즈 파악 → 제안 → 성과 순으로 말하면 설득 구조가 완성됩니다",
  DESIGN: "문제 정의 → 시안 → 피드백 반영 과정을 보여주면 창의성이 직무와 연결됩니다",
  HR: "이해관계 조율·갈등 해결 사례는 조직적합 역량의 핵심 소재입니다",
  FINANCE: "리스크 판단 근거와 숫자 검증 과정을 강조하면 신뢰감이 올라갑니다",
  OTHER: "본인이 맡은 역할의 기여도를 구체적 행동으로 풀어 설명하세요",
};

export function competencyForVia(viaCode: string) {
  return VIA_TO_COMPETENCY[viaCode] ?? "GROWTH";
}

export function jobInterviewTip(jobRole: JobRole) {
  return JOB_TIP[jobRole] ?? JOB_TIP.OTHER;
}

export function buildStrengthBridge(viaLabelKo: string, competencyCode: string) {
  const comp = competencyLabel(competencyCode);
  return `당신의 '${viaLabelKo}' 강점은 면접에서 '${comp}' 역량을 보여주는 핵심 소재가 됩니다.`;
}

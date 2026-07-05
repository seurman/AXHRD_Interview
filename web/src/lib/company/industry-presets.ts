/**
 * 산업군 기반 면접 스타일 프리셋 — 특정 회사명을 추측하는 휴리스틱보다
 * 사용자가 직접 고른 산업군을 신뢰하는 편이 훨씬 안정적이다.
 * (LG CNS처럼 이름만으로 산업을 못 맞히는 회사에서 질문이 안 뜨던 문제의 근본 해결책)
 */

import type { IndustryCode } from "@/types";
import type { CompanyContext } from "@/types";

type IndustryPreset = Omit<CompanyContext, "name">;

export const INDUSTRY_PRESETS: Record<IndustryCode, IndustryPreset> = {
  IT_SW: {
    industry: "IT/SW",
    size: "MID",
    interviewStyle: {
      tone: "실무·데이터 중심",
      rounds: ["실무 면접", "임원 면접"],
      focus: ["문제해결", "협업", "성장"],
    },
  },
  FINANCE: {
    industry: "금융",
    size: "LARGE",
    interviewStyle: {
      tone: "신중·리스크 관리 중심",
      rounds: ["실무 면접", "인성 면접", "임원 면접"],
      focus: ["직무전문성", "조직적합", "윤리"],
    },
  },
  MANUFACTURING: {
    industry: "제조",
    size: "LARGE",
    interviewStyle: {
      tone: "진중·현장 중심",
      rounds: ["실무 면접", "임원 면접"],
      focus: ["책임감", "현장 이해", "문제해결"],
    },
  },
  PUBLIC: {
    industry: "공기업/공공",
    size: "PUBLIC",
    interviewStyle: {
      tone: "공정성·직업윤리 중심 (NCS 직업기초능력)",
      rounds: ["NCS 직무능력", "인성/조직적합"],
      focus: ["의사소통", "문제해결", "조직적합"],
    },
  },
  OTHER: {
    industry: "일반",
    size: "MID",
    interviewStyle: {
      tone: "균형형 (인성+직무)",
      rounds: ["1차 실무", "2차 임원"],
      focus: ["의사소통", "문제해결", "조직적합"],
    },
  },
};

export function getIndustryPreset(code: IndustryCode): IndustryPreset {
  return INDUSTRY_PRESETS[code] ?? INDUSTRY_PRESETS.OTHER;
}

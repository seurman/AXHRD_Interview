/**
 * 산업군 기반 면접 스타일 보조 프리셋 — 기업 규모(company-size-presets)와 별개 축.
 * size는 더 이상 여기서 고정하지 않는다.
 */

import type { IndustryCode } from "@/types";
import type { CompanyContext } from "@/types";

type IndustryPreset = {
  industry: string;
  interviewStyle: CompanyContext["interviewStyle"];
};

export const INDUSTRY_PRESETS: Record<IndustryCode, IndustryPreset> = {
  IT_SW: {
    industry: "IT/SW",
    interviewStyle: {
      tone: "실무·데이터 중심",
      rounds: ["실무 면접", "임원 면접"],
      focus: ["문제해결", "협업", "성장"],
    },
  },
  FINANCE: {
    industry: "금융",
    interviewStyle: {
      tone: "신중·리스크 관리 중심",
      rounds: ["실무 면접", "인성 면접", "임원 면접"],
      focus: ["직무전문성", "조직적합", "윤리"],
    },
  },
  MANUFACTURING: {
    industry: "제조",
    interviewStyle: {
      tone: "진중·현장 중심",
      rounds: ["실무 면접", "임원 면접"],
      focus: ["책임감", "현장 이해", "문제해결"],
    },
  },
  PUBLIC: {
    industry: "공기업/공공",
    interviewStyle: {
      tone: "공정성·직업윤리 중심 (NCS 직업기초능력)",
      rounds: ["NCS 직무능력", "인성/조직적합"],
      focus: ["의사소통", "문제해결", "조직적합"],
    },
  },
  OTHER: {
    industry: "일반",
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

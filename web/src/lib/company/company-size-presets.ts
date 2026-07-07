/**
 * 기업 규모별 면접 톤·라운드·중점 역량 — 산업군과 독립적인 축.
 * resolveCompanyContext()에서 industry-presets보다 우선 가중치를 둔다.
 */

import type { CompanyContext } from "@/types";

export type CompanySizeCode = CompanyContext["size"];

export const COMPANY_SIZE_CODES: CompanySizeCode[] = [
  "LARGE",
  "MID",
  "SMALL",
  "STARTUP",
  "PUBLIC",
];

type SizePreset = {
  interviewStyle: CompanyContext["interviewStyle"];
};

export const COMPANY_SIZE_PRESETS: Record<CompanySizeCode, SizePreset> = {
  LARGE: {
    interviewStyle: {
      tone: "다단계·구조적 평가 (실무→인적성/필기→임원)",
      rounds: ["1차 실무 면접", "인적성·필기", "임원 면접"],
      focus: ["조직적합", "리더십", "직무전문성", "윤리"],
    },
  },
  MID: {
    interviewStyle: {
      tone: "즉시 실무 투입 가능한 인재 평가",
      rounds: ["실무 면접", "임원/대표 면접"],
      focus: ["직무전문성", "문제해결", "실행력", "책임감"],
    },
  },
  SMALL: {
    interviewStyle: {
      tone: "현장·실무 중심, 다면업 무관용",
      rounds: ["실무 면접", "대표/팀장 면접"],
      focus: ["직무전문성", "문제해결", "의사소통", "책임감"],
    },
  },
  STARTUP: {
    interviewStyle: {
      tone: "컬처핏·오너십·비전 공감 중심",
      rounds: ["컬처핏 면접", "실무/창업자 면접"],
      focus: ["조직적합", "성장·학습", "주도성", "문제해결"],
    },
  },
  PUBLIC: {
    interviewStyle: {
      tone: "NCS 직업기초능력 + 직무수행능력·공직가치",
      rounds: ["NCS 직무능력", "인성·조직적합", "직무수행능력"],
      focus: ["의사소통", "문제해결", "조직적합", "공직가치", "직무이해"],
    },
  },
};

export function getCompanySizePreset(size: CompanySizeCode): SizePreset {
  return COMPANY_SIZE_PRESETS[size] ?? COMPANY_SIZE_PRESETS.MID;
}

/** JD 원문에서 규모 단서를 키워드로 추출 (LLM 없이 1차 추정) */
export function inferCompanySizeFromText(text: string): CompanySizeCode | null {
  const t = text.toLowerCase();
  if (/공공기관|공기업|공사|공단|준정부|지방공기업|nhis|한국전력|korail/i.test(text)) {
    return "PUBLIC";
  }
  if (/스타트업|startup|시리즈\s*[abc]|seed\s*round|벤처기업|초기\s*스타트업|unicorn/i.test(t)) {
    return "STARTUP";
  }
  if (/중소기업|소기업|small\s*business|5인\s*이하|10인\s*미만/i.test(text)) {
    return "SMALL";
  }
  if (/중견기업|mid-?size|매출\s*1조\s*미만/i.test(text)) {
    return "MID";
  }
  if (/대기업|대규모|fortune\s*500|삼성|sk|lg|현대|포스코|네이버|카카오/i.test(text)) {
    return "LARGE";
  }
  return null;
}

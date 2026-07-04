import type { CompanyContext } from "@/types";

/** 상장사/유명 기업 프리셋 (MVP). Phase 2: DART API 연동 */
const COMPANY_PRESETS: Record<string, Partial<CompanyContext>> = {
  삼성전자: {
    industry: "전자/반도체",
    size: "LARGE",
    interviewStyle: {
      tone: "구조적·논리 중심",
      rounds: ["AI역량", "직무", "임원"],
      focus: ["직무전문성", "조직적합", "글로벌 마인드"],
    },
  },
  카카오: {
    industry: "IT/플랫폼",
    size: "LARGE",
    interviewStyle: {
      tone: "캐주얼·실무 중심",
      rounds: ["실무", "임원"],
      focus: ["문제해결", "협업", "성장"],
    },
  },
  현대자동차: {
    industry: "자동차/제조",
    size: "LARGE",
    interviewStyle: {
      tone: "진중·성실",
      rounds: ["인성", "직무", "임원"],
      focus: ["책임감", "현장 이해", "장기 비전"],
    },
  },
  토스: {
    industry: "핀테크",
    size: "MID",
    interviewStyle: {
      tone: "빠르고 날카로운",
      rounds: ["실무", "컬처핏"],
      focus: ["문제해결", "주도성", "임팩트"],
    },
  },
  네이버: {
    industry: "IT/미디어",
    size: "LARGE",
    interviewStyle: {
      tone: "실무·데이터 중심",
      rounds: ["직무", "임원"],
      focus: ["직무전문성", "의사소통", "학습"],
    },
  },
};

export async function enrichCompany(name: string): Promise<CompanyContext> {
  const normalized = name.trim();
  const preset = COMPANY_PRESETS[normalized];

  if (preset) {
    return {
      name: normalized,
      industry: preset.industry ?? "미분류",
      size: preset.size ?? "LARGE",
      interviewStyle: preset.interviewStyle ?? defaultStyle(),
    };
  }

  // Heuristic fallback
  const isPublic = /공사|공단|공기업|진흥원|청/.test(normalized);
  const isStartup = /랩|스튜디오|테크/.test(normalized) && normalized.length < 8;

  return {
    name: normalized,
    industry: "일반",
    size: isPublic ? "PUBLIC" : isStartup ? "STARTUP" : "MID",
    interviewStyle: defaultStyle(),
  };
}

function defaultStyle(): CompanyContext["interviewStyle"] {
  return {
    tone: "균형형 (인성+직무)",
    rounds: ["1차 실무", "2차 임원"],
    focus: ["의사소통", "문제해결", "조직적합"],
  };
}

export { COMPANY_PRESETS };

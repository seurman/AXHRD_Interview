import type { CompanyContext, IndustryCode } from "@/types";
import { getIndustryPreset } from "@/lib/company/industry-presets";
import {
  getCompanySizePreset,
  type CompanySizeCode,
} from "@/lib/company/company-size-presets";

/** 상장사/유명 기업 프리셋 — 정확한 회사명 일치 시 인재상 키워드를 톤에 반영 */
const COMPANY_PRESETS: Record<string, Partial<CompanyContext>> = {
  삼성전자: {
    industry: "전자/반도체",
    size: "LARGE",
    interviewStyle: {
      tone: "열정·창의혁신·인간미와 도덕성 중심",
      rounds: ["AI역량", "직무", "임원"],
      focus: ["직무전문성", "조직적합", "창의", "윤리"],
    },
  },
  "SK하이닉스": {
    industry: "반도체",
    size: "LARGE",
    interviewStyle: {
      tone: "VWBE·SUPEX·패기·협업능력 중심",
      rounds: ["실무 면접", "인적성", "임원 면접"],
      focus: ["협업", "문제해결", "조직적합", "성장"],
    },
  },
  "LG전자": {
    industry: "전자/제조",
    size: "LARGE",
    interviewStyle: {
      tone: "도전적 실행·고객가치창출·협력과 소통·자기주도",
      rounds: ["실무 면접", "임원 면접"],
      focus: ["고객가치", "협업", "문제해결", "자기주도"],
    },
  },
  현대자동차: {
    industry: "자동차/제조",
    size: "LARGE",
    interviewStyle: {
      tone: "고객최우선·도전적 실행·소통과 협력·인재존중·글로벌지향",
      rounds: ["인성", "직무 PT", "임원"],
      focus: ["책임감", "현장 이해", "협업", "글로벌"],
    },
  },
  포스코: {
    industry: "철강/제조",
    size: "LARGE",
    interviewStyle: {
      tone: "끈기와 성장·열정과 창의·배려와 협업",
      rounds: ["실무 면접", "임원 면접"],
      focus: ["끈기", "협업", "문제해결", "성장"],
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
  토스: {
    industry: "핀테크",
    size: "STARTUP",
    interviewStyle: {
      tone: "빠르고 날카로운·컬처핏",
      rounds: ["실무", "컬처핏"],
      focus: ["문제해결", "주도성", "조직적합"],
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

function defaultStyle(): CompanyContext["interviewStyle"] {
  return {
    tone: "균형형 (인성+직무)",
    rounds: ["1차 실무", "2차 임원"],
    focus: ["의사소통", "문제해결", "조직적합"],
  };
}

/** 규모 프리셋을 우선, 산업군은 보조로 합친다 */
function mergeInterviewStyles(
  primary: CompanyContext["interviewStyle"],
  secondary: CompanyContext["interviewStyle"]
): CompanyContext["interviewStyle"] {
  return {
    tone: primary.tone,
    rounds: [...new Set([...primary.rounds, ...secondary.rounds])].slice(0, 4),
    focus: [...new Set([...primary.focus, ...secondary.focus])].slice(0, 6),
  };
}

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

  const isPublic = /공사|공단|공기업|진흥원|청/.test(normalized);
  const isStartup = /랩|스튜디오|테크/.test(normalized) && normalized.length < 8;

  return {
    name: normalized,
    industry: "일반",
    size: isPublic ? "PUBLIC" : isStartup ? "STARTUP" : "MID",
    interviewStyle: defaultStyle(),
  };
}

/**
 * 산업군 + 기업 규모 + (선택) 회사명으로 최종 면접 컨텍스트를 만든다.
 * 규모 프리셋이 톤·라운드·중점 역량의 1차 신호이고, 산업군은 보조 병합.
 * 알려진 회사명이 정확히 일치하면 그 인재상 톤이 최우선.
 */
export function resolveCompanyContext(params: {
  companyName?: string;
  industry: IndustryCode;
  companySize?: CompanySizeCode;
}): CompanyContext {
  const normalized = params.companyName?.trim() ?? "";

  let industryCode = params.industry;
  let size: CompanySizeCode = params.companySize ?? "MID";

  if (size === "PUBLIC" || industryCode === "PUBLIC") {
    industryCode = "PUBLIC";
    size = "PUBLIC";
  }

  const namedPreset = normalized ? COMPANY_PRESETS[normalized] : undefined;
  const sizePreset = getCompanySizePreset(size);
  const industryPreset = getIndustryPreset(industryCode);

  let interviewStyle = mergeInterviewStyles(
    sizePreset.interviewStyle,
    industryPreset.interviewStyle
  );

  if (namedPreset?.interviewStyle) {
    interviewStyle = mergeInterviewStyles(namedPreset.interviewStyle, interviewStyle);
  }

  const industry =
    namedPreset?.industry ?? industryPreset.industry;
  const resolvedSize = namedPreset?.size ?? size;

  return {
    name: normalized || `${industryPreset.industry} 업계`,
    industry,
    size: resolvedSize,
    interviewStyle,
  };
}

export { COMPANY_PRESETS };

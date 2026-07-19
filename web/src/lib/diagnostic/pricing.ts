/**
 * ARC Index 조직진단 단가 — 글로벌 EX(Culture Amp/Qualtrics PEPM·연간 라이선스)와
 * 국내 진단(웨이브 패키지·응답 단가) 패턴을 합친 견적 엔진.
 *
 * 접근 권한은 여전히 Organization.diagnosticEnabled.
 * 이 모듈은 B2B 견적·계약 메타데이터(수동 청구)용이다. Toss 자동결제와 분리.
 */

export type DiagnosticPricingModel =
  | "WAVE_PACKAGE"
  | "SEAT_ANNUAL"
  | "PER_RESPONSE"
  | "CUSTOM";

export type WavePackageTierCode = "STARTER" | "GROWTH" | "SCALE" | "ENTERPRISE";

export type WavePackageTier = {
  code: WavePackageTierCode;
  nameKo: string;
  /** 포함 응답(제출) 상한 */
  includedResponses: number;
  /** 웨이브 1회 기본료 (KRW, VAT 별도) */
  waveFeeKrw: number;
  /** 포함 초과 1응답당 (KRW) */
  overagePerResponseKrw: number;
  description: string;
};

/**
 * 국내 조직문화·역량 진단 패키지형 + 글로벌 mid-market EX 연간 규모감을
 * ARC Index(과학적 4축 리포트)에 맞춰 조정한 기본 카탈로그.
 */
export const WAVE_PACKAGE_TIERS: Record<WavePackageTierCode, WavePackageTier> = {
  STARTER: {
    code: "STARTER",
    nameKo: "Starter · ~50명",
    includedResponses: 50,
    waveFeeKrw: 1_500_000,
    overagePerResponseKrw: 12_000,
    description: "소규모 파일럿·단일 본부",
  },
  GROWTH: {
    code: "GROWTH",
    nameKo: "Growth · ~200명",
    includedResponses: 200,
    waveFeeKrw: 3_500_000,
    overagePerResponseKrw: 10_000,
    description: "중견·정기 연 1~2회 진단 (기본 추천)",
  },
  SCALE: {
    code: "SCALE",
    nameKo: "Scale · ~500명",
    includedResponses: 500,
    waveFeeKrw: 7_000_000,
    overagePerResponseKrw: 8_000,
    description: "다본부·팀 드릴다운 중심",
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    nameKo: "Enterprise · ~1,000명",
    includedResponses: 1_000,
    waveFeeKrw: 12_000_000,
    overagePerResponseKrw: 6_000,
    description: "전사·벤치마크·다회차",
  },
};

/** 연간 좌석 라이선스 (글로벌 PEPM을 진단 SKU 단독 연가로 환산한 기본값) */
export const SEAT_ANNUAL_DEFAULTS = {
  /** 좌석(진단 대상 인원) 1명당 연간 — 약 $18/yr ≈ Culture Amp Engage 일부 규모감의 진단-only 티어 */
  perSeatYearKrw: 25_000,
  minAnnualFeeKrw: 2_000_000,
  includedWavesPerYear: 2,
  extraWaveFeeKrw: 1_000_000,
} as const;

/** 응답 단가형 (국내 설문·진단 도구 단가에 가까운 미터링) */
export const PER_RESPONSE_DEFAULTS = {
  perResponseKrw: 15_000,
  minWaveFeeKrw: 800_000,
} as const;

export const PRICING_MODEL_LABEL: Record<DiagnosticPricingModel, string> = {
  WAVE_PACKAGE: "웨이브 패키지",
  SEAT_ANNUAL: "연간 좌석 라이선스",
  PER_RESPONSE: "응답 단가",
  CUSTOM: "맞춤 견적",
};

export type OrgDiagnosticPricing = {
  model: DiagnosticPricingModel;
  waveTierCode?: WavePackageTierCode | null;
  /** 커스텀/오버라이드 — null이면 티어·기본값 사용 */
  waveFeeKrw?: number | null;
  includedResponses?: number | null;
  overagePerResponseKrw?: number | null;
  annualFeeKrw?: number | null;
  includedWavesPerYear?: number | null;
  extraWaveFeeKrw?: number | null;
  /** SEAT_ANNUAL 견적용 좌석 수 (기관 maxSeats와 별도일 수 있음) */
  seatCount?: number | null;
  perResponseKrw?: number | null;
  minWaveFeeKrw?: number | null;
  currency: "KRW";
  notes?: string | null;
};

export type WavePricingLine = {
  code: string;
  label: string;
  amountKrw: number;
};

export type WavePricingQuote = {
  model: DiagnosticPricingModel;
  modelLabel: string;
  currency: "KRW";
  /** 이번 웨이브 청구 견적 (VAT 별도) */
  waveFeeKrw: number;
  estimatedResponses: number;
  includedResponses: number | null;
  overageResponses: number;
  overageFeeKrw: number;
  lines: WavePricingLine[];
  /** 연간 라이선스 등 배경 계약 요약 */
  contractSummary: string | null;
  notes: string | null;
  catalogVersion: string;
  quotedAt: string;
};

export const DIAGNOSTIC_PRICING_CATALOG_VERSION = "2026.07-arc-v1";

export function defaultOrgDiagnosticPricing(
  model: DiagnosticPricingModel = "WAVE_PACKAGE",
): OrgDiagnosticPricing {
  if (model === "SEAT_ANNUAL") {
    return {
      model,
      currency: "KRW",
      seatCount: 200,
      annualFeeKrw: null, // seatCount * rate로 계산
      includedWavesPerYear: SEAT_ANNUAL_DEFAULTS.includedWavesPerYear,
      extraWaveFeeKrw: SEAT_ANNUAL_DEFAULTS.extraWaveFeeKrw,
      notes: "연간 계약 · 포함 웨이브 소진 후 추가 웨이브 요금",
    };
  }
  if (model === "PER_RESPONSE") {
    return {
      model,
      currency: "KRW",
      perResponseKrw: PER_RESPONSE_DEFAULTS.perResponseKrw,
      minWaveFeeKrw: PER_RESPONSE_DEFAULTS.minWaveFeeKrw,
      notes: "제출 응답 기준 미터링 · 최소 웨이브 요금 적용",
    };
  }
  if (model === "CUSTOM") {
    return {
      model,
      currency: "KRW",
      waveFeeKrw: null,
      notes: "영업 맞춤 견적 — 금액은 메모/계약서 기준",
    };
  }
  return {
    model: "WAVE_PACKAGE",
    currency: "KRW",
    waveTierCode: "GROWTH",
    notes: "웨이브당 패키지 · 포함 응답 초과 시 초과분 과금",
  };
}

export function resolveWavePackageTier(
  pricing: OrgDiagnosticPricing,
): WavePackageTier | null {
  if (pricing.model !== "WAVE_PACKAGE") return null;
  const code = pricing.waveTierCode ?? "GROWTH";
  return WAVE_PACKAGE_TIERS[code] ?? WAVE_PACKAGE_TIERS.GROWTH;
}

export function resolveAnnualLicenseFeeKrw(pricing: OrgDiagnosticPricing): number {
  if (pricing.annualFeeKrw != null && pricing.annualFeeKrw >= 0) {
    return pricing.annualFeeKrw;
  }
  const seats = Math.max(0, pricing.seatCount ?? 0);
  const computed = seats * SEAT_ANNUAL_DEFAULTS.perSeatYearKrw;
  return Math.max(SEAT_ANNUAL_DEFAULTS.minAnnualFeeKrw, computed);
}

function asPositiveInt(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.floor(n);
  return v >= 0 ? v : null;
}

const TIER_CODES = new Set<string>(Object.keys(WAVE_PACKAGE_TIERS));
const MODELS = new Set<string>(["WAVE_PACKAGE", "SEAT_ANNUAL", "PER_RESPONSE", "CUSTOM"]);

/** DB Json / API body → 정규화. 잘못된 값은 null */
export function parseOrgDiagnosticPricing(raw: unknown): OrgDiagnosticPricing | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!MODELS.has(String(o.model))) return null;
  const model = o.model as DiagnosticPricingModel;
  const waveTierCode =
    typeof o.waveTierCode === "string" && TIER_CODES.has(o.waveTierCode)
      ? (o.waveTierCode as WavePackageTierCode)
      : null;
  return {
    model,
    waveTierCode,
    waveFeeKrw: asPositiveInt(o.waveFeeKrw),
    includedResponses: asPositiveInt(o.includedResponses),
    overagePerResponseKrw: asPositiveInt(o.overagePerResponseKrw),
    annualFeeKrw: asPositiveInt(o.annualFeeKrw),
    includedWavesPerYear: asPositiveInt(o.includedWavesPerYear),
    extraWaveFeeKrw: asPositiveInt(o.extraWaveFeeKrw),
    seatCount: asPositiveInt(o.seatCount),
    perResponseKrw: asPositiveInt(o.perResponseKrw),
    minWaveFeeKrw: asPositiveInt(o.minWaveFeeKrw),
    currency: "KRW",
    notes: typeof o.notes === "string" ? o.notes.trim() || null : null,
  };
}

export function parseWavePricingQuote(raw: unknown): WavePricingQuote | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!MODELS.has(String(o.model))) return null;
  if (typeof o.waveFeeKrw !== "number") return null;
  return o as unknown as WavePricingQuote;
}

export type QuoteWaveInput = {
  pricing: OrgDiagnosticPricing;
  /** 예상 또는 실제출 응답 수 */
  estimatedResponses: number;
  /** 계약연도 기준 이미 생성·청구된 웨이브 수 (이번 웨이브 제외) */
  wavesUsedThisYear?: number;
};

export function quoteDiagnosticWave(input: QuoteWaveInput): WavePricingQuote {
  const pricing = input.pricing;
  const estimatedResponses = Math.max(0, Math.floor(input.estimatedResponses || 0));
  const wavesUsed = Math.max(0, Math.floor(input.wavesUsedThisYear ?? 0));
  const quotedAt = new Date().toISOString();
  const base = {
    model: pricing.model,
    modelLabel: PRICING_MODEL_LABEL[pricing.model],
    currency: "KRW" as const,
    estimatedResponses,
    catalogVersion: DIAGNOSTIC_PRICING_CATALOG_VERSION,
    quotedAt,
    notes: pricing.notes ?? null,
  };

  if (pricing.model === "CUSTOM") {
    const fee = pricing.waveFeeKrw ?? 0;
    return {
      ...base,
      waveFeeKrw: fee,
      includedResponses: pricing.includedResponses ?? null,
      overageResponses: 0,
      overageFeeKrw: 0,
      lines: [
        {
          code: "CUSTOM",
          label: fee > 0 ? "맞춤 웨이브 요금" : "맞춤 견적(금액 미기재)",
          amountKrw: fee,
        },
      ],
      contractSummary: pricing.notes ?? "영업 맞춤 계약",
    };
  }

  if (pricing.model === "PER_RESPONSE") {
    const unit = pricing.perResponseKrw ?? PER_RESPONSE_DEFAULTS.perResponseKrw;
    const minFee = pricing.minWaveFeeKrw ?? PER_RESPONSE_DEFAULTS.minWaveFeeKrw;
    const metered = estimatedResponses * unit;
    const waveFeeKrw = Math.max(minFee, metered);
    const lines: WavePricingLine[] = [
      {
        code: "PER_RESPONSE",
        label: `응답 ${estimatedResponses.toLocaleString("ko-KR")}명 × ₩${unit.toLocaleString("ko-KR")}`,
        amountKrw: metered,
      },
    ];
    if (waveFeeKrw > metered) {
      lines.push({
        code: "MIN_WAVE",
        label: "최소 웨이브 요금 보정",
        amountKrw: waveFeeKrw - metered,
      });
    }
    return {
      ...base,
      waveFeeKrw,
      includedResponses: null,
      overageResponses: 0,
      overageFeeKrw: 0,
      lines,
      contractSummary: `응답 단가 ₩${unit.toLocaleString("ko-KR")} · 최소 ₩${minFee.toLocaleString("ko-KR")}`,
    };
  }

  if (pricing.model === "SEAT_ANNUAL") {
    const included =
      pricing.includedWavesPerYear ?? SEAT_ANNUAL_DEFAULTS.includedWavesPerYear;
    const extraFee =
      pricing.extraWaveFeeKrw ?? SEAT_ANNUAL_DEFAULTS.extraWaveFeeKrw;
    const annual = resolveAnnualLicenseFeeKrw(pricing);
    const withinIncluded = wavesUsed < included;
    const waveFeeKrw = withinIncluded ? 0 : extraFee;
    const lines: WavePricingLine[] = withinIncluded
      ? [
          {
            code: "INCLUDED_WAVE",
            label: `연간 포함 웨이브 (${wavesUsed + 1}/${included})`,
            amountKrw: 0,
          },
        ]
      : [
          {
            code: "EXTRA_WAVE",
            label: `포함 ${included}회 초과 · 추가 웨이브`,
            amountKrw: extraFee,
          },
        ];
    return {
      ...base,
      waveFeeKrw,
      includedResponses: null,
      overageResponses: 0,
      overageFeeKrw: 0,
      lines,
      contractSummary: `연간 라이선스 ₩${annual.toLocaleString("ko-KR")} · 포함 ${included}회/년`,
    };
  }

  // WAVE_PACKAGE
  const tier = resolveWavePackageTier(pricing) ?? WAVE_PACKAGE_TIERS.GROWTH;
  const waveFeeBase = pricing.waveFeeKrw ?? tier.waveFeeKrw;
  const included = pricing.includedResponses ?? tier.includedResponses;
  const overageUnit = pricing.overagePerResponseKrw ?? tier.overagePerResponseKrw;
  const overageResponses = Math.max(0, estimatedResponses - included);
  const overageFeeKrw = overageResponses * overageUnit;
  const waveFeeKrw = waveFeeBase + overageFeeKrw;
  const lines: WavePricingLine[] = [
    {
      code: "WAVE_BASE",
      label: `${tier.nameKo} 기본료 (포함 ${included.toLocaleString("ko-KR")}명)`,
      amountKrw: waveFeeBase,
    },
  ];
  if (overageFeeKrw > 0) {
    lines.push({
      code: "OVERAGE",
      label: `초과 ${overageResponses.toLocaleString("ko-KR")}명 × ₩${overageUnit.toLocaleString("ko-KR")}`,
      amountKrw: overageFeeKrw,
    });
  }
  return {
    ...base,
    waveFeeKrw,
    includedResponses: included,
    overageResponses,
    overageFeeKrw,
    lines,
    contractSummary: `패키지 ${tier.nameKo} · VAT 별도`,
  };
}

export function formatKrw(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₩${amount.toLocaleString("ko-KR")}`;
}

/** UI용 카탈로그 요약 행 */
export function pricingCatalogRows(): Array<{
  model: DiagnosticPricingModel;
  title: string;
  benchmark: string;
  example: string;
}> {
  return [
    {
      model: "WAVE_PACKAGE",
      title: "웨이브 패키지",
      benchmark: "국내 조직진단·설문 패키지 / 인원 티어",
      example: `Growth ₩${WAVE_PACKAGE_TIERS.GROWTH.waveFeeKrw.toLocaleString("ko-KR")} / ${WAVE_PACKAGE_TIERS.GROWTH.includedResponses}명`,
    },
    {
      model: "SEAT_ANNUAL",
      title: "연간 좌석 라이선스",
      benchmark: "Culture Amp·Qualtrics형 PEPM → 연가 환산",
      example: `좌석당 연 ₩${SEAT_ANNUAL_DEFAULTS.perSeatYearKrw.toLocaleString("ko-KR")} · 연 ${SEAT_ANNUAL_DEFAULTS.includedWavesPerYear}회 포함`,
    },
    {
      model: "PER_RESPONSE",
      title: "응답 단가",
      benchmark: "국내 설문·진단 도구 미터링",
      example: `₩${PER_RESPONSE_DEFAULTS.perResponseKrw.toLocaleString("ko-KR")}/응답 · 최소 ₩${PER_RESPONSE_DEFAULTS.minWaveFeeKrw.toLocaleString("ko-KR")}`,
    },
    {
      model: "CUSTOM",
      title: "맞춤 견적",
      benchmark: "Enterprise 수동 계약",
      example: "금액·조건 메모 기준",
    },
  ];
}

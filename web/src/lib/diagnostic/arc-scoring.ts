import type { DiagnosticItem } from "@prisma/client";

export type AnswerValue = {
  numericValue?: number | null;
  textValue?: string | null;
};

export type ScoredAnswers = Record<
  string,
  { current?: number | null; importance?: number | null }
>;

export function reverseCode(v: number): number {
  return 6 - v;
}

export function rawValue(isReversed: boolean, v: number): number {
  return isReversed ? reverseCode(v) : v;
}

export function average(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function pickRaw(
  answers: ScoredAnswers,
  codes: string[],
  reversed: Set<string>,
): number[] {
  return codes
    .map((code) => {
      const v = answers[code]?.current;
      if (v == null || !Number.isFinite(v)) return null;
      return rawValue(reversed.has(code), v);
    })
    .filter((v): v is number => v != null);
}

export function pickImportance(answers: ScoredAnswers, codes: string[]): number[] {
  return codes
    .map((code) => answers[code]?.importance ?? null)
    .filter((v): v is number => v != null && Number.isFinite(v));
}

export function healthBand(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 4.5) return "탁월";
  if (score >= 3.5) return "양호";
  if (score >= 2.5) return "보통";
  return "주의";
}

export function bandOai(oai: number | null): string | null {
  if (oai == null) return null;
  if (oai >= 4.5) return "방향정렬 탁월";
  if (oai >= 3.5) return "방향정렬 양호";
  if (oai >= 2.5) return "부분 정렬";
  return "방향이탈";
}

export function bandOpportunityScore(score: number | null): {
  band: string;
  prescription: string;
} | null {
  if (score == null) return null;
  if (score >= 1.0) {
    return {
      band: "구조가 막음",
      prescription: "AXG 해소 (거버넌스·가이드라인) 즉각 ROI",
    };
  }
  if (score >= 0.1) {
    return { band: "의지·공포 균형", prescription: "AXS·AXC 병행 투자" };
  }
  if (score > -0.1 && score < 0.1) {
    return { band: "의지 = 공포", prescription: "인식 교육 + 소규모 파일럿" };
  }
  return { band: "의지 부족", prescription: "AI 필요성 교육 먼저 (AXA 개선 우선)" };
}

export function computeSE(answers: ScoredAnswers, reversed: Set<string>) {
  // SEC* = SE.C 헌신·연결 (산식표 C01~C03 — 드라이버 C01~C02와 코드 충돌 방지)
  const E = average(pickRaw(answers, ["E01", "E02", "E03"], reversed));
  const C = average(pickRaw(answers, ["SEC01", "SEC02", "SEC03"], reversed));
  const F = average(pickRaw(answers, ["F01", "F02"], reversed));
  const SE = average([E, C, F]);
  return { E, C, F, SE };
}

export function computeBO(answers: ScoredAnswers, reversed: Set<string>) {
  return average(pickRaw(answers, ["BO01", "BO02", "BO03"], reversed));
}

export function computeTL(answers: ScoredAnswers, reversed: Set<string>) {
  const trust = average(pickRaw(answers, ["TL01", "TL02"], reversed));
  const growth = average(pickRaw(answers, ["TL03", "TL04"], reversed));
  const safety = average(pickRaw(answers, ["TL05", "TL06"], reversed));
  const TL = average(pickRaw(answers, ["TL01", "TL02", "TL03", "TL04", "TL05", "TL06"], reversed));
  return { trust, growth, safety, TL };
}

const DRIVER_CODES: Record<string, string[]> = {
  SL: ["SL01", "SL02", "SL03"],
  SV: ["SV01", "SV02", "SV03"],
  PS: ["PS01", "PS02", "PS03"],
  EM: ["EM01", "EM02", "EM03"],
  PM: ["PM01", "PM02"],
  LG: ["LG01", "LG02", "LG03"],
  CI: ["CI01", "CI02"],
  WE: ["WE01", "WE02", "WE03"],
  C: ["C01", "C02"],
};

export function computeDriverAreas(answers: ScoredAnswers, reversed: Set<string>) {
  const out: Record<string, { current: number | null; importance: number | null }> = {};
  for (const [key, codes] of Object.entries(DRIVER_CODES)) {
    out[key] = {
      current: average(pickRaw(answers, codes, reversed)),
      importance: average(pickImportance(answers, codes)),
    };
  }
  return out;
}

export function computeOhiOverall(
  SE: number | null,
  drivers: ReturnType<typeof computeDriverAreas>,
) {
  const vals = [SE, ...Object.values(drivers).map((d) => d.current)];
  return average(vals);
}

export function computeRiskIndex(
  answers: ScoredAnswers,
  reversed: Set<string>,
  Eavg: number | null,
  oviHv: number | null,
) {
  const c03 = answers.SEC03?.current ?? answers.C03?.current;
  const c03raw = c03 != null ? rawValue(reversed.has("SEC03") || reversed.has("C03"), c03) : null;
  const c03Flag = c03raw != null && c03raw <= 2 ? 1 : 0;
  const eFlag = Eavg != null && Eavg <= 2.5 ? 1 : 0;
  const hvFlag = oviHv != null && oviHv < 2.5 ? 1 : 0;
  return c03Flag * 0.4 + eFlag * 0.3 + hvFlag * 0.3;
}

export function computeOri(answers: ScoredAnswers, reversed: Set<string>) {
  const CD = average(pickRaw(answers, ["CD01", "CD02", "CD03", "CD04", "CD05"], reversed));
  const LA = average(pickRaw(answers, ["LA01", "LA02", "LA03"], reversed));
  const AXS = average(pickRaw(answers, ["AXS01", "AXS02", "AXS03", "AXS04"], reversed));
  const AXC = average(pickRaw(answers, ["AXC01", "AXC02", "AXC03", "AXC04", "AXC05"], reversed));
  const ORI = average([CD, LA, AXS, AXC]);
  return { CD, LA, AXS, AXC, ORI };
}

export function computeOpportunityScore(answers: ScoredAnswers, reversed: Set<string>) {
  const AXA = average(pickRaw(answers, ["AXA01", "AXA02"], reversed));
  const AXG = average(pickRaw(answers, ["AXG01", "AXG02"], reversed));
  const oppScore = AXA != null && AXG != null ? AXA - AXG : null;
  return { AXA, AXG, oppScore, band: bandOpportunityScore(oppScore) };
}

export function computeOvi(answers: ScoredAnswers, reversed: Set<string>) {
  const HV = average(pickRaw(answers, ["HV01", "HV02", "HV03", "HV04", "HV05"], reversed));
  const CV = average(pickRaw(answers, ["CV01", "CV02", "CV03", "CV04", "CV05"], reversed));
  const AV = average(pickRaw(answers, ["AV01", "AV02", "AV03", "AV04", "AV05"], reversed));
  const OVI = average([HV, CV, AV]);
  return { HV, CV, AV, OVI };
}

export function computeDynamicCongruenceGap(AV: number | null, HV: number | null) {
  if (AV == null || HV == null) return null;
  return AV - HV;
}

export function computeOai(answers: ScoredAnswers, reversed: Set<string>) {
  const SA = average(pickRaw(answers, ["SA01", "SA02", "SA03", "SA04", "SA05", "SA06"], reversed));
  const EA = average(pickRaw(answers, ["EA01", "EA02", "EA03", "EA05", "EA06"], reversed));
  const OA = average(pickRaw(answers, ["OA01", "OA02", "OA03", "OA04", "OA06"], reversed));
  const OAI = SA != null && EA != null && OA != null ? SA * 0.4 + EA * 0.35 + OA * 0.25 : null;
  return { SA, EA, OA, OAI, band: bandOai(OAI) };
}

export function computeOaiPattern(
  OHI: number | null,
  ORI: number | null,
  OVI: number | null,
  OAI: number | null,
): { pattern: string; message: string } | null {
  if (OHI == null || ORI == null || OVI == null || OAI == null) return null;
  const hi = (v: number) => v >= 3.5;
  const lo = (v: number) => v < 3.5;
  if (hi(OHI) && hi(OVI) && lo(OAI)) {
    return {
      pattern: "빠른 오류",
      message: "건강하고 빠른데 방향이 잘못됨. 3축만 보면 최우수 조직으로 오인 가능.",
    };
  }
  if (hi(OHI) && lo(OVI) && lo(OAI)) {
    return {
      pattern: "건강한 표류",
      message: "활력은 있으나 방향도 없고 속도도 없음. 공공기관에서 흔한 패턴.",
    };
  }
  if (lo(OHI) && lo(OVI) && hi(OAI)) {
    return {
      pattern: "느리지만 정확",
      message: "지치고 느리지만 방향은 맞음. OHI·OVI 회복 후 빠른 성과.",
    };
  }
  if (hi(OHI) && hi(ORI) && hi(OVI) && hi(OAI)) {
    return {
      pattern: "이상적 조직",
      message: "4축 균형 상태. 번아웃 예방과 Wave 2 재진단 설계로 전환.",
    };
  }
  return { pattern: "복합", message: "4축 교차 패턴 — 세부 축별 처방을 확인하세요." };
}

export function computeAxMaturityStage(input: {
  answers: ScoredAnswers;
  reversed: Set<string>;
  ORI: number | null;
  AV: number | null;
}): { stage: number; label: string } | null {
  const { answers, reversed, ORI, AV } = input;
  const cd02 = answers.CD02?.current;
  const axa01 = answers.AXA01?.current;
  const axc01 = answers.AXC01?.current;
  const axs = pickRaw(answers, ["AXS01", "AXS02", "AXS03", "AXS04"], reversed);
  const axg = pickRaw(answers, ["AXG01", "AXG02"], reversed);
  const axgAvg = average(axg);

  if (ORI != null && ORI >= 4.2 && AV != null) {
    return { stage: 5, label: "혁신" };
  }
  if (ORI != null && ORI >= 3.5 && axgAvg != null && axgAvg <= 2.0) {
    return { stage: 4, label: "최적화" };
  }
  if (ORI != null && ORI >= 2.8 && axs.length === 4 && axs.every((v) => v >= 3)) {
    return { stage: 3, label: "통합" };
  }
  if (ORI != null && ORI >= 2.0 && axa01 != null && axa01 >= 3 && axc01 != null && axc01 >= 3) {
    return { stage: 2, label: "실험" };
  }
  if (ORI != null && ORI < 2.0 && cd02 != null && cd02 >= 3) {
    return { stage: 1, label: "인식" };
  }
  return null;
}

export function computeTeamGapMatrix(
  teams: Array<{ teamId: string; teamName: string; ORI: number | null; OVI: number | null; OHI_SE: number | null; OAI: number | null }>,
) {
  if (teams.length >= 15) {
    return {
      mode: "OLS_REQUIRED" as const,
      note: "팀 15개 이상 — OLS 회귀+잔차분석 필요(2단계 통계엔진 대상, 이번 단계 미구현)",
    };
  }
  const xBase = average(teams.map((t) => t.ORI));
  const yBase = average(teams.map((t) => t.OVI));
  return {
    mode: "GAP_MATRIX" as const,
    xBase,
    yBase,
    teams: teams
      .map((t) => {
        const gap = t.ORI != null && t.OVI != null ? t.ORI - t.OVI : null;
        const gapSquared = gap != null ? gap * gap : null;
        let quadrant: string | null = null;
        if (t.ORI != null && t.OVI != null && xBase != null && yBase != null) {
          if (t.ORI >= xBase && t.OVI >= yBase) quadrant = "IDEAL";
          else if (t.ORI < xBase && t.OVI >= yBase) quadrant = "POSITIVE_GAP";
          else if (t.ORI < xBase && t.OVI < yBase) quadrant = "CRISIS";
          else quadrant = "NEGATIVE_GAP";
        }
        return { ...t, gap, gapSquared, quadrant };
      })
      .sort((a, b) => (b.gapSquared ?? 0) - (a.gapSquared ?? 0)),
  };
}

export function buildReversedSet(items: Pick<DiagnosticItem, "itemCode" | "isReversed">[]): Set<string> {
  return new Set(items.filter((i) => i.isReversed).map((i) => i.itemCode));
}

export function computeArcScoresFromAnswers(
  answers: ScoredAnswers,
  reversed: Set<string>,
) {
  const se = computeSE(answers, reversed);
  const bo = computeBO(answers, reversed);
  const tl = computeTL(answers, reversed);
  const drivers = computeDriverAreas(answers, reversed);
  const ohi = computeOhiOverall(se.SE, drivers);
  const ori = computeOri(answers, reversed);
  const ovi = computeOvi(answers, reversed);
  const oai = computeOai(answers, reversed);
  const riskIndex = computeRiskIndex(answers, reversed, se.E, ovi.HV);
  const opportunity = computeOpportunityScore(answers, reversed);
  const dynamicGap = computeDynamicCongruenceGap(ovi.AV, ovi.HV);
  const axMaturity = computeAxMaturityStage({
    answers,
    reversed,
    ORI: ori.ORI,
    AV: ovi.AV,
  });
  const oaiPattern = computeOaiPattern(ohi, ori.ORI, ovi.OVI, oai.OAI);

  return {
    ohi: {
      ...se,
      BO: bo,
      TL: tl,
      drivers,
      overall: ohi,
      band: healthBand(ohi),
      riskIndex,
    },
    ori: {
      ...ori,
      band: healthBand(ori.ORI),
      opportunity,
      axMaturity,
    },
    ovi: {
      ...ovi,
      band: healthBand(ovi.OVI),
      dynamicCongruenceGap: dynamicGap,
    },
    oai: {
      ...oai,
    },
    oaiPattern,
  };
}

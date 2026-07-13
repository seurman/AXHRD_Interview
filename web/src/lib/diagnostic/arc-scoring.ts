import type { DiagnosticItem } from "@prisma/client";

/**
 * ARC Index 결정론적 스코어링 — docs/arc-index/source/ARC_Index_산식표_통합설문지.md 정본.
 * SE.C 헌신 문항은 DB에서 SEC01~03 (드라이버 C01~02 소통 문항과 코드 충돌 방지).
 * OLS(β회귀 IPA)·WLS(팀수준 HLM-lite)·ICC·LPA(GMM)는 이 파일에 순수 TS로 구현됨.
 * 주관식 테마 분석은 별도(lib/diagnostic/theme-mining.ts, Gemini 기반).
 */

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

export function bandOvi(ovi: number | null): string | null {
  if (ovi == null) return null;
  if (ovi >= 4.5) return "빠른 개선";
  if (ovi >= 3.5) return "개선 중";
  if (ovi >= 2.5) return "정체";
  if (ovi >= 1.5) return "악화 중";
  return "급속 악화";
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
  if (oai >= 4.5) return "방향 정렬 탁월";
  if (oai >= 3.5) return "방향 정렬 양호";
  if (oai >= 2.5) return "부분 정렬";
  if (oai >= 1.5) return "방향 이탈";
  return "방향 붕괴";
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
  if (score >= 0.1 && score < 1.0) {
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
  PS: ["PS01", "PS02"],
  EM: ["EM01", "EM02"],
  PM: ["PM01", "PM02"],
  LG: ["LG01", "LG02"],
  CI: ["CI01", "CI02"],
  WE: ["WE01", "WE02"],
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
  const CD = average(pickRaw(answers, ["CD01", "CD02", "CD03", "CD05"], reversed));
  const LA = average(pickRaw(answers, ["LA01", "LA02", "LA03"], reversed));
  const AXS = average(pickRaw(answers, ["AXS01", "AXS02", "AXS03", "AXS04"], reversed));
  const AXC = average(pickRaw(answers, ["AXC01", "AXC02", "AXC03", "AXC04"], reversed));
  const ORI = average([CD, LA, AXS, AXC]);
  return { CD, LA, AXS, AXC, ORI };
}

export function computeOpportunityScore(answers: ScoredAnswers, reversed: Set<string>) {
  // AXG는 역문항 아님 — 높을수록 거버넌스 공포(구조 미비)
  const AXA = average(pickRaw(answers, ["AXA01", "AXA02"], reversed));
  const AXG = average(pickRaw(answers, ["AXG01", "AXG02"], reversed));
  const oppScore = AXA != null && AXG != null ? AXA - AXG : null;
  return { AXA, AXG, oppScore, band: bandOpportunityScore(oppScore) };
}

export function computeOvi(answers: ScoredAnswers, reversed: Set<string>) {
  const HV = average(pickRaw(answers, ["HV01", "HV02", "HV03", "HV05"], reversed));
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
  const SA = average(pickRaw(answers, ["SA01", "SA02", "SA03", "SA05", "SA06"], reversed));
  const EA = average(pickRaw(answers, ["EA01", "EA02", "EA05"], reversed));
  const OA = average(pickRaw(answers, ["OA01", "OA03", "OA04", "OA06"], reversed));
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
  if (hi(OHI) && hi(ORI) && hi(OVI) && hi(OAI)) {
    return {
      pattern: "이상적 조직",
      message: "4축 균형 상태. 번아웃 예방과 Wave 2 재진단 설계로 전환.",
    };
  }
  if (hi(OHI) && hi(OVI) && lo(OAI)) {
    return {
      pattern: "빠른 오류",
      message: "건강하고 빠른데 방향이 잘못됨. 3축만 보면 최우수 조직으로 오인 가능.",
    };
  }
  if (lo(OHI) && lo(OVI) && hi(OAI)) {
    return {
      pattern: "느리지만 정확",
      message: "지치고 느리지만 방향은 맞음. OHI·OVI 회복 후 빠른 성과.",
    };
  }
  if (hi(ORI) && lo(OAI)) {
    return {
      pattern: "준비됐지만 방향 없음",
      message: "역량과 의지는 있는데 방향이 없다. 역량이 낭비되고 있다.",
    };
  }
  if (hi(OVI) && lo(OAI)) {
    return {
      pattern: "무방향 질주",
      message: "빠르게 달리는데 방향이 없다. 공공기관에서 두 번째로 흔한 위험 패턴.",
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

/**
 * JS 통계 구현 — 다중선형회귀(OLS/WLS)·ICC(1)·LPA(GMM). 완전한 REML 다층모형(팀내·팀간
 * 분산을 동시 추정하는 정식 HLM)은 아니지만, 개인수준 β회귀(IPA) + 팀수준 가중회귀(HLM-lite,
 * computeTeamLevelDriverImportance) + ICC(분산분해)를 합쳐서 실질적으로 같은 질문에 답한다.
 * 주관식 테마 분석(LDA 대신 채택)은 별도(lib/diagnostic/theme-mining.ts, Gemini 기반).
 */

function stdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Gauss-Jordan 소거법으로 Ax=b 를 푼다. 특이행렬(공선성 등)이면 null. */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(M[pivotRow][col]) < 1e-10) return null;
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const pivot = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  return M.map((row) => row[n]);
}

export type RegressionResult = {
  coefficients: number[];
  standardizedCoefficients: number[];
  rSquared: number;
  n: number;
};

function weightedStdDev(values: number[], weights: number[]): number {
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return 0;
  const mean = values.reduce((acc, v, i) => acc + weights[i] * v, 0) / wSum;
  const variance = values.reduce((acc, v, i) => acc + weights[i] * (v - mean) ** 2, 0) / wSum;
  return Math.sqrt(variance);
}

/**
 * 다중선형회귀(OLS/WLS). X는 관측치×예측변수 행렬(절편 제외), y는 종속변인.
 * 표준화 β_j = raw β_j × SD(X_j) / SD(y) — 예측변수 단위가 달라도 상대적 영향력 비교 가능.
 * weights를 주면 가중최소제곱(WLS) — 팀수준 회귀에서 팀 표본크기로 가중할 때 사용(HLM-lite).
 * weights를 생략하면 기존 비가중 OLS와 정확히 동일한 결과(회귀식 전체에서 wi=1로 치환됨).
 */
export function olsRegression(X: number[][], y: number[], weights?: number[]): RegressionResult | null {
  const n = X.length;
  if (n === 0 || y.length !== n) return null;
  const p = X[0].length;
  if (p === 0) return null;
  if (weights && weights.length !== n) return null;

  const w = weights ?? null;
  const design = X.map((row) => [1, ...row]);
  const k = p + 1;

  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const wi = w ? w[i] : 1;
    for (let a = 0; a < k; a++) {
      Xty[a] += wi * design[i][a] * y[i];
      for (let b = 0; b < k; b++) {
        XtX[a][b] += wi * design[i][a] * design[i][b];
      }
    }
  }

  const coeffs = solveLinearSystem(XtX, Xty);
  if (!coeffs) return null;

  const wSum = w ? w.reduce((a, b) => a + b, 0) : n;
  const yMean = w
    ? y.reduce((acc, yi, i) => acc + w[i] * yi, 0) / wSum
    : y.reduce((a, b) => a + b, 0) / n;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const wi = w ? w[i] : 1;
    const pred = design[i].reduce((sum, v, idx) => sum + v * coeffs[idx], 0);
    ssRes += wi * (y[i] - pred) ** 2;
    ssTot += wi * (y[i] - yMean) ** 2;
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  const ySd = w ? weightedStdDev(y, w) : stdDev(y);
  const standardizedCoefficients = coeffs.slice(1).map((b, j) => {
    const xj = X.map((row) => row[j]);
    const xSd = w ? weightedStdDev(xj, w) : stdDev(xj);
    return ySd > 0 ? b * (xSd / ySd) : 0;
  });

  return { coefficients: coeffs, standardizedCoefficients, rSquared, n };
}

/** IPA(β회귀 기반 우선순위)에 사용하는 9개 영역 — 통합설문지 260626 (전략방향 D 제외) */
export const DRIVER_ORDER = ["SL", "SV", "PS", "EM", "PM", "LG", "CI", "WE", "C"] as const;

export type DriverImportance = {
  code: string;
  current: number | null;
  beta: number | null;
  priority: "FOCUS" | "MAINTAIN" | null;
};

export type DriverImportanceSummary = {
  entries: DriverImportance[];
  rSquared: number | null;
  n: number;
  insufficientData: boolean;
};

/**
 * Y=SE(활력·헌신·몰두 종합) / X=9개 드라이버 영역 현재점수 — 응답자 단위 완전사례만 사용.
 * 예측변수(10개) 대비 표본이 너무 적으면(경험칙 n < p×3) 불안정하므로 계산하지 않는다.
 */
export function computeDriverImportance(
  perRespondent: Array<{ ohi: { SE: number | null; drivers: Record<string, { current: number | null }> } }>,
): DriverImportanceSummary {
  const rows: number[][] = [];
  const ys: number[] = [];
  for (const r of perRespondent) {
    const se = r.ohi.SE;
    if (se == null) continue;
    const vals = DRIVER_ORDER.map((code) => r.ohi.drivers[code]?.current ?? null);
    if (vals.some((v) => v == null)) continue;
    rows.push(vals as number[]);
    ys.push(se);
  }

  const minN = DRIVER_ORDER.length * 3;
  if (rows.length < minN) {
    return {
      entries: DRIVER_ORDER.map((code) => ({ code, current: null, beta: null, priority: null })),
      rSquared: null,
      n: rows.length,
      insufficientData: true,
    };
  }

  const reg = olsRegression(rows, ys);
  const currentAvg = DRIVER_ORDER.map((_, idx) => average(rows.map((row) => row[idx])));
  const betas = reg?.standardizedCoefficients ?? DRIVER_ORDER.map(() => null);
  const betaMedian = median(betas.filter((b): b is number => b != null));
  const currentMedian = median(currentAvg.filter((v): v is number => v != null));

  const entries = DRIVER_ORDER.map((code, idx) => {
    const beta = reg ? betas[idx] : null;
    const current = currentAvg[idx];
    const priority: DriverImportance["priority"] =
      beta != null && current != null ? (beta >= betaMedian && current < currentMedian ? "FOCUS" : "MAINTAIN") : null;
    return { code, current, beta, priority };
  });

  return { entries, rSquared: reg?.rSquared ?? null, n: rows.length, insufficientData: false };
}

const TEAM_LEVEL_MIN_TEAMS = DRIVER_ORDER.length * 2; // 18 — 예측변수 9개 대비 최소 팀 수

/**
 * 팀수준(level-2) 회귀 — Y=팀 평균 SE, X=팀 평균 10개 영역, weight=팀 표본크기(WLS).
 * 완전한 REML 다층모형(팀내·팀간 분산을 한 번에 추정)은 아니지만, "어떤 드라이버가 팀간
 * SE 차이를 설명하는가"를 팀 크기 가중회귀로 근사한다 — HLM의 "means-as-outcomes" 방식과
 * 같은 아이디어(HLM-lite). ICC(팀간 분산 비중)·개인수준 IPA(팀 내부 어떤 드라이버가 중요한가)와
 * 합쳐서 봐야 완전한 그림이 된다. 팀 수가 적으면(전형적) insufficientData를 반환한다.
 */
export function computeTeamLevelDriverImportance(
  teamRows: Array<{ sampleSize: number; SE: number | null; driverAverages: Record<string, number | null> }>,
): DriverImportanceSummary {
  const rows: number[][] = [];
  const ys: number[] = [];
  const weights: number[] = [];
  for (const t of teamRows) {
    if (t.SE == null || t.sampleSize <= 0) continue;
    const vals = DRIVER_ORDER.map((code) => t.driverAverages[code] ?? null);
    if (vals.some((v) => v == null)) continue;
    rows.push(vals as number[]);
    ys.push(t.SE);
    weights.push(t.sampleSize);
  }

  if (rows.length < TEAM_LEVEL_MIN_TEAMS) {
    return {
      entries: DRIVER_ORDER.map((code) => ({ code, current: null, beta: null, priority: null })),
      rSquared: null,
      n: rows.length,
      insufficientData: true,
    };
  }

  const reg = olsRegression(rows, ys, weights);
  const currentAvg = DRIVER_ORDER.map((_, idx) => average(rows.map((row) => row[idx])));
  const betas = reg?.standardizedCoefficients ?? DRIVER_ORDER.map(() => null);
  const betaMedian = median(betas.filter((b): b is number => b != null));
  const currentMedian = median(currentAvg.filter((v): v is number => v != null));

  const entries = DRIVER_ORDER.map((code, idx) => {
    const beta = reg ? betas[idx] : null;
    const current = currentAvg[idx];
    const priority: DriverImportance["priority"] =
      beta != null && current != null ? (beta >= betaMedian && current < currentMedian ? "FOCUS" : "MAINTAIN") : null;
    return { code, current, beta, priority };
  });

  return { entries, rSquared: reg?.rSquared ?? null, n: rows.length, insufficientData: false };
}

export type IccResult = {
  icc: number | null;
  n: number;
  k: number;
  interpretation: string | null;
};

function iccInterpretation(icc: number | null): string | null {
  if (icc == null) return null;
  if (icc < 0.05) return "팀 간 차이 미미 — 조직 전체 개입으로 충분";
  if (icc < 0.15) return "팀 간 차이 존재 — 팀 단위 코칭 고려";
  return "팀마다 편차 큼 — 팀별 맞춤 개입 필수(조직 평균만으로는 오진 위험)";
}

/**
 * ICC(1) — 일원배치 랜덤효과 분산분석. groups는 팀별 원자료 배열(예: 응답자별 SE).
 * 그룹 크기가 다를 때는 Fisher의 불균형 근사식으로 평균 그룹크기(n̄)를 구한다.
 */
export function computeIcc1(groups: number[][]): IccResult {
  const validGroups = groups.filter((g) => g.length >= 2);
  const k = validGroups.length;
  if (k < 2) return { icc: null, n: 0, k, interpretation: null };

  const allValues = validGroups.flat();
  const N = allValues.length;
  const grandMean = allValues.reduce((a, b) => a + b, 0) / N;

  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of validGroups) {
    const gMean = g.reduce((a, b) => a + b, 0) / g.length;
    ssBetween += g.length * (gMean - grandMean) ** 2;
    for (const v of g) ssWithin += (v - gMean) ** 2;
  }

  const dfBetween = k - 1;
  const dfWithin = N - k;
  if (dfWithin <= 0 || dfBetween <= 0) return { icc: null, n: N, k, interpretation: null };

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const sumSquaredGroupSizes = validGroups.reduce((sum, g) => sum + g.length * g.length, 0);
  const nBar = (N - sumSquaredGroupSizes / N) / dfBetween;

  let icc: number | null;
  if (msWithin <= 0) {
    icc = msBetween > 0 ? 1 : null;
  } else if (nBar <= 1) {
    icc = null;
  } else {
    const raw = (msBetween - msWithin) / (msBetween + (nBar - 1) * msWithin);
    icc = Math.max(0, raw);
  }

  return { icc, n: N, k, interpretation: iccInterpretation(icc) };
}

/**
 * LPA(잠재프로파일분석) — 대각공분산 가우시안 혼합모형(GMM), EM 알고리즘으로 순수 TS 구현.
 * Python 통계 서비스 없이 응답자를 SE(활력·헌신·몰두)·BO(번아웃)·TL(신뢰·성장·안전) 3개 축으로
 * k개의 잠재 유형으로 묶는다. 전공분산(full covariance)이 아니라 대각공분산만 추정하는 단순화지만,
 * 표준적인 GMM 변형이며 구현 복잡도·수치 안정성 면에서 이 스케일(응답자 수십~수백 명)에 적합하다.
 * k(유형 개수)는 2~4 중 BIC(베이즈 정보기준) 최솟값으로 데이터 기반 선택한다.
 */

type GmmFit = {
  weights: number[];
  means: number[][];
  variances: number[][];
  logLikelihood: number;
  assignments: number[];
};

const EM_MAX_ITER = 100;
const EM_TOL = 1e-4;
const VARIANCE_FLOOR = 1e-3;

function logGaussianDiag(x: number[], mean: number[], variance: number[]): number {
  let logDensity = 0;
  for (let j = 0; j < x.length; j++) {
    const v = Math.max(variance[j], VARIANCE_FLOOR);
    logDensity += -0.5 * Math.log(2 * Math.PI * v) - (x[j] - mean[j]) ** 2 / (2 * v);
  }
  return logDensity;
}

function logSumExp(values: number[]): number {
  const max = Math.max(...values);
  if (!Number.isFinite(max)) return -Infinity;
  const sum = values.reduce((s, v) => s + Math.exp(v - max), 0);
  return max + Math.log(sum);
}

/** 결정론적 초기화(랜덤 시드 불필요, 항상 재현 가능) — 좌표합 기준 정렬 후 k개 균등 분위 지점을 초기 평균으로 사용. */
function initMeans(data: number[][], k: number): number[][] {
  const n = data.length;
  const order = [...data.keys()].sort(
    (a, b) => data[a].reduce((s, v) => s + v, 0) - data[b].reduce((s, v) => s + v, 0),
  );
  const means: number[][] = [];
  for (let c = 0; c < k; c++) {
    const idx = order[Math.min(n - 1, Math.floor(((c + 0.5) * n) / k))];
    means.push([...data[idx]]);
  }
  return means;
}

function fitDiagonalGmm(data: number[][], k: number): GmmFit | null {
  const n = data.length;
  const d = data[0]?.length ?? 0;
  if (n < k * 5 || d === 0) return null;

  let means = initMeans(data, k);
  let variances: number[][] = Array.from({ length: k }, () => new Array(d).fill(1));
  let weights = new Array(k).fill(1 / k);
  let prevLL = -Infinity;
  let resp: number[][] = [];

  for (let iter = 0; iter < EM_MAX_ITER; iter++) {
    // E-step — 각 관측치가 각 군집에 속할 사후확률(책임값)
    let ll = 0;
    resp = data.map((x) => {
      const logProbs = means.map((mean, c) => Math.log(weights[c]) + logGaussianDiag(x, mean, variances[c]));
      const denom = logSumExp(logProbs);
      ll += denom;
      return logProbs.map((lp) => Math.exp(lp - denom));
    });

    if (iter > 0 && Math.abs(ll - prevLL) < EM_TOL) {
      prevLL = ll;
      break;
    }
    prevLL = ll;

    // M-step — 책임값 가중평균으로 평균·분산·비중 갱신
    const nk = new Array(k).fill(0);
    for (const r of resp) for (let c = 0; c < k; c++) nk[c] += r[c];

    const newMeans = Array.from({ length: k }, () => new Array(d).fill(0));
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < k; c++) {
        for (let j = 0; j < d; j++) newMeans[c][j] += resp[i][c] * data[i][j];
      }
    }
    for (let c = 0; c < k; c++) {
      if (nk[c] < 1e-6) continue;
      for (let j = 0; j < d; j++) newMeans[c][j] /= nk[c];
    }

    const newVariances = Array.from({ length: k }, () => new Array(d).fill(0));
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < k; c++) {
        for (let j = 0; j < d; j++) {
          newVariances[c][j] += resp[i][c] * (data[i][j] - newMeans[c][j]) ** 2;
        }
      }
    }
    for (let c = 0; c < k; c++) {
      if (nk[c] < 1e-6) {
        newVariances[c] = variances[c];
        continue;
      }
      for (let j = 0; j < d; j++) newVariances[c][j] = Math.max(newVariances[c][j] / nk[c], VARIANCE_FLOOR);
    }

    means = newMeans;
    variances = newVariances;
    weights = nk.map((v) => v / n);

    // 군집 하나가 표본을 거의 못 가져가면(붕괴) 이 k는 실패로 처리 — 호출부에서 다른 k로 대체
    if (weights.some((w) => w < 1e-6)) return null;
  }

  const assignments = resp.map((r) => r.indexOf(Math.max(...r)));
  return { weights, means, variances, logLikelihood: prevLL, assignments };
}

function computeGmmBic(fit: GmmFit, n: number, d: number, k: number): number {
  const numParams = k * d + k * d + (k - 1); // 평균 + 분산(대각) + 비중(k-1, 합이 1로 고정)
  return -2 * fit.logLikelihood + numParams * Math.log(n);
}

export type LpaProfile = {
  key: string;
  label: string;
  size: number;
  proportion: number;
  centroid: { SE: number; BO: number; TL: number };
};

export type LpaResult = {
  k: number;
  n: number;
  profiles: LpaProfile[];
  insufficientData: boolean;
};

const LPA_MIN_N = 30;
const LPA_LABELS = ["고몰입형", "헌신·몰두형", "번아웃위험형", "이탈예고형"];

export function computeLpaProfiles(
  perRespondent: Array<{ ohi: { SE: number | null; BO: number | null; TL: { TL: number | null } } }>,
): LpaResult {
  const rows: number[][] = [];
  for (const r of perRespondent) {
    const se = r.ohi.SE;
    const bo = r.ohi.BO;
    const tl = r.ohi.TL?.TL;
    if (se == null || bo == null || tl == null) continue;
    rows.push([se, bo, tl]);
  }

  if (rows.length < LPA_MIN_N) {
    return { k: 0, n: rows.length, profiles: [], insufficientData: true };
  }

  const d = 3;
  const means0 = [0, 1, 2].map((j) => average(rows.map((row) => row[j])) ?? 0);
  const sds0 = [0, 1, 2].map((j) => stdDev(rows.map((row) => row[j])) || 1);
  const z = rows.map((row) => row.map((v, j) => (v - means0[j]) / sds0[j]));

  let best: { fit: GmmFit; k: number; bic: number } | null = null;
  for (const k of [2, 3, 4]) {
    const fit = fitDiagonalGmm(z, k);
    if (!fit) continue;
    const bic = computeGmmBic(fit, z.length, d, k);
    if (!best || bic < best.bic) best = { fit, k, bic };
  }

  if (!best) {
    return { k: 0, n: rows.length, profiles: [], insufficientData: true };
  }

  const { fit, k } = best;
  const centroidsOriginal = fit.means.map((mean) => mean.map((v, j) => v * sds0[j] + means0[j]));
  const counts = new Array(k).fill(0);
  for (const c of fit.assignments) counts[c]++;

  // 건강도 점수(SE 높고·BO 낮고·TL 높을수록 건강) 기준 내림차순 정렬 후 라벨 부여
  const healthScore = (c: number[]) => c[0] - c[1] + c[2];
  const order = [...centroidsOriginal.keys()].sort(
    (a, b) => healthScore(centroidsOriginal[b]) - healthScore(centroidsOriginal[a]),
  );

  const profiles: LpaProfile[] = order.map((clusterIdx, rank) => ({
    key: `P${rank + 1}`,
    label: LPA_LABELS[rank] ?? `유형 ${rank + 1}`,
    size: counts[clusterIdx],
    proportion: counts[clusterIdx] / rows.length,
    centroid: {
      SE: centroidsOriginal[clusterIdx][0],
      BO: centroidsOriginal[clusterIdx][1],
      TL: centroidsOriginal[clusterIdx][2],
    },
  }));

  return { k, n: rows.length, profiles, insufficientData: false };
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
      band: bandOvi(ovi.OVI),
      dynamicCongruenceGap: dynamicGap,
    },
    oai: {
      ...oai,
    },
    oaiPattern,
  };
}

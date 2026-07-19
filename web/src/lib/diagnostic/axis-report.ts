import { bandOpportunityScore } from "@/lib/diagnostic/arc-scoring";
import type { OpenTextThemeReport, SubscaleThemeResult } from "@/lib/diagnostic/theme-mining";

export {
  oaiBandMessage,
  oriBandMessage,
  oviBandMessage,
  ohiBandMessage,
} from "@/lib/diagnostic/report-guide";

export type AxisInsight = {
  title: string;
  body: string;
  severity: "critical" | "warning" | "info";
};

export type OriScores = {
  ORI: number | null;
  CD: number | null;
  LA: number | null;
  AXS: number | null;
  AXC: number | null;
  band: string | null;
  opportunity: {
    band: string;
    prescription: string;
    AXA: number | null;
    AXG: number | null;
    oppScore: number | null;
  } | null;
  axMaturity: { stage: number; label: string } | null;
};

export type OviScores = {
  OVI: number | null;
  HV: number | null;
  CV: number | null;
  AV: number | null;
  band: string | null;
  dynamicCongruenceGap: number | null;
};

export type OaiScores = {
  OAI: number | null;
  SA: number | null;
  EA: number | null;
  OA: number | null;
  band: string | null;
};

export function buildCdReadinessInsight(cd02: number | null, cd04: number | null): AxisInsight | null {
  if (cd02 == null || cd04 == null) return null;
  const highTension = cd02 >= 3.5;
  const rigidCulture = cd04 <= 2.5;
  if (highTension && rigidCulture) {
    return {
      title: "위험 해빙 패턴",
      body: "변화 긴장감(CD02)은 높은데 관행 변경이 어렵다(CD04)고 느낍니다. 방향 없는 불안 상태 — Lewin 해빙 단계에서 가장 위험한 패턴입니다.",
      severity: "critical",
    };
  }
  if (highTension && cd04 >= 3.5) {
    return {
      title: "건강한 해빙",
      body: "변화 필요성을 공유하면서 관행도 바꿀 여지가 있습니다. 방향 커뮤니케이션을 강화하면 실행으로 이어질 수 있습니다.",
      severity: "info",
    };
  }
  if (!highTension && rigidCulture) {
    return {
      title: "정체·관성",
      body: "변화 긴장감이 낮고 관행 고착이 높습니다. 생존 불안·외부 환경 변화를 공유하는 해빙 메시지가 선행되어야 합니다.",
      severity: "warning",
    };
  }
  return null;
}

export function buildOviInsights(ovi: OviScores, cv01: number | null): AxisInsight[] {
  const insights: AxisInsight[] = [];
  if (ovi.HV != null && ovi.HV < 2.5) {
    insights.push({
      title: "조직건강 속도 악화 (HV)",
      body: `HV 평균 ${ovi.HV.toFixed(2)} — 지난 6개월 조직건강이 악화 방향입니다. Risk Index 핵심 신호와 함께 보세요.`,
      severity: "critical",
    });
  }
  if (ovi.dynamicCongruenceGap != null) {
    if (ovi.dynamicCongruenceGap > 0.3) {
      insights.push({
        title: "속도 과잉 (AV > HV)",
        body: `동적 정합성 격차 +${ovi.dynamicCongruenceGap.toFixed(2)} — 실제 속도가 역량 개선보다 빠릅니다. 실행 과속 위험.`,
        severity: "warning",
      });
    } else if (ovi.dynamicCongruenceGap < -0.3) {
      insights.push({
        title: "역량 대비 정체 (HV > AV)",
        body: `동적 정합성 격차 ${ovi.dynamicCongruenceGap.toFixed(2)} — 역량은 있는데 속도가 따라오지 못합니다.`,
        severity: "warning",
      });
    }
  }
  if (cv01 != null && cv01 < 2.5) {
    insights.push({
      title: "실행 병목 (CV01)",
      body: `결정→현장 적용 속도 ${cv01.toFixed(2)} — Lewin '장 변화' 유량이 가장 낮은 구간입니다. 즉시 개선 우선.`,
      severity: "critical",
    });
  }
  if (ovi.AV != null && ovi.CV != null && ovi.AV - ovi.CV > 0.5) {
    insights.push({
      title: "AX 속도 > 변화 실행 속도",
      body: "AI 전환은 빠르게 진행되는데 일반 변화 실행은 느립니다. AX와 비AX 프로세스 간 격차를 조율하세요.",
      severity: "info",
    });
  }
  return insights.slice(0, 3);
}

export function buildOaiWeightedBreakdown(sa: number | null, ea: number | null, oa: number | null) {
  if (sa == null || ea == null || oa == null) return null;
  return {
    SA: { score: sa, weight: 0.4, contribution: sa * 0.4 },
    EA: { score: ea, weight: 0.35, contribution: ea * 0.35 },
    OA: { score: oa, weight: 0.25, contribution: oa * 0.25 },
    total: sa * 0.4 + ea * 0.35 + oa * 0.25,
  };
}

export function buildOaiInsights(
  oai: OaiScores,
  ohi: number | null,
  ori: number | null,
  ovi: number | null,
): AxisInsight[] {
  const insights: AxisInsight[] = [];
  const hi = (v: number | null) => v != null && v >= 3.5;
  const lo = (v: number | null) => v != null && v < 3.5;

  if (hi(ohi) && hi(ovi) && lo(oai.OAI)) {
    insights.push({
      title: "빠른 오류 패턴",
      body: "건강하고 빠른데 방향이 어긋날 수 있습니다. 3축만 보면 최우수 조직으로 오인하기 쉽습니다.",
      severity: "critical",
    });
  }
  if (lo(ohi) && lo(ovi) && hi(oai.OAI)) {
    insights.push({
      title: "느리지만 정확",
      body: "지치고 느리지만 방향은 맞습니다. OHI·OVI 회복 후 성과가 따라올 수 있습니다.",
      severity: "info",
    });
  }
  if (hi(ori) && lo(oai.OAI)) {
    insights.push({
      title: "준비됐지만 방향 없음",
      body: "역량과 의지는 있는데 정렬이 부족합니다. 전략-현장 연결(SA)부터 재정비하세요.",
      severity: "warning",
    });
  }

  const axes = [
    { key: "SA", label: "전략정렬", value: oai.SA },
    { key: "EA", label: "에너지정렬", value: oai.EA },
    { key: "OA", label: "결과정렬", value: oai.OA },
  ].filter((a) => a.value != null) as Array<{ key: string; label: string; value: number }>;
  if (axes.length === 3) {
    const weakest = [...axes].sort((a, b) => a.value - b.value)[0];
    if (weakest.value < 3.0) {
      insights.push({
        title: `최약 축 — ${weakest.label}`,
        body: `${weakest.key} ${weakest.value.toFixed(2)} — OAI 개선의 1순위 레버입니다.`,
        severity: "warning",
      });
    }
  }
  return insights.slice(0, 3);
}

export function buildOpportunityInsight(opp: OriScores["opportunity"]): string | null {
  if (!opp || opp.oppScore == null) return null;
  const scored = bandOpportunityScore(opp.oppScore);
  if (!scored) return null;
  const axa = opp.AXA?.toFixed(2) ?? "—";
  const axg = opp.AXG?.toFixed(2) ?? "—";
  return `Opportunity Score ${opp.oppScore >= 0 ? "+" : ""}${opp.oppScore.toFixed(2)} (AXA ${axa} − AXG ${axg}) · ${scored.band} — ${scored.prescription}`;
}

/**
 * ICC(1) 구간 해석 — 리포트 표시용 가이드.
 * 계산식(`computeIcc1`)은 변경하지 않고, 값의 의미를 읽는 문구만 제공한다.
 */
export function buildIccInterpretation(icc: number | null | undefined): string | null {
  if (icc == null || !Number.isFinite(icc)) return null;
  if (icc < 0.05) {
    return "팀 간 차이가 크지 않아 조직 단위 해석을 권장합니다";
  }
  if (icc <= 0.2) {
    return "팀 간 차이가 보통 수준입니다";
  }
  return "팀별 개입 근거가 충분합니다";
}

export const ORI_RADAR_LABELS: Record<string, string> = {
  CD: "변화방향",
  LA: "학습적응",
  AXS: "AX전략",
  AXC: "AX역량",
};

export const OVI_DIM_LABELS: Record<string, string> = {
  HV: "건강속도",
  CV: "실행속도",
  AV: "AX속도",
};

export const OAI_DIM_LABELS: Record<string, string> = {
  SA: "전략정렬",
  EA: "에너지정렬",
  OA: "결과정렬",
};

export const ORI_OPEN_TEXT_CODES = ["CD", "OPP"];
export const OVI_OPEN_TEXT_CODES = ["HV"];
export const OAI_OPEN_TEXT_CODES = ["OA"];

export function filterThemesByCodes(
  report: OpenTextThemeReport | null,
  codes: string[],
): SubscaleThemeResult[] {
  if (!report) return [];
  return report.sections.filter((s) =>
    codes.some((c) => s.subscaleCode === c || s.subscaleCode.startsWith(c)),
  );
}

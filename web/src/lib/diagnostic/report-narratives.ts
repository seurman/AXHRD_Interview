import type { DriverImportanceSummary, LpaResult } from "@/lib/diagnostic/arc-scoring";
import type { PrescriptionItem } from "@/lib/diagnostic/prescription";

export type KeyFinding = {
  rank: number;
  title: string;
  body: string;
  severity: "critical" | "warning" | "info";
};

const DRIVER_LABELS: Record<string, string> = {
  SL: "경영진 리더십",
  SV: "직속 상사",
  PS: "심리적 안전",
  EM: "구조·자율권",
  PM: "성과·보상",
  LG: "학습·성장",
  CI: "문화·포용",
  WE: "업무 환경",
  C: "소통·정보",
};

const QUADRANT_LABEL: Record<string, string> = {
  IDEAL: "이상 구역",
  POSITIVE_GAP: "속도 과잉",
  CRISIS: "위기 구역",
  NEGATIVE_GAP: "방향 부재",
};

type ScoresInput = {
  ohi: {
    overall: number | null;
    riskIndex: number | null;
    band: string | null;
    drivers: Record<string, { current: number | null; importance: number | null }>;
  };
  ori: { ORI: number | null; band: string | null };
  ovi: { OVI: number | null; band: string | null; dynamicCongruenceGap: number | null };
  oai: { OAI: number | null; band: string | null };
  oaiPattern: { pattern: string; message: string } | null;
};

export type ExecutiveSummaryParts = {
  /** 한 문단 스토리 */
  story: string;
  /** 표본·익명·용도 주의 */
  caution: string;
};

export function buildExecutiveSummary(input: {
  scores: ScoresInput;
  sampleSize: number;
  collectionRate: number | null;
  inviteLinkCount?: number | null;
  waveLabel: string | null;
  waveNumber: number;
  enabledAxes?: Array<"OHI" | "ORI" | "OVI" | "OAI">;
}): string {
  return buildExecutiveSummaryParts(input).story;
}

export function buildExecutiveSummaryParts(input: {
  scores: ScoresInput;
  sampleSize: number;
  collectionRate: number | null;
  inviteLinkCount?: number | null;
  waveLabel: string | null;
  waveNumber: number;
  enabledAxes?: Array<"OHI" | "ORI" | "OVI" | "OAI">;
}): ExecutiveSummaryParts {
  const { scores: s, sampleSize, collectionRate, inviteLinkCount, waveLabel, waveNumber } = input;
  const enabled = new Set(input.enabledAxes ?? ["OHI", "ORI", "OVI", "OAI"]);

  const axes: string[] = [];
  if (enabled.has("OHI") && s.ohi.overall != null) {
    axes.push(`조직 건강(OHI) ${s.ohi.overall.toFixed(2)}${s.ohi.band ? `(${s.ohi.band})` : ""}`);
  }
  if (enabled.has("ORI") && s.ori.ORI != null) {
    axes.push(`변화 준비(ORI) ${s.ori.ORI.toFixed(2)}${s.ori.band ? `(${s.ori.band})` : ""}`);
  }
  if (enabled.has("OVI") && s.ovi.OVI != null) {
    axes.push(`변화 속도(OVI) ${s.ovi.OVI.toFixed(2)}${s.ovi.band ? `(${s.ovi.band})` : ""}`);
  }
  if (enabled.has("OAI") && s.oai.OAI != null) {
    axes.push(`방향 정렬(OAI) ${s.oai.OAI.toFixed(2)}${s.oai.band ? `(${s.oai.band})` : ""}`);
  }

  const waveBit = `Wave ${waveNumber}${waveLabel ? ` 「${waveLabel}」` : ""}`;
  let rateBit = "수집률 정보는 아직 없습니다.";
  if (collectionRate != null && inviteLinkCount != null && inviteLinkCount > 0) {
    if (collectionRate <= 100) {
      rateBit = `초대 링크 ${inviteLinkCount}개 대비 수집률은 약 ${collectionRate}%입니다.`;
    } else {
      const per = (sampleSize / inviteLinkCount).toFixed(1);
      rateBit = `초대 링크 ${inviteLinkCount}개로 ${sampleSize}명 응답을 모았습니다(링크당 평균 ${per}명 · 공유 링크는 100%를 넘을 수 있음).`;
    }
  } else if (collectionRate != null) {
    rateBit = `수집률은 약 ${collectionRate}%입니다.`;
  }

  let story: string;
  if (axes.length === 0) {
    story = `${waveBit} 결과를 정리했습니다. 유효 응답은 ${sampleSize}명이며, ${rateBit} 표시할 4축 점수가 아직 충분하지 않습니다. 아래 입문과 표본 조건을 먼저 확인해 주세요.`;
  } else {
    const patternBit = s.oaiPattern
      ? ` 4축을 겹쳐 보면 「${s.oaiPattern.pattern}」 패턴으로 읽힙니다.`
      : "";
    const riskBit =
      s.ohi.riskIndex != null && s.ohi.riskIndex >= 0.35
        ? ` 이탈·번아웃 위험 신호는 약 ${Math.round(s.ohi.riskIndex * 100)}%로, 우선 살펴볼 신호입니다.`
        : "";
    story = `${waveBit} 익명 응답 ${sampleSize}명을 기준으로 보면, ${axes.join(", ")}입니다.${patternBit}${riskBit} 아래에서는 점수의 의미 → 핵심 발견 → 처방 순으로 읽으면 됩니다.`;
  }

  const caution = `이 수치는 조직개발용 집계입니다. 개인 인사·평가에 쓰지 않으며, 5명 미만 단위는 공개하지 않습니다. ${rateBit} 해석이 어려우면 ‘이 리포트를 읽는 법’과 각 축의 한 줄 정의를 먼저 보세요.`;

  return { story, caution };
}

export function buildKeyFindings(input: {
  scores: ScoresInput;
  driverImportance?: DriverImportanceSummary;
  lpa?: LpaResult;
  gapMatrix?: {
    teams?: Array<{ teamName: string; quadrant: string | null; ORI: number | null; OVI: number | null }>;
  } | null;
}): KeyFinding[] {
  const findings: KeyFinding[] = [];
  const { scores: s, driverImportance, lpa, gapMatrix } = input;

  if (driverImportance && !driverImportance.insufficientData) {
    const top = [...driverImportance.entries]
      .filter((e) => e.priority === "FOCUS" && e.beta != null)
      .sort((a, b) => (b.beta ?? 0) - (a.beta ?? 0))[0];
    if (top) {
      findings.push({
        rank: findings.length + 1,
        title: `SE에 가장 큰 영향 — ${DRIVER_LABELS[top.code] ?? top.code}`,
        body: `β회귀 기준 활력·헌신·몰두(SE)에 대한 실질 영향력이 가장 크면서(β=${top.beta?.toFixed(2)}) 현재 수준이 낮습니다. 조직 개입의 1순위 출발점입니다.`,
        severity: "critical",
      });
    }
  }

  if (s.ohi.riskIndex != null && s.ohi.riskIndex >= 0.35) {
    findings.push({
      rank: findings.length + 1,
      title: `이탈·번아웃 위험 신호 ${Math.round(s.ohi.riskIndex * 100)}%`,
      body: "헌신 저하·활력 저하·이직 의도 신호가 복합적으로 높습니다. 고위험군 식별과 1:1 스테이 인터뷰를 우선 검토하세요.",
      severity: "critical",
    });
  }

  if (lpa && !lpa.insufficientData) {
    const risky = lpa.profiles.filter((p) => p.label === "번아웃위험형" || p.label === "이탈예고형");
    const share = risky.reduce((sum, p) => sum + p.proportion, 0);
    if (share >= 0.2) {
      findings.push({
        rank: findings.length + 1,
        title: `고위험 구성원 유형 ${Math.round(share * 100)}%`,
        body: `LPA 분석 기준 번아웃위험형·이탈예고형 합산이 ${Math.round(share * 100)}%입니다. 팀 단위가 아닌 개인 단위 개입이 필요합니다.`,
        severity: share >= 0.3 ? "critical" : "warning",
      });
    }
  }

  if (s.ovi.dynamicCongruenceGap != null && s.ovi.dynamicCongruenceGap < -0.3) {
    findings.push({
      rank: findings.length + 1,
      title: "속도-역량 불일치(동적 정합성 격차)",
      body: `실제 속도(AV)가 보유 역량(HV)보다 낮습니다(격차 ${s.ovi.dynamicCongruenceGap.toFixed(2)}). 빠르게 가려 하지만 실행 역량이 따라오지 못하는 패턴입니다.`,
      severity: "warning",
    });
  }

  if (s.oaiPattern && s.oaiPattern.pattern !== "이상적 조직") {
    findings.push({
      rank: findings.length + 1,
      title: `4축 패턴 — ${s.oaiPattern.pattern}`,
      body: s.oaiPattern.message,
      severity: s.oaiPattern.pattern === "빠른 오류" ? "critical" : "warning",
    });
  }

  const crisisTeams = gapMatrix?.teams?.filter((t) => t.quadrant === "CRISIS") ?? [];
  if (crisisTeams.length > 0) {
    findings.push({
      rank: findings.length + 1,
      title: `위기 구역 팀 ${crisisTeams.length}개`,
      body: `${crisisTeams
        .slice(0, 3)
        .map((t) => t.teamName)
        .join(", ")}${crisisTeams.length > 3 ? " 외" : ""} — ORI·OVI 모두 조직 평균 이하입니다.`,
      severity: "warning",
    });
  }

  if (findings.length === 0 && s.ohi.overall != null) {
    findings.push({
      rank: 1,
      title: "전반적 안정 구간",
      body: "긴급 개입 신호는 제한적입니다. 강점 유지와 Wave 2 재진단 설계에 집중하세요.",
      severity: "info",
    });
  }

  return findings.slice(0, 3).map((f, i) => ({ ...f, rank: i + 1 }));
}

export function highRiskSegmentPercent(lpa?: LpaResult): number | null {
  if (!lpa || lpa.insufficientData) return null;
  const risky = lpa.profiles.filter((p) => p.label === "번아웃위험형" || p.label === "이탈예고형");
  return Math.round(risky.reduce((s, p) => s + p.proportion, 0) * 100);
}

export function quadrantLabel(code: string | null): string {
  if (!code) return "—";
  return QUADRANT_LABEL[code] ?? code;
}

export type WaveGoal = {
  wave: number;
  title: string;
  targets: string[];
};

export function buildWaveGoals(input: {
  scores: ScoresInput;
  prescriptions: PrescriptionItem[];
}): WaveGoal[] {
  const { scores: s, prescriptions } = input;
  const focusDrivers = prescriptions
    .filter((p) => p.source === "driver")
    .slice(0, 2)
    .map((p) => p.title);

  const wave2Targets = [
    focusDrivers[0] ? `${focusDrivers[0]} 파일럿 완료` : "IPA 1순위 드라이버 개입 착수",
    s.ohi.riskIndex != null && s.ohi.riskIndex >= 0.3 ? "고위험군 1:1 면담 80% 완료" : "팀별 액션 플랜 수립",
    "주관식 테마 기반 개선 과제 3건 이상 실행",
  ];

  const wave3Targets = [
    "OHI SE +0.15p 이상 개선",
    s.ovi.dynamicCongruenceGap != null && s.ovi.dynamicCongruenceGap < 0 ? "OVI 동적 정합성 격차 축소" : "4축 균형 유지",
    "Wave 3 재진단으로 개입 효과 검증",
  ];

  return [
    { wave: 2, title: "Wave 2 — 실행·정착", targets: wave2Targets },
    { wave: 3, title: "Wave 3 — 검증·확산", targets: wave3Targets },
  ];
}

export { DRIVER_LABELS };

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

export function buildExecutiveSummary(input: {
  scores: ScoresInput;
  sampleSize: number;
  collectionRate: number | null;
  waveLabel: string | null;
  waveNumber: number;
}): string {
  const { scores: s, sampleSize, collectionRate, waveLabel, waveNumber } = input;
  const parts: string[] = [];
  parts.push(
    `Wave ${waveNumber}${waveLabel ? `(${waveLabel})` : ""} 진단 결과, 유효 응답 ${sampleSize}명`,
  );
  if (collectionRate != null) parts.push(`수집률 약 ${collectionRate}%`);
  if (s.ohi.overall != null) parts.push(`OHI ${s.ohi.overall.toFixed(2)}(${s.ohi.band ?? "—"})`);
  if (s.ori.ORI != null) parts.push(`ORI ${s.ori.ORI.toFixed(2)}`);
  if (s.ovi.OVI != null) parts.push(`OVI ${s.ovi.OVI.toFixed(2)}`);
  if (s.oai.OAI != null) parts.push(`OAI ${s.oai.OAI.toFixed(2)}`);
  if (s.oaiPattern) parts.push(`조직 패턴은 「${s.oaiPattern.pattern}」`);
  return parts.join(" · ") + "입니다.";
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

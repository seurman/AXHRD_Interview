import { prisma } from "@/lib/prisma";
import { computeAggregateScores } from "@/lib/diagnostic/aggregate";
import { DRIVER_LABELS } from "@/lib/diagnostic/report-narratives";

export type CompetencyGapRecommendation = {
  competencyCode: string;
  driverCode: string;
  driverLabel: string;
  beta: number | null;
  current: number | null;
  rationale: string;
  weight: number;
};

export type GapRecommendationReason =
  | "feature_disabled"
  | "no_closed_wave"
  | "insufficient_data"
  | "no_focus_drivers"
  | "no_mapped_edges"
  | null;

export type CompetencyGapRecommendationResult = {
  recommendations: CompetencyGapRecommendation[];
  reason: GapRecommendationReason;
  message: string | null;
  waveId: string | null;
  waveLabel: string | null;
  insufficientData: boolean;
  focusDriverCodes: string[];
};

/**
 * Gap-to-Hire: 최근 CLOSED 웨이브의 IPA FOCUS 드라이버 → ConceptRelation SIGNALS → NCS 역량 추천.
 * LLM 미사용 · computeDriverImportance insufficientData 가드 존중.
 */
export async function getCompetencyGapRecommendations(
  organizationId: string,
): Promise<CompetencyGapRecommendationResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { diagnosticEnabled: true, interviewEnabled: true },
  });

  if (!org?.diagnosticEnabled || !org.interviewEnabled) {
    return empty("feature_disabled", "조직진단과 면접 기능이 모두 활성화된 기관에서만 추천합니다.", null, null);
  }

  const wave = await prisma.diagnosticWave.findFirst({
    where: { organizationId, status: "CLOSED" },
    orderBy: [{ waveNumber: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, waveNumber: true },
  });

  if (!wave) {
    return empty(
      "no_closed_wave",
      "완료(CLOSED)된 조직진단 웨이브가 없습니다. 진단 마감 후 다시 확인하세요.",
      null,
      null,
    );
  }

  const scores = await computeAggregateScores({ waveId: wave.id });
  if (scores.hidden || !("driverImportance" in scores) || !scores.driverImportance) {
    return empty(
      "insufficient_data",
      "집계할 수 있는 응답이 부족하거나 리포트가 숨김 처리되었습니다.",
      wave.id,
      waveLabel(wave),
    );
  }

  const { driverImportance } = scores;
  if (driverImportance.insufficientData) {
    return {
      recommendations: [],
      reason: "insufficient_data",
      message: `표본이 부족해 드라이버 중요도(IPA)를 계산하지 못했습니다 (완전사례 n=${driverImportance.n}, 최소 27).`,
      waveId: wave.id,
      waveLabel: waveLabel(wave),
      insufficientData: true,
      focusDriverCodes: [],
    };
  }

  const focusEntries = driverImportance.entries.filter((e) => e.priority === "FOCUS");
  if (focusEntries.length === 0) {
    return {
      recommendations: [],
      reason: "no_focus_drivers",
      message: "개선 우선순위(FOCUS) 드라이버가 없습니다. 현재 킷 구성을 유지해도 됩니다.",
      waveId: wave.id,
      waveLabel: waveLabel(wave),
      insufficientData: false,
      focusDriverCodes: [],
    };
  }

  const focusCodes = focusEntries.map((e) => e.code);
  const focusByCode = new Map(focusEntries.map((e) => [e.code, e]));

  const edges = await prisma.conceptRelation.findMany({
    where: {
      isActive: true,
      edgeType: "SIGNALS",
      fromKind: "DIAGNOSTIC_SUBSCALE",
      toKind: "NCS_COMPETENCY",
      fromKey: { in: focusCodes },
    },
    orderBy: [{ weight: "desc" }, { fromKey: "asc" }],
  });

  if (edges.length === 0) {
    return {
      recommendations: [],
      reason: "no_mapped_edges",
      message: `FOCUS 드라이버(${focusCodes.join(", ")})에 연결된 면접 역량 매핑이 없습니다. Meaning 시드(SIGNALS)를 확인하세요.`,
      waveId: wave.id,
      waveLabel: waveLabel(wave),
      insufficientData: false,
      focusDriverCodes: focusCodes,
    };
  }

  /** 역량당 가장 강한(가중치↑) FOCUS 드라이버 하나만 노출 */
  const bestByCompetency = new Map<string, CompetencyGapRecommendation>();
  for (const edge of edges) {
    const driver = focusByCode.get(edge.fromKey);
    if (!driver) continue;
    const driverLabel = DRIVER_LABELS[edge.fromKey] ?? edge.fromKey;
    const betaStr =
      driver.beta != null && Number.isFinite(driver.beta) ? driver.beta.toFixed(2) : "—";
    const currentStr =
      driver.current != null && Number.isFinite(driver.current)
        ? driver.current.toFixed(2)
        : "—";
    const candidate: CompetencyGapRecommendation = {
      competencyCode: edge.toKey,
      driverCode: edge.fromKey,
      driverLabel,
      beta: driver.beta,
      current: driver.current,
      weight: edge.weight,
      rationale: `조직진단 결과 기반 추천 — ${driverLabel} 개선 우선순위(β=${betaStr}, 현재 ${currentStr}점)`,
    };
    const prev = bestByCompetency.get(edge.toKey);
    if (!prev || candidate.weight > prev.weight) {
      bestByCompetency.set(edge.toKey, candidate);
    }
  }

  const recommendations = [...bestByCompetency.values()].sort(
    (a, b) => b.weight - a.weight || (b.beta ?? 0) - (a.beta ?? 0),
  );

  return {
    recommendations,
    reason: null,
    message: null,
    waveId: wave.id,
    waveLabel: waveLabel(wave),
    insufficientData: false,
    focusDriverCodes: focusCodes,
  };
}

function waveLabel(wave: { label: string | null; waveNumber: number }): string {
  return wave.label?.trim() || `웨이브 ${wave.waveNumber}`;
}

function empty(
  reason: GapRecommendationReason,
  message: string,
  waveId: string | null,
  waveLabelValue: string | null,
): CompetencyGapRecommendationResult {
  return {
    recommendations: [],
    reason,
    message,
    waveId,
    waveLabel: waveLabelValue,
    insufficientData: reason === "insufficient_data",
    focusDriverCodes: [],
  };
}

import { DRIVER_LABELS } from "@/lib/diagnostic/report-narratives";

export type ScoreStatus = "탁월" | "양호" | "보통" | "주의";

const BENCHMARK = 3.5;

export function scoreStatus(value: number | null, benchmark = BENCHMARK): ScoreStatus | null {
  if (value == null) return null;
  if (value >= 4.5) return "탁월";
  if (value >= benchmark) return "양호";
  if (value >= 2.5) return "보통";
  return "주의";
}

export function gapValue(current: number | null, target: number | null): number | null {
  if (current == null || target == null) return null;
  return target - current;
}

export type AnalysisRow = {
  id: string;
  label: string;
  score: number | null;
  benchmark?: number | null;
  secondary?: number | null;
  secondaryLabel?: string;
  gap?: number | null;
  status: ScoreStatus | null;
  note: string;
};

export function buildSeAnalysisRows(input: {
  E: number | null;
  C: number | null;
  F: number | null;
  SE: number | null;
}): AnalysisRow[] {
  const rows: Array<[string, string, number | null, string]> = [
    ["E", "활력 (Energy)", input.E, "업무 에너지·끈기"],
    ["C", "헌신·연결 (Commitment)", input.C, "의미·미래연결 — C03≤2 Risk 신호"],
    ["F", "몰두 (Focus)", input.F, "몰입·집중도"],
    ["SE", "SE 종합", input.SE, "드라이버 IPA의 종속변수"],
  ];
  return rows.map(([id, label, score, note]) => ({
    id,
    label,
    score,
    benchmark: BENCHMARK,
    gap: gapValue(score, BENCHMARK),
    status: scoreStatus(score),
    note,
  }));
}

export function buildTlAnalysisRows(input: {
  trust: number | null;
  growth: number | null;
  safety: number | null;
  TL: number | null;
}): AnalysisRow[] {
  const rows: Array<[string, string, number | null, string]> = [
    ["trust", "신뢰", input.trust, "팀 리더 신뢰"],
    ["growth", "성장", input.growth, "코칭·발전 지원"],
    ["safety", "안전", input.safety, "심리적 안전 리더십"],
    ["TL", "TL 종합", input.TL, "HLM 보조 변수"],
  ];
  return rows.map(([id, label, score, note]) => ({
    id,
    label,
    score,
    benchmark: BENCHMARK,
    gap: gapValue(score, BENCHMARK),
    status: scoreStatus(score),
    note,
  }));
}

export function buildDriverAnalysisRows(
  drivers: Record<string, { current: number | null; importance: number | null }>,
  ipa?: {
    entries: Array<{
      code: string;
      beta: number | null;
      priority: "FOCUS" | "MAINTAIN" | null;
    }>;
  },
): AnalysisRow[] {
  const betaByCode = new Map((ipa?.entries ?? []).map((e) => [e.code, e]));
  return Object.entries(drivers).map(([code, d]) => {
    const ipaEntry = betaByCode.get(code);
    const g = gapValue(d.current, d.importance);
    let note = "현재·중요도 격차";
    if (ipaEntry?.priority === "FOCUS") note = "IPA 집중개선 — β 높고 현재 낮음";
    else if (ipaEntry?.priority === "MAINTAIN") note = "IPA 현상유지";
    else if (g != null && g > 0.5) note = "중요도 대비 현재 부족";
    return {
      id: code,
      label: DRIVER_LABELS[code] ?? code,
      score: d.current,
      benchmark: d.importance,
      secondary: ipaEntry?.beta ?? null,
      secondaryLabel: "β",
      gap: g,
      status: scoreStatus(d.current),
      note,
    };
  });
}

export function buildOriSubscaleRows(input: {
  CD: number | null;
  LA: number | null;
  AXS: number | null;
  AXC: number | null;
}): AnalysisRow[] {
  return [
    { id: "CD", label: "CD 변화준비방향", score: input.CD, note: "방향·해빙·지도부 신뢰" },
    { id: "LA", label: "LA 학습적응역량", score: input.LA, note: "조직 학습·회복탄력성" },
    { id: "AXS", label: "AX-S 전략준비", score: input.AXS, note: "AI 전략·윤리·책임구조" },
    { id: "AXC", label: "AX-C 역량준비", score: input.AXC, note: "AI 활용·검증 역량" },
  ].map((r) => ({
    ...r,
    benchmark: BENCHMARK,
    gap: gapValue(r.score, BENCHMARK),
    status: scoreStatus(r.score),
  }));
}

export function buildOviSubscaleRows(input: {
  HV: number | null;
  CV: number | null;
  AV: number | null;
}): AnalysisRow[] {
  return [
    { id: "HV", label: "HV 조직건강 속도", score: input.HV, note: "6개월 건강 변화 방향 · <2.5 악화" },
    { id: "CV", label: "CV 변화실행 속도", score: input.CV, note: "결정→현장 적용 속도" },
    { id: "AV", label: "AV AX전환 속도", score: input.AV, note: "AI 확산·업무변화 속도" },
  ].map((r) => ({
    ...r,
    benchmark: BENCHMARK,
    gap: gapValue(r.score, BENCHMARK),
    status: scoreStatus(r.score),
  }));
}

export function buildOaiSubscaleRows(input: {
  SA: number | null;
  EA: number | null;
  OA: number | null;
}): AnalysisRow[] {
  const weights: Record<string, number> = { SA: 0.4, EA: 0.35, OA: 0.25 };
  return [
    { id: "SA", label: "SA 전략정렬", score: input.SA, note: "전략-현장 연결 (가중 40%)" },
    { id: "EA", label: "EA 에너지정렬", score: input.EA, note: "에너지 투입 방향 (가중 35%)" },
    { id: "OA", label: "OA 결과정렬", score: input.OA, note: "변화 결과 수렴 (가중 25%)" },
  ].map((r) => ({
    ...r,
    benchmark: BENCHMARK,
    gap: gapValue(r.score, BENCHMARK),
    status: scoreStatus(r.score),
    secondary: r.score != null ? r.score * weights[r.id] : null,
    secondaryLabel: "기여",
  }));
}

export function buildFourAxisRows(input: {
  ohi: number | null;
  ori: number | null;
  ovi: number | null;
  oai: number | null;
}): AnalysisRow[] {
  return [
    { id: "OHI", label: "OHI 조직건강", score: input.ohi, note: "지금의 조직 상태" },
    { id: "ORI", label: "ORI 변화준비", score: input.ori, note: "미래 대비 역량" },
    { id: "OVI", label: "OVI 조직속도", score: input.ovi, note: "6개월 변화 방향" },
    { id: "OAI", label: "OAI 방향정렬", score: input.oai, note: "올바른 방향 여부" },
  ].map((r) => ({
    ...r,
    benchmark: BENCHMARK,
    gap: gapValue(r.score, BENCHMARK),
    status: scoreStatus(r.score),
  }));
}

export function buildItemAnalysisRows(
  items: Array<{ code: string; label: string; score: number | null; note?: string }>,
): AnalysisRow[] {
  return items.map((it) => ({
    id: it.code,
    label: `${it.code} ${it.label}`,
    score: it.score,
    benchmark: BENCHMARK,
    gap: gapValue(it.score, BENCHMARK),
    status: scoreStatus(it.score),
    note: it.note ?? "",
  }));
}

export const STATUS_CLASS: Record<ScoreStatus, string> = {
  탁월: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  양호: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  보통: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  주의: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

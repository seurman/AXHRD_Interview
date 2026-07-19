import { formatScore } from "@/lib/diagnostic/format-score";
import { bandOai, bandOvi, healthBand } from "@/lib/diagnostic/arc-scoring";

export type AxisCode = "OHI" | "ORI" | "OVI" | "OAI";

/** 리포트 입문 — ‘말하는 것 / 말하지 않는 것 / 읽는 순서’ */
export const REPORT_GUIDE = {
  title: "이 리포트를 읽는 법",
  says: [
    "구성원이 익명으로 느낀 조직의 건강(OHI), 변화 준비(ORI), 변화 속도(OVI), 방향 정렬(OAI)입니다.",
    "점수는 1.00~5.00 척도이며, 보통 기준선은 3.50입니다. 높을수록(역문항 보정 후) 긍정적 신호입니다.",
    "중요도·갭·처방은 ‘어디에 힘을 실을지’를 가리키는 조직개발용 신호입니다.",
  ],
  doesNotSay: [
    "개인을 평가·인사 조치하는 자료가 아닙니다.",
    "응답자 수가 5명 미만인 조직 단위는 숨겨져 결과가 제공되지 않습니다.",
    "이직·해고·보상 결정의 직접적인 근거로 쓰지 않습니다.",
  ],
  readingOrder: [
    "종합 펄스(4축)로 전체 온도를 봅니다.",
    "핵심 발견·처방으로 ‘지금 무엇을 할지’를 확인합니다.",
    "필요하면 OHI → 갭 → ORI/OVI/OAI 순으로 깊게 들어갑니다.",
  ],
} as const;

export const AXIS_DEFINITIONS: Record<
  AxisCode,
  { name: string; oneLiner: string }
> = {
  OHI: {
    name: "조직 건강",
    oneLiner: "지금 구성원이 얼마나 에너지 있고, 연결되어 있으며, 안전하게 일할 수 있는지",
  },
  ORI: {
    name: "변화 준비도",
    oneLiner: "앞으로의 변화·AI 전환을 받아들일 방향·학습·역량이 갖춰져 있는지",
  },
  OVI: {
    name: "변화 속도",
    oneLiner: "지난 기간 실제로 리더십·절차·업무 방식이 얼마나 움직였는지",
  },
  OAI: {
    name: "방향 정렬",
    oneLiner: "전략·에너지·결과가 같은 방향을 보고 맞물리는지",
  },
};

const BENCH = 3.5;

function vsBench(value: number): string {
  const d = value - BENCH;
  if (Math.abs(d) < 0.08) return `기준선(${formatScore(BENCH)})과 비슷한 수준`;
  if (d > 0) return `기준선(${formatScore(BENCH)})보다 ${formatScore(d)}점 높음`;
  return `기준선(${formatScore(BENCH)})보다 ${formatScore(Math.abs(d))}점 낮음`;
}

/** Score Hero 카드용 — 정의 + 점수 한 줄 */
export function buildAxisMeaningLine(
  code: AxisCode,
  value: number | null | undefined,
  band?: string | null,
): string {
  const def = AXIS_DEFINITIONS[code];
  if (value == null || !Number.isFinite(value)) {
    return `${def.oneLiner}. (이번 집계에서는 점수 없음)`;
  }
  const bandBit = band ? ` · ${band}` : "";
  return `${def.oneLiner}. 현재 ${formatScore(value)}${bandBit} — ${vsBench(value)}.`;
}

export function ohiBandMessage(overall: number | null, band: string | null): string {
  if (overall == null) return "조직 건강 점수를 집계할 응답이 아직 부족합니다.";
  const b = band ?? healthBand(overall);
  const lead = `OHI는 ‘지금 조직이 얼마나 건강한가’입니다. 현재 ${formatScore(overall)}점(${b ?? "—"})으로, ${vsBench(overall)}.`;
  if (b === "탁월") {
    return `${lead} 강점을 유지하되, 과한 투자가 없는지 드라이버 격차만 가볍게 확인하면 됩니다.`;
  }
  if (b === "양호") {
    return `${lead} 전반은 괜찮습니다. 중요도는 높은데 현재가 낮은 드라이버에 자원을 모으세요.`;
  }
  if (b === "보통") {
    return `${lead} 강점과 약점이 섞여 있습니다. 심리적 안전·리더십·업무량 중 낮은 축부터 살펴보세요.`;
  }
  return `${lead} 주의가 필요한 구간입니다. Risk·활력(E)·미래 연결감부터 함께 보는 것을 권합니다.`;
}

export function oriBandMessage(ori: number | null, band: string | null): string {
  if (ori == null) return "변화 준비도 점수를 집계할 응답이 아직 부족합니다.";
  const b = band ?? healthBand(ori);
  const lead = `ORI는 ‘앞으로의 변화를 받아들일 준비’입니다. 현재 ${formatScore(ori)}점(${b ?? "—"})으로, ${vsBench(ori)}.`;
  if (b === "탁월") return `${lead} 준비는 충분합니다. AX 확산·실험의 폭을 넓혀도 좋은 상태입니다.`;
  if (b === "양호") return `${lead} 역량은 쌓이는 중입니다. Opportunity(쓰고 싶다 vs 막힌다)로 막힌 점을 짚어보세요.`;
  if (b === "보통") return `${lead} 준비와 저항이 공존합니다. 방향(CD)과 학습(LA) 중 낮은 쪽부터 손보세요.`;
  return `${lead} 준비가 얇습니다. 변화의 이유(해빙)와 사용 기준(거버넌스)부터 맞추는 것이 안전합니다.`;
}

export function oviBandMessage(ovi: number | null, band: string | null): string {
  if (ovi == null) return "변화 속도 점수를 집계할 응답이 아직 부족합니다.";
  const b = band ?? bandOvi(ovi);
  const lead = `OVI는 ‘실제로 얼마나 움직였는지’입니다. 현재 ${formatScore(ovi)}점(${b ?? "—"}).`;
  if (b === "빠른 개선") return `${lead} 올바른 쪽으로 속도가 납니다. 병목만 골라 막히지 않게 관리하세요.`;
  if (b === "개선 중") return `${lead} 변화가 진행 중입니다. 결정→현장 적용이 느린지(실행 속도)를 확인하세요.`;
  if (b === "정체") return `${lead} 움직임이 멈춘 인상입니다. 절차·관행이 줄었는지, 일하는 방식이 바뀌었는지부터 보세요.`;
  if (b === "악화 중") return `${lead} 후퇴 신호입니다. 조직 건강(OHI)과 함께 긴급히 점검하는 편이 낫습니다.`;
  return `${lead} 즉각 대응이 필요한 속도 구간입니다. OHI·ORI와 교차해서 원인을 보세요.`;
}

export function oaiBandMessage(oai: number | null, band: string | null): string {
  if (oai == null) return "방향 정렬 점수를 집계할 응답이 아직 부족합니다.";
  const b = band ?? bandOai(oai);
  const lead = `OAI는 ‘전략·에너지·결과가 같은 방향을 보는지’입니다. 현재 ${formatScore(oai)}점(${b ?? "—"}).`;
  if (b === "방향 정렬 탁월") return `${lead} 방향이 잘 맞습니다. 과로만 조심하며 모멘텀을 이어가면 됩니다.`;
  if (b === "방향 정렬 양호") return `${lead} 대체로 맞습니다. SA·EA·OA 중 가장 낮은 축을 골라 미세 조정하세요.`;
  if (b === "부분 정렬") return `${lead} 전략과 현장·결과 사이에 틈이 있습니다. 우선순위와 시간 배분이 맞는지 물어보세요.`;
  if (b === "방향 이탈") return `${lead} 빠르게 움직여도 방향이 어긋날 수 있습니다. 전략 재정렬이 우선입니다.`;
  return `${lead} 전략·에너지·결과가 따로 놉니다. 경영진이 우선순위를 다시 제시할 필요가 큽니다.`;
}

/** ORI×OVI 교차 산점도 — 기준선 3.5 사분면 가이드(응답자·팀 공통) */
export const ORI_OVI_QUADRANTS = [
  {
    key: "readyFast",
    label: "건강하게 빠름",
    cond: (ori: number, ovi: number) => ori >= BENCH && ovi >= BENCH,
    text: "준비도와 실행속도가 함께 높습니다 — 건강하게 빠른 상태입니다.",
  },
  {
    key: "fastError",
    label: "빠른 오류 위험",
    cond: (ori: number, ovi: number) => ori < BENCH && ovi >= BENCH,
    text: "준비가 부족한데 속도만 빠릅니다 — 방향을 잃기 쉬운 위험군입니다.",
  },
  {
    key: "readyStuck",
    label: "준비됐지만 정체",
    cond: (ori: number, ovi: number) => ori >= BENCH && ovi < BENCH,
    text: "준비는 됐는데 실행이 느립니다 — 구조는 있는데 안 움직이는 병목입니다.",
  },
  {
    key: "stalled",
    label: "정체",
    cond: (ori: number, ovi: number) => ori < BENCH && ovi < BENCH,
    text: "준비도 안 됐고 속도도 느립니다 — 정체 상태입니다.",
  },
] as const;

export function buildOriOviQuadrantGuide(
  ori: number | null | undefined,
  ovi: number | null | undefined,
): (typeof ORI_OVI_QUADRANTS)[number] | null {
  if (ori == null || ovi == null || !Number.isFinite(ori) || !Number.isFinite(ovi)) return null;
  return ORI_OVI_QUADRANTS.find((q) => q.cond(ori, ovi)) ?? null;
}

/** 레이더 캡션 1행 — 축 약칭 */
export const RADAR_AXIS_CAPTION =
  "OHI 조직건강 · ORI 변화준비도 · OVI 변화속도 · OAI 방향정렬";


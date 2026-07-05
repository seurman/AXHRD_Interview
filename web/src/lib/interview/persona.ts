/**
 * 압박 강도 적응형 조절 — IRT가 이미 추정하고 있는 역량 레벨(current_level, 1~5)을
 * "문항 난이도"뿐 아니라 "면접관 페르소나의 압박 강도"에도 그대로 재사용한다.
 *
 * 설계 원칙:
 * - 점수(rubric)는 절대 이 값의 영향을 받지 않는다 — 채점은 항상 객관적으로 유지하고,
 *   여기서 조절하는 건 오직 "질문이 들리는 방식"(톤)과 "꼬리질문이 얼마나 쉽게 트리거되는가"뿐이다.
 *   (규준참조 점수 등 장기적으로 세션 간 비교 가능한 지표를 만들려면 채점 기준이 페르소나에
 *   따라 흔들리면 안 되기 때문)
 * - 추가 LLM 호출 없이 사전 정의된 문구 풀에서만 고른다 (비용 원칙 유지).
 */

export type PressureTier = "GENTLE" | "NEUTRAL" | "TOUGH";

/** IRT current_level(1~5)을 압박 강도 3단계로 매핑한다.
 *  레벨이 낮다(아직 약함으로 추정)면 실무진처럼 부드럽게, 높다(잘 버티고 있음)면
 *  임원처럼 더 깐깐하게 — 실제 압박면접에서 잘하는 지원자일수록 더 몰아붙이는 것과 같은 원리다. */
export function pressureTierFromLevel(level: number): PressureTier {
  if (level <= 2) return "GENTLE";
  if (level >= 4) return "TOUGH";
  return "NEUTRAL";
}

export function pressureTierLabel(tier: PressureTier): string {
  const map: Record<PressureTier, string> = {
    GENTLE: "실무진 면접관 · 편안한 분위기",
    NEUTRAL: "일반 면접관",
    TOUGH: "임원 면접관 · 압박면접 모드",
  };
  return map[tier];
}

const GENTLE_PREFIXES = [
  "편하게 말씀해 주시면 됩니다. ",
  "가볍게 여쭤볼게요. ",
  "천천히 생각하시고 답변해 주세요. ",
];

const TOUGH_PREFIXES = [
  "냉정하게 평가하겠습니다. ",
  "핵심만 명확하게 답변해 주시기 바랍니다. ",
  "구체적인 근거를 들어 설명해 주십시오. ",
];

/** 질문 문구에 압박 강도에 맞는 톤을 입힌다. NEUTRAL이면 그대로 반환.
 *  seed로 문구 풀을 회전시켜 같은 세션 안에서 매번 같은 문구가 반복되지 않게 한다.
 *  채점에 쓰이는 원본 질문 텍스트(캐시)에는 영향을 주지 않고, 화면에 보여줄 때만 씌운다. */
export function applyPressureTone(text: string, tier: PressureTier, seed: number): string {
  if (tier === "NEUTRAL") return text;
  const pool = tier === "GENTLE" ? GENTLE_PREFIXES : TOUGH_PREFIXES;
  const prefix = pool[Math.abs(seed) % pool.length];
  return `${prefix}${text}`;
}

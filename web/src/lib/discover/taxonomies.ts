/** VIA 성격강점 24개 + Schwartz 기본가치 10가지 — 리포트 태깅 기준 */

export const VIA_STRENGTHS = [
  { code: "CREATIVITY", labelKo: "창의성", virtueKo: "지혜" },
  { code: "CURIOSITY", labelKo: "호기심", virtueKo: "지혜" },
  { code: "JUDGMENT", labelKo: "판단력", virtueKo: "지혜" },
  { code: "LOVE_OF_LEARNING", labelKo: "학습열", virtueKo: "지혜" },
  { code: "PERSPECTIVE", labelKo: "통찰력", virtueKo: "지혜" },
  { code: "BRAVERY", labelKo: "용기", virtueKo: "용기" },
  { code: "PERSEVERANCE", labelKo: "끈기", virtueKo: "용기" },
  { code: "HONESTY", labelKo: "진정성", virtueKo: "용기" },
  { code: "ZEST", labelKo: "열정", virtueKo: "용기" },
  { code: "LOVE", labelKo: "사랑", virtueKo: "인간애" },
  { code: "KINDNESS", labelKo: "친절", virtueKo: "인간애" },
  { code: "SOCIAL_INTELLIGENCE", labelKo: "사회적 지능", virtueKo: "인간애" },
  { code: "TEAMWORK", labelKo: "협력", virtueKo: "인간애" },
  { code: "FAIRNESS", labelKo: "공정성", virtueKo: "정의" },
  { code: "LEADERSHIP", labelKo: "리더십", virtueKo: "정의" },
  { code: "FORGIVENESS", labelKo: "용서", virtueKo: "정의" },
  { code: "HUMILITY", labelKo: "겸손", virtueKo: "정의" },
  { code: "SELF_REGULATION", labelKo: "자기조절", virtueKo: "절제" },
  { code: "PRUDENCE", labelKo: "신중함", virtueKo: "절제" },
  { code: "APPRECIATION_OF_BEAUTY", labelKo: "심미안", virtueKo: "초월" },
  { code: "GRATITUDE", labelKo: "감사", virtueKo: "초월" },
  { code: "HOPE", labelKo: "희망", virtueKo: "초월" },
  { code: "HUMOR", labelKo: "유머", virtueKo: "초월" },
  { code: "SPIRITUALITY", labelKo: "영성", virtueKo: "초월" },
] as const;

export const SCHWARTZ_VALUES = [
  { code: "SELF_DIRECTION", labelKo: "자기주도성" },
  { code: "STIMULATION", labelKo: "자극·도전" },
  { code: "HEDONISM", labelKo: "쾌락" },
  { code: "ACHIEVEMENT", labelKo: "성취" },
  { code: "POWER", labelKo: "영향력" },
  { code: "SECURITY", labelKo: "안전·안정" },
  { code: "CONFORMITY", labelKo: "조화·규범" },
  { code: "TRADITION", labelKo: "전통" },
  { code: "BENEVOLENCE", labelKo: "박애·돌봄" },
  { code: "UNIVERSALISM", labelKo: "보편주의" },
] as const;

export const RIASEC_TYPES = [
  { code: "REALISTIC", labelKo: "현실형" },
  { code: "INVESTIGATIVE", labelKo: "탐구형" },
  { code: "ARTISTIC", labelKo: "예술형" },
  { code: "SOCIAL", labelKo: "사회형" },
  { code: "ENTERPRISING", labelKo: "기업형" },
  { code: "CONVENTIONAL", labelKo: "관습형" },
] as const;

export function viaLabel(code: string) {
  return VIA_STRENGTHS.find((s) => s.code === code)?.labelKo ?? code;
}

export function schwartzLabel(code: string) {
  return SCHWARTZ_VALUES.find((v) => v.code === code)?.labelKo ?? code;
}

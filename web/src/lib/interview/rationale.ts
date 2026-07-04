/**
 * "왜 이 질문인가요?" 투명성 설명 — IRT가 문항을 고른 근거를 후보자에게 그대로 보여준다.
 * inAIR류의 블랙박스 채점과 달리, 수치 기반으로 설명 가능하다는 게 이 엔진의 차별점이다.
 */
export function buildQuestionRationale(params: {
  level: number;
  expectedInformation?: number;
}): string {
  const base = `현재 추정 역량 수준에 맞춰 난이도 L${params.level} 문항을 선택했습니다.`;
  if (params.expectedInformation !== undefined) {
    return `${base} 후보 문항 중 능력치 추정에 가장 도움이 되는(정보량 최대) 문항입니다.`;
  }
  return base;
}

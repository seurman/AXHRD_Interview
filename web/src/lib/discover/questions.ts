/** 자기발견 인터뷰 고정 질문 세트 — LLM 호출 없이 순서대로 진행 */

export interface DiscoverQuestion {
  code: string;
  text: string;
  /** 방법론적 배경 (UI 안내용, 선택) */
  hint?: string;
}

export const DISCOVER_QUESTIONS: DiscoverQuestion[] = [
  {
    code: "life-chapter",
    text: "지금까지의 인생을 몇 개의 '챕터'로 나눈다면 어떻게 나누시겠어요? 각 챕터의 제목과 한 줄 요약을 들려주세요.",
    hint: "McAdams의 Life Story Interview — 인생을 서사의 챕터로 구조화",
  },
  {
    code: "high-point",
    text: "그중 가장 자랑스러웠던 순간은 언제였나요? 그때 어떤 상황이었고, 구체적으로 무엇을 했는지 이야기해 주세요.",
    hint: "BEI — 실제 있었던 사건을 구체적으로 서술",
  },
  {
    code: "low-point",
    text: "가장 힘들었던 순간은 언제였나요? 그 상황에서 어떻게 버텼고, 무엇이 도움이 되었는지 들려주세요.",
    hint: "McAdams — 저점과 극복 과정에서 가치관이 드러남",
  },
  {
    code: "best-self",
    text: "'내가 가장 나다웠다'고 느낀 순간이 있다면 언제인가요? 그때 어떤 모습이었는지 구체적으로 묘사해 주세요.",
    hint: "Reflected Best Self Exercise — 최상의 자아 회고",
  },
  {
    code: "turning-point",
    text: "생각이나 삶의 방향이 확 바뀐 '전환점'이 있었나요? 무엇이 계기가 되었는지 이야기해 주세요.",
    hint: "McAdams — 전환점에서의 신념 변화",
  },
  {
    code: "values-conflict",
    text: "서로 중요한 두 가지 가치(예: 안정 vs 도전, 성취 vs 관계)가 부딪혔을 때, 실제로 어떤 선택을 하셨나요? 왜 그렇게 결정했는지 들려주세요.",
    hint: "Schwartz 가치관 — 충돌 상황에서의 우선순위",
  },
  {
    code: "meaningful-work",
    text: "지금까지 한 일이나 활동 중 '이건 정말 의미 있었다'고 느낀 것이 있다면 무엇인가요? 그때 무엇이 의미 있게 느껴졌는지 설명해 주세요.",
    hint: "BEI — 의미 있는 경험에서 동기와 가치 추출",
  },
  {
    code: "energy-moment",
    text: "어떤 일을 할 때 시간 가는 줄 모르고 에너지가 나는 편인가요? 최근 그런 경험을 하나 들려주세요.",
    hint: "Holland RIASEC 보조 — 흥미·에너지 패턴",
  },
  {
    code: "future-theme",
    text: "앞으로 5~10년 뒤, 어떤 사람이 되고 싶으신가요? 그 모습을 한 문장으로 표현하고, 왜 그렇게 생각하시는지 이야기해 주세요.",
    hint: "McAdams — 미래 서사와 정체성 방향",
  },
];

export function getDiscoverQuestion(index: number): DiscoverQuestion | null {
  return DISCOVER_QUESTIONS[index] ?? null;
}

export function getDiscoverQuestionCount() {
  return DISCOVER_QUESTIONS.length;
}

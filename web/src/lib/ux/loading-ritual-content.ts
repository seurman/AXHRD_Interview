/** 대기 UX용 역량 팁 · 짧은 잼/심호흡 — AXHRD LoadingRitual (멈추지 않는 대기) */

export type RitualVariant = "interview" | "report" | "discover" | "setup";

export type RitualSlide =
  | { kind: "tip"; title: string; body: string; competency?: string }
  | { kind: "jam"; title: string; body: string; seconds?: number };

const INTERVIEW_SLIDES: RitualSlide[] = [
  {
    kind: "tip",
    competency: "COMMUNICATION",
    title: "의사소통 · STAR 한 줄",
    body: "상황(Situation) → 과제(Task) → 행동(Action) → 결과(Result) 순서로 말하면 채점 루브릭이 잘 붙습니다.",
  },
  {
    kind: "jam",
    title: "심호흡 4–4",
    body: "코로 4초 들이마시고, 4초 내쉽니다. 다음 질문 전에 어깨만 살짝 내려보세요.",
    seconds: 8,
  },
  {
    kind: "tip",
    competency: "PROBLEM_SOLVING",
    title: "문제해결 · 숫자 한 개",
    body: "‘많이 줄였다’ 대신 ‘리드타임 3일 → 1일’처럼 변화량을 넣으면 설득력이 올라갑니다.",
  },
  {
    kind: "tip",
    competency: "GROWTH",
    title: "성장·학습 · 실패 한 조각",
    body: "무엇을 배웠는지보다, 다음에 같은 상황에서 어떻게 바꿨는지가 면접관의 관심을 끕니다.",
  },
  {
    kind: "jam",
    title: "시선 리셋",
    body: "화면에서 눈을 떼고 먼 곳을 3초만 바라봅니다. IRT가 다음 난이도를 맞추는 동안의 짧은 리셋.",
    seconds: 5,
  },
  {
    kind: "tip",
    competency: "LEADERSHIP",
    title: "리더십 · ‘나’와 ‘우리’",
    body: "내 역할과 팀 기여를 구분해서 말하면, 과대·과소 주장처럼 들리지 않습니다.",
  },
];

const REPORT_SLIDES: RitualSlide[] = [
  {
    kind: "tip",
    title: "리포트 읽는 법",
    body: "θ(세타)는 상대적 실력 추정값입니다. 한 세션의 절대 점수가 아니라, 다음 연습의 방향을 정하는 나침반으로 쓰세요.",
  },
  {
    kind: "jam",
    title: "잠깐의 여운",
    body: "방금 답한 경험 중 가장 생생한 순간을 한 문장으로만 떠올려 보세요.",
    seconds: 6,
  },
  {
    kind: "tip",
    competency: "JOB_FIT",
    title: "직무 적합 · JD 키워드",
    body: "리포트의 보완 포인트와 JD의 필수 역량을 맞춰 보면, 다음 면접 우선순위가 선명해집니다.",
  },
  {
    kind: "tip",
    title: "투명한 채점",
    body: "AXHRD는 감정 AI 없이 루브릭·구조로 채점합니다. 같은 기준이면 세션 간 비교가 공정합니다.",
  },
];

const DISCOVER_SLIDES: RitualSlide[] = [
  {
    kind: "tip",
    title: "성찰은 채점이 아닙니다",
    body: "자기발견은 합격/불합격이 없습니다. 구체적인 사건 한 장이 강점 카드의 재료가 됩니다.",
  },
  {
    kind: "jam",
    title: "호흡 정리",
    body: "손을 배에 올리고, 들이쉴 때 배가 부풀어 오르는지만 느껴 보세요.",
    seconds: 6,
  },
  {
    kind: "tip",
    title: "강점 → 면접 이야기",
    body: "발견 리포트의 강점은 모의면접 STAR 소재로 바로 이어집니다. B2C 성장 증명 루프의 시작점입니다.",
  },
  {
    kind: "tip",
    competency: "ORG_FIT",
    title: "조직 적합 · 가치 한 단어",
    body: "‘협력’ ‘도전’처럼 나에게 중요한 단어를 하나 고르면, 이후 답변이 일관됩니다.",
  },
];

const SETUP_SLIDES: RitualSlide[] = [
  {
    kind: "tip",
    title: "세션 준비 중",
    body: "산업·직무·역량에 맞춰 문항 풀을 정렬하고 IRT 상태를 초기화합니다.",
  },
  {
    kind: "jam",
    title: "물 한 모금",
    body: "면접이 시작되기 전에 물을 한 모금 마시면 음성 답변이 한결 편해집니다.",
    seconds: 4,
  },
  {
    kind: "tip",
    title: "적응형 난이도",
    body: "첫 문항 이후부터는 답변 성과에 따라 다음 질문 난이도가 실시간으로 맞춰집니다.",
  },
];

export function slidesForVariant(variant: RitualVariant): RitualSlide[] {
  switch (variant) {
    case "report":
      return REPORT_SLIDES;
    case "discover":
      return DISCOVER_SLIDES;
    case "setup":
      return SETUP_SLIDES;
    default:
      return INTERVIEW_SLIDES;
  }
}

export function ritualStatusLabel(variant: RitualVariant): string {
  switch (variant) {
    case "report":
      return "리포트를 정리하는 중";
    case "discover":
      return "이야기를 저장하는 중";
    case "setup":
      return "면접 세션을 준비하는 중";
    default:
      return "답변을 평가 · IRT 조정 중";
  }
}

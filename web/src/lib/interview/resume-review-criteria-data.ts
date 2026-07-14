/**
 * 자소서 첨삭 평가 기준 — 타입·기본 시드 (클라이언트/서버 공용, Prisma 없음).
 */

export const REVIEW_CATEGORIES = ["FORMAT_LOGIC", "INDUSTRY_FIT", "STAR_BEI"] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

export const REVIEW_CATEGORY_LABELS: Record<ReviewCategory, string> = {
  FORMAT_LOGIC: "형식·논리",
  INDUSTRY_FIT: "산업·직무 역량",
  STAR_BEI: "STAR·BEI",
};

export type CriterionSeed = {
  code: string;
  category: ReviewCategory;
  title: string;
  description: string;
  howToCheck: string;
  weight: number;
  sortOrder: number;
  sourceNote: string;
};

export type LoadedCriterion = {
  id: string;
  code: string;
  category: ReviewCategory;
  title: string;
  description: string;
  howToCheck: string;
  weight: number;
  sortOrder: number;
  isActive: boolean;
  sourceNote: string | null;
};

/**
 * 채용/자소서 가이드에서 반복되는 기본 요건.
 * 출처: Linkareer(2025–2026), HAIJOB STAR, 종모워크 STAR, HappyCampus(2024), BEI 원칙.
 */
export const DEFAULT_RESUME_REVIEW_CRITERIA: CriterionSeed[] = [
  {
    code: "TOPIC_FIRST",
    category: "FORMAT_LOGIC",
    title: "두괄식·핵심 선행",
    description:
      "문항/문단의 첫 문장(또는 소제목)에서 핵심 결론·역량이 바로 드러나야 합니다. 평가자는 장문을 처음부터 끝까지 읽지 않습니다.",
    howToCheck:
      "각 경험·동기 문단의 첫 1–2문장에 주장(무엇을 했는지/어떤 역량인지)이 있는지 확인. 배경만 길게 시작하면 fail.",
    weight: 1.2,
    sortOrder: 10,
    sourceNote: "HappyCampus 자소서 가이드·Linkareer 문항 작성법: 두괄식·소제목으로 핵심 제시",
  },
  {
    code: "LOGICAL_ARC",
    category: "FORMAT_LOGIC",
    title: "논리 흐름(경험→기여→직무연결)",
    description:
      "경험이 나열만 되지 않고, ‘상황 → 본인 기여 → 결과/학습 → 지원 직무와의 연결’이 한 줄기로 이어져야 합니다.",
    howToCheck:
      "경험 서술 후 직무/지원 포지션과의 연결 문장이 있는지 확인. 단순 이력 나열이면 partial, 연결이 없으면 fail.",
    weight: 1.3,
    sortOrder: 20,
    sourceNote: "Linkareer·HappyCampus: 직무 적합성·논리적 설득력 강조",
  },
  {
    code: "QUANTIFIED_OUTCOME",
    category: "FORMAT_LOGIC",
    title: "정량·객관 성과",
    description:
      "‘열심히 했다’가 아니라 기간·규모·개선율·건수 등 숫자/객관 지표가 최소 1개 이상 있어야 설득력이 생깁니다.",
    howToCheck:
      "%, 건, 명, 원, 배, 개월 등 수치가 있는지 검색. 수치 없이 추상어(열심히/최선을)만 있으면 fail.",
    weight: 1.4,
    sortOrder: 30,
    sourceNote: "Linkareer 체크리스트·종모워크: 정량 성과 최소 1개 필수",
  },
  {
    code: "OWN_ROLE_CLEAR",
    category: "FORMAT_LOGIC",
    title: "본인 역할·기여도 명확",
    description:
      "팀 성과만 쓰지 말고 ‘내가 무엇을 결정·실행했는지’가 드러나야 합니다. 수동태·‘참여했다’ 위주면 약합니다.",
    howToCheck:
      "1인칭 행동(분석/제안/설계/주도/개선)이 있는지 확인. ‘함께 했다/참여했다’만 있으면 partial.",
    weight: 1.2,
    sortOrder: 40,
    sourceNote: "HAIJOB STAR Task/Action: 개인 기여도·역할 명확화",
  },
  {
    code: "NO_VAGUE_EFFORT",
    category: "FORMAT_LOGIC",
    title: "추상·노력어 회피",
    description:
      "‘최선을 다했다’, ‘열심히 했다’, ‘다양한 경험’처럼 관찰 불가능한 표현만으로는 평가 근거가 되지 않습니다.",
    howToCheck:
      "추상어 비중 vs 구체 행동(방법·도구·판단) 비중. 추상어가 Action의 중심이면 fail.",
    weight: 1,
    sortOrder: 50,
    sourceNote: "종모워크 STAR: Action에서 열심히/최선 금지, 판단·방법·실행을 쓸 것",
  },
  {
    code: "JD_KEYWORD_EVIDENCE",
    category: "INDUSTRY_FIT",
    title: "공고·산업 키워드와 근거 연결",
    description:
      "JD/산업 기대 키워드가 단순 나열이 아니라, 경험·성과와 연결되어 ‘할 수 있다’는 근거로 드러나야 합니다.",
    howToCheck:
      "매칭된 키워드마다 자소서에 대응 경험이 있는지, missing 키워드가 핵심 역량이면 보완 제안. 키워드만 있고 근거 없으면 partial.",
    weight: 1.5,
    sortOrder: 10,
    sourceNote: "Linkareer: 직무기술서 키워드를 문항에 자연스럽게 녹일 것",
  },
  {
    code: "JOB_RELEVANT_EXPERIENCE",
    category: "INDUSTRY_FIT",
    title: "직무 관련 경험 선별",
    description:
      "지원 직무와 관련성이 높은 경험(프로젝트·인턴·대외활동·개선 사례)이 전면에 와야 합니다. 무관한 스펙 나열은 감점입니다.",
    howToCheck:
      "경험 제목/내용이 산업·직무 맥락과 맞는지. 무관 경험만 길면 fail, 일부만 관련이면 partial.",
    weight: 1.3,
    sortOrder: 20,
    sourceNote: "HappyCampus: 직무 적합도가 자소서 핵심; Linkareer 경험 항목",
  },
  {
    code: "MOTIVATION_TRIPLE_LINK",
    category: "INDUSTRY_FIT",
    title: "동기 = 기업 + 직무 + 본인 경험",
    description:
      "지원동기는 ‘왜 이 회사’, ‘왜 이 직무’, ‘왜 나(경험·역량)’ 세 축이 연결되어야 합니다. 회사 칭찬만 있으면 부족합니다.",
    howToCheck:
      "기업 특성/제품·서비스, 직무 키워드, 개인 경험이 한 문단에서 연결되는지 확인.",
    weight: 1.2,
    sortOrder: 30,
    sourceNote: "Linkareer 지원동기: 기업조사+직무키워드+개인경험; HappyCampus 지원동기",
  },
  {
    code: "INDUSTRY_COMPETENCY_SIGNAL",
    category: "INDUSTRY_FIT",
    title: "산업에 필요한 역량 신호",
    description:
      "해당 산업·직무에서 중시하는 역량(문제해결, 고객지향, 분석, 협업 등)이 사례로 관찰 가능해야 합니다.",
    howToCheck:
      "온톨로지 claim↔역량·키워드 매칭·경험 서술을 보고, 산업 기대 역량이 행동으로 보이는지 판정.",
    weight: 1.3,
    sortOrder: 40,
    sourceNote: "채용 실무: 역량은 라벨이 아니라 행동·성과로 입증 (BEI 원칙과 동일)",
  },
  {
    code: "STAR_SITUATION",
    category: "STAR_BEI",
    title: "S — 상황·배경 (간결)",
    description:
      "Situation은 2–3줄로 배경·제약·맥락만 제시합니다. 배경이 전체의 절반을 넘기면 Action이 빈약해집니다.",
    howToCheck:
      "상황 서술이 있는지, 과도하게 길지 않은지. 배경만 길고 행동·결과가 없으면 fail.",
    weight: 1,
    sortOrder: 10,
    sourceNote: "종모워크·HAIJOB: S는 2–3줄, 불필요 배경 축소",
  },
  {
    code: "STAR_TASK",
    category: "STAR_BEI",
    title: "T — 과제·역할",
    description:
      "Task는 ‘무엇을 해결해야 했는지’와 ‘본인 역할’을 1–2줄로 명확히 합니다.",
    howToCheck:
      "목표·과제·역할이 명시되는지. ‘팀이 했다’만 있고 본인 과제가 없으면 fail.",
    weight: 1.1,
    sortOrder: 20,
    sourceNote: "HAIJOB STAR Task: 역할·과업·문제점 명시",
  },
  {
    code: "STAR_ACTION",
    category: "STAR_BEI",
    title: "A — 행동·판단 (비중 40–50%)",
    description:
      "Action이 분량의 중심(권장 40–50%)이어야 합니다. 방법·판단·도구·협업에서의 본인 행동을 구체적으로 씁니다.",
    howToCheck:
      "Action이 Situation보다 구체적이고 긴지. 방법·판단·실행 단계가 없으면 fail. 결과만 있고 과정이 없으면 partial.",
    weight: 1.5,
    sortOrder: 30,
    sourceNote: "종모워크: Action = 전체 40–50%; 판단·방법·실행을 쓸 것",
  },
  {
    code: "STAR_RESULT",
    category: "STAR_BEI",
    title: "R — 결과·성과·학습",
    description:
      "Result는 수치·객관 성과와 함께, 가능하면 배운 점·직무 연결을 덧붙입니다. 성과가 없으면 최소한 변화·학습이라도 명시해야 합니다.",
    howToCheck:
      "결과·성과·개선 문장 유무, 수치 유무, 직무 연관. 행동 후 결과가 끊기면 fail.",
    weight: 1.4,
    sortOrder: 40,
    sourceNote: "Linkareer·HAIJOB·종모워크: R에 정량 성과 + 직무 연관",
  },
  {
    code: "BEI_BEHAVIORAL_INDICATORS",
    category: "STAR_BEI",
    title: "BEI — 관찰 가능한 행동지표",
    description:
      "BEI(행동사건면접) 관점에서는 STAR 라벨보다 ‘관찰 가능한 행동’이 중요합니다. 역량 형용사만 나열하면 안됩니다.",
    howToCheck:
      "‘성실하다/리더십 있다’ 같은 형용사 대신, 실제로 한 말·행동·결정이 있는지. 형용사만 있으면 fail.",
    weight: 1.3,
    sortOrder: 50,
    sourceNote: "BEI 일반 원칙: 과거 행동을 지표로 역량 추론 — 서술자 라벨이 아닌 행동 증거",
  },
];

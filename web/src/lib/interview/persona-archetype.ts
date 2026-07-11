/**
 * 지원자 페르소나 — 산업군 + 직무를 하나로 합쳐 "면접관에게 어떻게 보이고 싶은가"를
 * 대표하는 롤모델 캐릭터를 정해준다. 순수 함수(태그 중복도 매칭)라 서버·클라이언트
 * 어디서든 동일하게 계산되고, 별도 API 호출이나 LLM 비용이 들지 않는다.
 *
 * 채점에는 절대 영향을 주지 않는다 — 화면 표시(뱃지)와 리포트 코칭 문구에만 쓰인다.
 * (압박 강도 페르소나 때 세운 원칙과 동일: 페르소나가 화려하다고 유리해지면 안 됨)
 */

import type { IndustryCode, JobRoleCode, CompetencyCode } from "@/types";

export interface PersonaArchetype {
  id: string;
  name: string;
  /** 이 페르소나가 면접관에게 어떻게 보이고 싶어하는지 2~3문장 */
  description: string;
  /** interviewStyle.tone 자리에 대신 쓸 수 있는 짧은 톤 문구 */
  toneHint: string;
  /**
   * 이 페르소나가 특히 강조하고 싶어할 역량 세트(우선순위 순, 보통 3개).
   * 설정 화면에서 산업+직무 선택 시 이 배열 전체가 추천 역량으로 자동 체크된다
   * (사용자가 자유롭게 추가/해제 가능 — 여전히 채점에는 영향 없음).
   */
  focusCompetencies: CompetencyCode[];
  traits: string[];
}

/** 산업군 축 특성 태그 */
const INDUSTRY_TRAITS: Record<IndustryCode, string[]> = {
  IT_SW: ["논리", "빠른학습", "협업", "문제해결", "실용성"],
  FINANCE: ["신중함", "리스크관리", "정확성", "윤리", "책임감"],
  MANUFACTURING: ["책임감", "현장감각", "꼼꼼함", "지속성", "안전"],
  PUBLIC: ["신뢰성", "원칙", "공익", "절차준수", "공정성"],
  OTHER: ["균형", "성실", "적응력"],
};

/** 직무 축 특성 태그 */
const JOBROLE_TRAITS: Record<JobRoleCode, string[]> = {
  DEVELOPMENT: ["논리", "문제해결", "꼼꼼함", "지속학습"],
  MARKETING: ["트렌드감각", "소통", "창의성", "데이터분석"],
  SALES: ["설득력", "관계관리", "목표지향", "회복탄력성"],
  DESIGN: ["심미성", "디테일", "공감", "창의성"],
  HR: ["공정성", "소통", "조직이해", "신뢰성"],
  BUSINESS_SUPPORT: ["체계성", "꼼꼼함", "협업", "문제해결"],
  FINANCE: ["정확성", "분석력", "신중함", "윤리"],
  OTHER: ["성실", "적응력", "균형"],
};

/** 큐레이션한 페르소나 아키타입 — 산업군×직무 조합의 태그 중복도로 매칭한다 */
const PERSONA_ARCHETYPES: PersonaArchetype[] = [
  {
    id: "principled-solver",
    name: "원칙있는 문제해결사",
    description:
      "정해진 원칙과 절차를 지키면서도 문제의 본질을 논리적으로 파고드는 사람으로 보이고 싶어합니다. 신뢰를 바탕으로 꾸준히 성과를 쌓는 유형이에요.",
    toneHint: "원칙·신뢰 중심의 논리적 어투",
    focusCompetencies: ["PROBLEM_SOLVING", "ORG_FIT", "JOB_FIT"],
    traits: ["원칙", "신뢰성", "논리", "문제해결", "절차준수"],
  },
  {
    id: "data-strategist",
    name: "데이터로 말하는 전략가",
    description:
      "감이 아니라 근거와 숫자로 설득하는 사람으로 보이고 싶어합니다. 트렌드를 빠르게 읽고 데이터로 다음 방향을 제시하는 유형이에요.",
    toneHint: "데이터·근거 중심의 분석적 어투",
    focusCompetencies: ["PROBLEM_SOLVING", "JOB_FIT", "COMMUNICATION"],
    traits: ["데이터분석", "논리", "트렌드감각", "정확성", "분석력"],
  },
  {
    id: "trust-builder",
    name: "신뢰를 쌓는 조율자",
    description:
      "사람과 조직 사이에서 공정하게 균형을 잡는 사람으로 보이고 싶어합니다. 갈등이 있어도 신뢰를 먼저 쌓아 문제를 풀어가는 유형이에요.",
    toneHint: "공정·신뢰 중심의 차분한 어투",
    focusCompetencies: ["ORG_FIT", "COMMUNICATION", "LEADERSHIP"],
    traits: ["공정성", "신뢰성", "소통", "조직이해", "공익"],
  },
  {
    id: "grounded-executor",
    name: "현장을 아는 실행가",
    description:
      "말보다 실행으로 증명하는 사람으로 보이고 싶어합니다. 현장 감각과 꼼꼼함으로 책임진 일은 끝까지 완수하는 유형이에요.",
    toneHint: "진중·책임감 중심의 담백한 어투",
    focusCompetencies: ["JOB_FIT", "GROWTH", "ORG_FIT"],
    traits: ["현장감각", "책임감", "꼼꼼함", "지속성", "안전"],
  },
  {
    id: "resilient-connector",
    name: "설득력있는 관계관리자",
    description:
      "사람을 움직이는 힘이 있는 사람으로 보이고 싶어합니다. 거절과 실패에도 회복탄력성을 발휘해 목표를 향해 가는 유형이에요.",
    toneHint: "설득·목표지향 중심의 에너지 있는 어투",
    focusCompetencies: ["COMMUNICATION", "LEADERSHIP", "JOB_FIT"],
    traits: ["설득력", "관계관리", "목표지향", "회복탄력성"],
  },
  {
    id: "prudent-guardian",
    name: "꼼꼼한 리스크 관리자",
    description:
      "작은 실수도 놓치지 않는 신중한 사람으로 보이고 싶어합니다. 리스크를 먼저 살피고 윤리적 기준을 지키는 유형이에요.",
    toneHint: "신중·윤리 중심의 차분한 어투",
    focusCompetencies: ["JOB_FIT", "ORG_FIT", "PROBLEM_SOLVING"],
    traits: ["신중함", "리스크관리", "정확성", "윤리"],
  },
  {
    id: "empathetic-communicator",
    name: "공감형 커뮤니케이터",
    description:
      "상대의 입장에서 먼저 생각하는 사람으로 보이고 싶어합니다. 디테일과 공감을 바탕으로 세심하게 결과물을 만드는 유형이에요.",
    toneHint: "공감·디테일 중심의 부드러운 어투",
    focusCompetencies: ["COMMUNICATION", "GROWTH", "ORG_FIT"],
    traits: ["공감", "심미성", "디테일", "소통", "창의성"],
  },
  {
    id: "pragmatic-builder",
    name: "실용적 빌더",
    description:
      "이론보다 되게 만드는 사람으로 보이고 싶어합니다. 빠르게 배우고 협업하며 실제로 동작하는 결과물을 우선하는 유형이에요.",
    toneHint: "실용·협업 중심의 담백한 어투",
    focusCompetencies: ["PROBLEM_SOLVING", "GROWTH", "COMMUNICATION"],
    traits: ["논리", "문제해결", "빠른학습", "협업", "실용성"],
  },
];

/** 두 태그 집합의 중복 개수(자카드 유사도 대신 단순 교집합 크기 — 태그 수가 적어 충분) */
function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}

/**
 * 산업군 + 직무 태그를 각각 아키타입과 겹치는 정도로 점수를 매겨 가장 유사한 페르소나를
 * 고른다. 직무 쪽에 2배 가중치를 둔다 — NCS 기반 채용/모의면접 업계 관행을 벤치마킹한
 * 결과("직무"가 1차 축, "산업"은 톤을 보정하는 보조 신호)에 맞춘 것이자, 실제로 두 태그를
 * 단순 합집합으로 섞어 점수를 매기면(이전 방식) 일부 산업군(IT_SW·MANUFACTURING)의 태그
 * 5개가 특정 아키타입과 완전히 일치해 만점을 채워버려서 직무를 뭘 골라도 같은 페르소나로만
 * 나오는 문제가 있었음(검증 스크립트로 확인). 가중합으로 바꾸면 직무를 바꾸면 결과도 바뀐다.
 * 동점이면 배열 순서상 앞선 아키타입을 우선한다 — 항상 결정적(deterministic)이라 같은
 * 산업군+직무 조합이면 몇 번을 다시 골라도 같은 페르소나가 나온다.
 */
export function matchPersona(
  industry: IndustryCode,
  jobRole: JobRoleCode
): PersonaArchetype {
  const industryTraits = INDUSTRY_TRAITS[industry];
  const jobTraits = JOBROLE_TRAITS[jobRole];

  let best = PERSONA_ARCHETYPES[0];
  let bestScore = -1;
  for (const archetype of PERSONA_ARCHETYPES) {
    const score =
      overlapScore(jobTraits, archetype.traits) * 2 +
      overlapScore(industryTraits, archetype.traits);
    if (score > bestScore) {
      bestScore = score;
      best = archetype;
    }
  }
  return best;
}

export { INDUSTRY_TRAITS, JOBROLE_TRAITS, PERSONA_ARCHETYPES };

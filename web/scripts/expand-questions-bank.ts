/**
 * seed/questions.json 레벨별 문항 3→5 확장 (004, 005 추가)
 * 실행: npx tsx scripts/expand-questions-bank.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LEVEL_B: Record<number, [number, number]> = {
  1: [-2.0, -1.95],
  2: [-1.0, -0.95],
  3: [0.0, 0.05],
  4: [1.0, 1.05],
  5: [2.0, 1.95],
};

const DISC = [1.05, 1.1];

type Q = {
  externalId: string;
  competency: string;
  level: number;
  difficulty: number;
  discrimination: number;
  template: string;
  followUpHints: string[];
};

const EXTRA: Array<Omit<Q, "difficulty" | "discrimination">> = [
  // COMMUNICATION
  { externalId: "COMM-L1-004", competency: "COMMUNICATION", level: 1, template: "팀이나 동아리에서 본인 역할을 한 문장으로 설명해 주세요.", followUpHints: ["역할", "기여"] },
  { externalId: "COMM-L1-005", competency: "COMMUNICATION", level: 1, template: "최근에 누군가에게 설명하거나 안내했던 일이 있다면 간단히 말씀해 주세요.", followUpHints: ["대상", "내용"] },
  { externalId: "COMM-L2-004", competency: "COMMUNICATION", level: 2, template: "회의나 발표에서 본인 의견을 전달했던 경험이 있나요? 어떻게 준비했는지 말씀해 주세요.", followUpHints: ["준비", "전달 방식"] },
  { externalId: "COMM-L2-005", competency: "COMMUNICATION", level: 2, template: "문서나 메일로 업무 내용을 공유했던 경험을 말씀해 주세요.", followUpHints: ["수신자", "핵심 메시지"] },
  { externalId: "COMM-L3-004", competency: "COMMUNICATION", level: 3, template: "상대가 이해하지 못할 때 다른 방식으로 다시 설명했던 경험이 있나요?", followUpHints: ["상황", "재설명 전략"] },
  { externalId: "COMM-L3-005", competency: "COMMUNICATION", level: 3, template: "부정적인 피드백을 전달해야 했던 상황이 있다면, 어떻게 말씀하셨는지 말씀해 주세요.", followUpHints: ["상황", "전달 방식", "결과"] },
  { externalId: "COMM-L4-004", competency: "COMMUNICATION", level: 4, template: "이해관계가 다른 여러 사람 앞에서 본인 입장을 정리해 발표했던 경험이 있나요?", followUpHints: ["청중", "메시지 구조"] },
  { externalId: "COMM-L4-005", competency: "COMMUNICATION", level: 4, template: "중요한 결정을 내리기 전에 관련자들의 의견을 어떻게 수렴했는지 말씀해 주세요.", followUpHints: ["수렴 방법", "반영 결과"] },
  { externalId: "COMM-L5-004", competency: "COMMUNICATION", level: 5, template: "조직 차원의 변화나 정책을 구성원에게 설득해야 했던 경험이 있다면 말씀해 주세요.", followUpHints: ["변화 내용", "설득 전략"] },
  { externalId: "COMM-L5-005", competency: "COMMUNICATION", level: 5, template: "위기 상황에서 이해관계자에게 신뢰를 유지하며 소통했던 경험이 있나요?", followUpHints: ["위기 상황", "소통 원칙"] },
  // PROBLEM_SOLVING
  { externalId: "PS-L1-004", competency: "PROBLEM_SOLVING", level: 1, template: "일상이나 학교·직장에서 작은 문제를 스스로 해결했던 경험을 말씀해 주세요.", followUpHints: ["문제", "해결"] },
  { externalId: "PS-L1-005", competency: "PROBLEM_SOLVING", level: 1, template: "계획이 틀어졌을 때 어떻게 대응했는지 간단한 예를 들어 주세요.", followUpHints: ["상황", "대응"] },
  { externalId: "PS-L2-004", competency: "PROBLEM_SOLVING", level: 2, template: "업무나 과제에서 예상치 못한 오류가 났을 때 어떻게 원인을 찾았는지 말씀해 주세요.", followUpHints: ["오류", "원인 파악"] },
  { externalId: "PS-L2-005", competency: "PROBLEM_SOLVING", level: 2, template: "제한된 시간 안에 과제를 마쳐야 했던 경험이 있다면 우선순위를 어떻게 정했는지 말씀해 주세요.", followUpHints: ["시간 제약", "우선순위"] },
  { externalId: "PS-L3-004", competency: "PROBLEM_SOLVING", level: 3, template: "데이터나 사실을 근거로 개선안을 제시했던 경험이 있나요?", followUpHints: ["근거", "개선안"] },
  { externalId: "PS-L3-005", competency: "PROBLEM_SOLVING", level: 3, template: "같은 문제에 대해 여러 해결책을 비교해 선택했던 경험을 말씀해 주세요.", followUpHints: ["대안", "선택 기준"] },
  { externalId: "PS-L4-004", competency: "PROBLEM_SOLVING", level: 4, template: "근본 원인 분석을 통해 반복되는 문제를 줄였던 경험이 있다면 말씀해 주세요.", followUpHints: ["근본 원인", "재발 방지"] },
  { externalId: "PS-L4-005", competency: "PROBLEM_SOLVING", level: 4, template: "여러 부서·팀이 얽힌 복잡한 이슈를 해결했던 경험을 구체적으로 말씀해 주세요.", followUpHints: ["이해관계", "해결 과정"] },
  { externalId: "PS-L5-004", competency: "PROBLEM_SOLVING", level: 5, template: "장기적으로 조직 성과에 영향을 준 구조적 문제를 정의하고 해결했던 경험이 있나요?", followUpHints: ["문제 정의", "구조적 해결"] },
  { externalId: "PS-L5-005", competency: "PROBLEM_SOLVING", level: 5, template: "불확실한 상황에서 가설을 세우고 검증하며 의사결정했던 경험을 말씀해 주세요.", followUpHints: ["가설", "검증", "결정"] },
  // JOB_FIT
  { externalId: "JF-L1-004", competency: "JOB_FIT", level: 1, template: "지원 직무와 관련해 본인이 해본 일이나 배운 내용을 말씀해 주세요.", followUpHints: ["관련 경험"] },
  { externalId: "JF-L1-005", competency: "JOB_FIT", level: 1, template: "이 직무에 관심을 갖게 된 계기가 무엇인지 말씀해 주세요.", followUpHints: ["관심 계기"] },
  { externalId: "JF-L2-004", competency: "JOB_FIT", level: 2, template: "직무와 관련된 도구나 방법을 새로 익혀 업무에 적용했던 경험이 있나요?", followUpHints: ["학습", "적용"] },
  { externalId: "JF-L2-005", competency: "JOB_FIT", level: 2, template: "맡은 업무의 목표와 본인 역할을 어떻게 이해하고 수행했는지 말씀해 주세요.", followUpHints: ["목표 이해", "수행"] },
  { externalId: "JF-L3-004", competency: "JOB_FIT", level: 3, template: "직무 성과를 수치나 결과로 설명할 수 있는 경험이 있다면 말씀해 주세요.", followUpHints: ["성과 지표"] },
  { externalId: "JF-L3-005", competency: "JOB_FIT", level: 3, template: "직무 요구사항과 본인 역량의 차이를 어떻게 메웠는지 말씀해 주세요.", followUpHints: ["격차", "보완"] },
  { externalId: "JF-L4-004", competency: "JOB_FIT", level: 4, template: "직무 전문성을 바탕으로 팀이나 조직에 기여했던 사례를 말씀해 주세요.", followUpHints: ["전문성", "기여"] },
  { externalId: "JF-L4-005", competency: "JOB_FIT", level: 4, template: "업계·직무 트렌드를 파악해 업무 방식을 바꿨던 경험이 있나요?", followUpHints: ["트렌드", "변화"] },
  { externalId: "JF-L5-004", competency: "JOB_FIT", level: 5, template: "직무 영역에서 표준·프로세스를 새로 정립하거나 개선했던 경험을 말씀해 주세요.", followUpHints: ["표준화", "개선"] },
  { externalId: "JF-L5-005", competency: "JOB_FIT", level: 5, template: "핵심 직무 역량을 조직 전체에 전파하거나 멘토링했던 경험이 있다면 말씀해 주세요.", followUpHints: ["역량 전파", "멘토링"] },
  // ORG_FIT
  { externalId: "OF-L1-004", competency: "ORG_FIT", level: 1, template: "팀 활동이나 그룹 과제에서 본인이 맡았던 역할을 말씀해 주세요.", followUpHints: ["역할", "협업"] },
  { externalId: "OF-L1-005", competency: "ORG_FIT", level: 1, template: "함께 일하는 사람과 좋은 관계를 유지하기 위해 노력했던 점이 있다면 말씀해 주세요.", followUpHints: ["관계 유지"] },
  { externalId: "OF-L2-004", competency: "ORG_FIT", level: 2, template: "팀 목표와 개인 목표가 다를 때 어떻게 조율했는지 말씀해 주세요.", followUpHints: ["목표 조율"] },
  { externalId: "OF-L2-005", competency: "ORG_FIT", level: 2, template: "다른 성향의 동료와 협업할 때 본인이 맞춘 부분이 있다면 말씀해 주세요.", followUpHints: ["성향 차이", "협업"] },
  { externalId: "OF-L3-004", competency: "ORG_FIT", level: 3, template: "팀 내 갈등이나 불만이 있을 때 본인이 한 행동이 있다면 말씀해 주세요.", followUpHints: ["갈등 상황", "본인 역할"] },
  { externalId: "OF-L3-005", competency: "ORG_FIT", level: 3, template: "조직 규칙이나 프로세스를 지키면서도 효율을 높였던 경험이 있나요?", followUpHints: ["규칙 준수", "효율"] },
  { externalId: "OF-L4-004", competency: "ORG_FIT", level: 4, template: "조직 문화나 가치에 맞게 팀 분위기를 개선했던 경험이 있다면 말씀해 주세요.", followUpHints: ["문화", "개선"] },
  { externalId: "OF-L4-005", competency: "ORG_FIT", level: 4, template: "이해관계가 다른 팀과 협력해 공동 목표를 달성했던 경험을 말씀해 주세요.", followUpHints: ["팀 간 협력", "목표"] },
  { externalId: "OF-L5-004", competency: "ORG_FIT", level: 5, template: "조직 변화(합병·개편 등) 시 구성원의 저항을 줄이기 위해 어떤 노력을 했는지 말씀해 주세요.", followUpHints: ["변화 관리", "저항 완화"] },
  { externalId: "OF-L5-005", competency: "ORG_FIT", level: 5, template: "장기적으로 신뢰를 쌓아 조직 내 영향력을 키웠던 경험이 있다면 말씀해 주세요.", followUpHints: ["신뢰", "영향력"] },
  // LEADERSHIP
  { externalId: "LD-L1-004", competency: "LEADERSHIP", level: 1, template: "스스로 먼저 나서서 맡았던 일이 있다면 말씀해 주세요.", followUpHints: ["주도", "결과"] },
  { externalId: "LD-L1-005", competency: "LEADERSHIP", level: 1, template: "다른 사람을 도와주거나 이끌어준 경험이 있다면 간단히 말씀해 주세요.", followUpHints: ["도움", "상황"] },
  { externalId: "LD-L2-004", competency: "LEADERSHIP", level: 2, template: "작은 규모라도 본인이 리더 역할을 맡았던 경험을 말씀해 주세요.", followUpHints: ["리더 역할", "성과"] },
  { externalId: "LD-L2-005", competency: "LEADERSHIP", level: 2, template: "팀원의 의견을 듣고 방향을 정했던 경험이 있나요?", followUpHints: ["의견 수렴", "방향 설정"] },
  { externalId: "LD-L3-004", competency: "LEADERSHIP", level: 3, template: "팀원의 동기를 높이기 위해 본인이 한 행동이 있다면 말씀해 주세요.", followUpHints: ["동기 부여"] },
  { externalId: "LD-L3-005", competency: "LEADERSHIP", level: 3, template: "어려운 결정을 내려야 했을 때 기준을 어떻게 세웠는지 말씀해 주세요.", followUpHints: ["결정 기준", "결과"] },
  { externalId: "LD-L4-004", competency: "LEADERSHIP", level: 4, template: "성과가 부진한 팀원이나 상황을 개선하기 위해 개입했던 경험이 있나요?", followUpHints: ["개입", "개선"] },
  { externalId: "LD-L4-005", competency: "LEADERSHIP", level: 4, template: "장기 목표를 위해 단기 불편을 감수하고 팀을 이끌었던 경험을 말씀해 주세요.", followUpHints: ["장기 목표", "리더십"] },
  { externalId: "LD-L5-004", competency: "LEADERSHIP", level: 5, template: "조직의 방향성을 제시하고 여러 팀이 따라오게 만들었던 경험이 있다면 말씀해 주세요.", followUpHints: ["비전", "실행"] },
  { externalId: "LD-L5-005", competency: "LEADERSHIP", level: 5, template: "후임 리더를 육성하거나 조직의 리더십 파이프라인에 기여했던 경험이 있나요?", followUpHints: ["육성", "기여"] },
  // GROWTH
  { externalId: "GR-L1-004", competency: "GROWTH", level: 1, template: "최근에 새로 배우거나 시도해 본 것이 있다면 말씀해 주세요.", followUpHints: ["학습", "시도"] },
  { externalId: "GR-L1-005", competency: "GROWTH", level: 1, template: "본인의 약점을 인식하고 보완하려 했던 경험이 있다면 말씀해 주세요.", followUpHints: ["약점", "보완"] },
  { externalId: "GR-L2-004", competency: "GROWTH", level: 2, template: "피드백을 받고 행동을 바꿨던 구체적인 경험을 말씀해 주세요.", followUpHints: ["피드백", "변화"] },
  { externalId: "GR-L2-005", competency: "GROWTH", level: 2, template: "실패나 좌절 후 다시 도전했던 경험이 있다면 말씀해 주세요.", followUpHints: ["실패", "재도전"] },
  { externalId: "GR-L3-004", competency: "GROWTH", level: 3, template: "스스로 학습 계획을 세우고 실행했던 경험이 있나요?", followUpHints: ["계획", "실행"] },
  { externalId: "GR-L3-005", competency: "GROWTH", level: 3, template: "익숙한 방식에서 벗어나 새로운 방법을 시도했던 경험을 말씀해 주세요.", followUpHints: ["기존 방식", "새 시도"] },
  { externalId: "GR-L4-004", competency: "GROWTH", level: 4, template: "장기적인 커리어 목표와 연결해 자기개발에 투자했던 경험이 있나요?", followUpHints: ["목표", "투자"] },
  { externalId: "GR-L4-005", competency: "GROWTH", level: 4, template: "실패를 회고해 팀이나 조직에 공유했던 경험이 있다면 말씀해 주세요.", followUpHints: ["회고", "공유"] },
  { externalId: "GR-L5-004", competency: "GROWTH", level: 5, template: "학습하는 조직 문화를 만들기 위해 본인이 기여했던 사례가 있나요?", followUpHints: ["학습 문화", "기여"] },
  { externalId: "GR-L5-005", competency: "GROWTH", level: 5, template: "빠르게 변하는 환경에서 본인의 전문성을 지속적으로 갱신한 방법을 말씀해 주세요.", followUpHints: ["환경 변화", "전문성 갱신"] },
];

const root = join(process.cwd(), "..", "seed", "questions.json");
const bank = JSON.parse(readFileSync(root, "utf8")) as { questions: Q[] };

const built: Q[] = EXTRA.map((q, i) => {
  const [d0, d1] = LEVEL_B[q.level];
  const suffix = q.externalId.endsWith("004") ? 0 : 1;
  return {
    ...q,
    difficulty: suffix === 0 ? d0 : d1,
    discrimination: DISC[suffix],
  };
});

const existingIds = new Set(bank.questions.map((q) => q.externalId));
const toAdd = built.filter((q) => !existingIds.has(q.externalId));
bank.questions.push(...toAdd);
writeFileSync(root, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(`Added ${toAdd.length} questions (total ${bank.questions.length})`);

/**
 * 증거형 평가 프레임 시드
 * Usage: cd web && npm run db:seed:evidence
 */
import type { BehaviorPolarity, EvidenceAssessmentDomain } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";

const ANCHOR_DOMAINS: EvidenceAssessmentDomain[] = [
  "INTERVIEW",
  "ROLE_PLAY",
  "DIAGNOSTIC",
  "IN_BASKET",
];

const RATING_ANCHORS: Array<{ score: number; levelLabel: string; criteria: string }> = [
  { score: 5, levelLabel: "매우 우수", criteria: "관찰된 행동이 모두 긍정적이고 다양·명확, 부정 행동 없거나 극히 미약" },
  { score: 4, levelLabel: "우수", criteria: "긍정 행동이 많고 강도 높음, 일부 부정은 약함" },
  { score: 3, levelLabel: "보통", criteria: "긍정·부정이 비슷한 빈도/강도" },
  { score: 2, levelLabel: "미흡", criteria: "부정 행동이 다양하게 나타남, 긍정은 약함" },
  { score: 1, levelLabel: "매우 미흡", criteria: "거의 전부 부정/미관찰, 긍정 없거나 극히 미미" },
];

async function seedRatingScaleAnchors(): Promise<number> {
  let count = 0;
  for (const domain of ANCHOR_DOMAINS) {
    for (const a of RATING_ANCHORS) {
      await prisma.ratingScaleAnchor.upsert({
        where: { domain_score: { domain, score: a.score } },
        create: { domain, score: a.score, levelLabel: a.levelLabel, criteria: a.criteria, sortOrder: 5 - a.score },
        update: { levelLabel: a.levelLabel, criteria: a.criteria, sortOrder: 5 - a.score },
      });
      count += 1;
    }
  }
  return count;
}

type IndicatorSeed = { code: string; polarity: BehaviorPolarity; textKo: string };
type SubskillSeed = { code: string; nameKo: string; definition: string; indicators: IndicatorSeed[] };
type CompetencySeed = { competencyCode: string; nameKo: string; definition: string; subskills: SubskillSeed[] };

const TASK_BRIEF =
  "당신은 팀장입니다. 최근 두 분기 연속 목표를 달성하지 못한 팀원 김대리와 1:1 면담을 진행합니다. " +
  "질책이 아니라 원인을 함께 진단하고, 실행 가능한 개선 계획에 합의하는 것이 목표입니다. " +
  "상대의 감정을 존중하면서도 성과 기준은 분명히 유지하세요.";

const RECOMMENDED_SEQUENCE =
  "① 라포 형성·목적 공유 → ② 사실 기반 현황 확인 → ③ 원인 경청·공감 → ④ 기대 수준 재확인 → ⑤ 개선 계획 합의 → ⑥ 후속 점검 일정 확정";

const PERSONA_PROFILE =
  "성실하지만 최근 개인 사정과 업무 과부하로 자신감이 떨어져 있다. 처음에는 방어적이고 변명하며 '노력은 했다'고 말한다. " +
  "팀장이 비난하지 않고 경청·공감하며 구체적 지원을 제안하면 점차 마음을 열고 솔직하게 어려움을 털어놓는다. " +
  "팀장이 다그치거나 일방적으로 지시하면 위축되어 형식적으로만 수긍한다. 응시자에게는 이 지침을 노출하지 않는다.";

const OPENING_LINE = "(다소 굳은 표정으로) 팀장님, 부르셨다고 해서 왔습니다… 요즘 제 실적 얘기 때문이시죠?";

const UNDERPERFORM_SCENARIO = {
  code: "UNDERPERFORM_1ON1",
  kind: "ROLE_PLAY" as const,
  titleKo: "저성과 팀원과의 면담",
  reportKindLabel: "ASSESSMENT REPORT · 역할수행 과제",
  roleContext: "팀장 / 최근 성과가 저조한 팀원과의 1:1 면담",
  taskBrief: TASK_BRIEF,
  durationMinutes: 15,
  recommendedSequence: RECOMMENDED_SEQUENCE,
  personaName: "김대리",
  personaRole: "입사 4년차 팀원(최근 2개 분기 목표 미달)",
  personaProfile: PERSONA_PROFILE,
  openingLine: OPENING_LINE,
  maxTurns: 6,
  sortOrder: 0,
};

const UNDERPERFORM_COMPETENCIES: CompetencySeed[] = [
  {
    competencyCode: "COMMUNICATION",
    nameKo: "의사소통",
    definition: "상대의 말을 경청하고 의도를 정확히 파악하며 메시지를 명확하고 존중하는 방식으로 전달한다.",
    subskills: [
      {
        code: "ACTIVE_LISTEN",
        nameKo: "적극적 경청",
        definition: "상대의 말을 끊지 않고 감정과 사실을 함께 확인한다.",
        indicators: [
          { code: "AL_P1", polarity: "POSITIVE", textKo: "상대의 말을 요약·반영하며 이해한 바를 확인한다." },
          { code: "AL_P2", polarity: "POSITIVE", textKo: "개방형 질문으로 상대가 상황을 설명하게 한다." },
          { code: "AL_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "상대의 말을 끊거나 자기 말만 한다." },
          { code: "AL_N2", polarity: "NEGATIVE_OR_MISSING", textKo: "상대의 감정과 맥락을 확인하지 않는다." },
        ],
      },
      {
        code: "CLEAR_MESSAGE",
        nameKo: "명확한 전달",
        definition: "기대 수준과 다음 단계를 구체적으로 전달한다.",
        indicators: [
          { code: "CM_P1", polarity: "POSITIVE", textKo: "기대 성과와 기준을 사실과 수치로 설명한다." },
          { code: "CM_P2", polarity: "POSITIVE", textKo: "다음 행동과 기한을 구체적으로 합의한다." },
          { code: "CM_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "모호하거나 추상적인 지시에 그친다." },
        ],
      },
    ],
  },
  {
    competencyCode: "LEADERSHIP",
    nameKo: "리더십",
    definition: "성과 기준을 유지하면서 구성원을 존중하고 성장을 지원한다.",
    subskills: [
      {
        code: "EMPATHY_SUPPORT",
        nameKo: "공감·지원",
        definition: "상대의 어려움을 인정하고 구체적인 지원을 제안한다.",
        indicators: [
          { code: "ES_P1", polarity: "POSITIVE", textKo: "상대의 감정과 상황을 비난 없이 인정한다." },
          { code: "ES_P2", polarity: "POSITIVE", textKo: "필요한 자원이나 코칭을 구체적으로 제안한다." },
          { code: "ES_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "질책과 비난으로 상대를 위축시킨다." },
          { code: "ES_N2", polarity: "NEGATIVE_OR_MISSING", textKo: "감정을 무시하고 성과만 압박한다." },
        ],
      },
      {
        code: "ACCOUNTABILITY",
        nameKo: "책임·기준 유지",
        definition: "공감하되 성과 기준과 책임을 분명히 한다.",
        indicators: [
          { code: "AC_P1", polarity: "POSITIVE", textKo: "공감과 함께 성과 기준을 분명히 유지한다." },
          { code: "AC_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "동정심에 기준을 흐리거나 문제를 덮는다." },
        ],
      },
    ],
  },
  {
    competencyCode: "PROBLEM_SOLVING",
    nameKo: "문제해결",
    definition: "저성과의 원인을 진단하고 실행 가능한 해결책에 합의한다.",
    subskills: [
      {
        code: "ROOT_CAUSE",
        nameKo: "원인 진단",
        definition: "증상이 아닌 근본 원인을 사실에 근거해 파악한다.",
        indicators: [
          { code: "RC_P1", polarity: "POSITIVE", textKo: "여러 가능성을 열고 원인을 함께 탐색한다." },
          { code: "RC_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "원인 진단 없이 성급하게 결론짓는다." },
        ],
      },
      {
        code: "ACTION_PLAN",
        nameKo: "실행 계획 합의",
        definition: "측정 가능한 개선 계획과 후속 점검을 합의한다.",
        indicators: [
          { code: "AP_P1", polarity: "POSITIVE", textKo: "목표, 기한, 후속 점검 일정을 합의한다." },
          { code: "AP_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "실행 계획 없이 훈계나 격려로 마무리한다." },
        ],
      },
    ],
  },
];

async function resolvePlatformCompetency(code: string) {
  const bank = await prisma.competency.findFirst({
    where: { code, organizationId: null, ownerScope: "PLATFORM" },
    include: {
      rubricSets: {
        where: { organizationId: null, isDefault: true },
        take: 1,
      },
    },
  });
  return bank;
}

async function seedUnderperformScenario(): Promise<void> {
  const scenario = await prisma.assessmentScenario.upsert({
    where: { code: UNDERPERFORM_SCENARIO.code },
    create: {
      ...UNDERPERFORM_SCENARIO,
      organizationId: null,
      isActive: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: {
      ...UNDERPERFORM_SCENARIO,
      isActive: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await seedScenarioCompetencies(scenario.id, UNDERPERFORM_COMPETENCIES);
}

// ── 서류함(In-Basket): 신임 팀장의 월요일 아침 ──

const INBASKET_SCENARIO = {
  code: "NEW_LEADER_INBOX",
  kind: "IN_BASKET" as const,
  titleKo: "신임 팀장의 월요일 아침 서류함",
  reportKindLabel: "ASSESSMENT REPORT · 서류함 과제",
  roleContext: "영업기획팀 신임 팀장 / 부임 첫 월요일, 전임자 인수인계 없음",
  taskBrief:
    "당신은 오늘부로 영업기획팀 팀장으로 부임했습니다. 전임 팀장은 급히 퇴사해 인수인계를 받지 못했습니다. " +
    "월요일 오전 8시 30분, 메일함에 8건의 메일·메모가 쌓여 있습니다. 오전 10시부터는 종일 외부 일정이라 지금 60분 안에 모든 항목을 처리해야 합니다. " +
    "각 항목에 대해 처리 방식(직접 회신 / 위임 / 상부 보고 / 보류 / 보관)을 정하고, 실제 처리 내용을 구체적으로 작성하세요. " +
    "회신이라면 회신문 초안을, 위임이라면 누구에게 무엇을 어떤 기준·기한으로 맡길지를, 보류라면 이유와 후속 시점을 쓰세요.",
  durationMinutes: 60,
  recommendedSequence:
    "① 전체 훑기 → ② 긴급·중요 분류 → ③ 중요 항목 우선 처리 → ④ 위임·보류 판단 → ⑤ 사소한 항목에 과잉대응하지 않기",
  sortOrder: 1,
};

const INBASKET_ITEMS: Array<{
  sortOrder: number;
  fromLabel: string;
  subject: string;
  body: string;
  urgency: string;
  importance: string;
  isDistractor: boolean;
  targetCompetencyCode: string | null;
}> = [
  {
    sortOrder: 1,
    fromLabel: "박상무 (영업본부장)",
    subject: "[긴급] 수요일 임원회의 — 상반기 실적 요약 보고",
    body: "김 팀장, 부임 축하하네. 수요일 오전 임원회의에서 영업기획팀이 상반기 채널별 실적 요약을 보고해야 하네. 전임 팀장이 준비하던 자료가 어디까지 됐는지 모르겠으니 확인해서 수요일 아침까지 내게 초안을 보내주게.",
    urgency: "HIGH",
    importance: "HIGH",
    isDistractor: false,
    targetCompetencyCode: "PROBLEM_SOLVING",
  },
  {
    sortOrder: 2,
    fromLabel: "이과장 (팀 선임)",
    subject: "거래처 A사 단가 인상 요구 — 회신 기한 오늘",
    body: "팀장님, 주요 거래처 A사가 다음 분기부터 납품 단가 8% 인상을 요구하며 오늘까지 회신을 달라고 합니다. 저희 마진 구조상 3% 이상은 어렵습니다. 전임 팀장님은 '버티라'고만 하셨는데 이제 어떻게 할까요? A사는 연 매출의 20%를 차지합니다.",
    urgency: "HIGH",
    importance: "HIGH",
    isDistractor: false,
    targetCompetencyCode: "PROBLEM_SOLVING",
  },
  {
    sortOrder: 3,
    fromLabel: "정대리",
    subject: "월간 실적 데이터 취합 방식 문의",
    body: "팀장님 안녕하세요. 매월 5일까지 하던 채널별 실적 취합, 이번 달도 기존 양식대로 진행하면 될까요? 참고로 지난달부터 B채널 데이터가 이틀씩 늦게 와서 마감이 빠듯합니다.",
    urgency: "MEDIUM",
    importance: "MEDIUM",
    isDistractor: false,
    targetCompetencyCode: "LEADERSHIP",
  },
  {
    sortOrder: 4,
    fromLabel: "인사팀",
    subject: "팀원 최사원 수습 평가서 제출 기한 안내 (금주 금요일)",
    body: "안녕하세요, 인사팀입니다. 귀 팀 최사원의 수습 종료 평가서를 금주 금요일까지 제출해 주시기 바랍니다. 평가서 미제출 시 자동으로 수습 연장 처리됩니다.",
    urgency: "MEDIUM",
    importance: "HIGH",
    isDistractor: false,
    targetCompetencyCode: "PROBLEM_SOLVING",
  },
  {
    sortOrder: 5,
    fromLabel: "총무팀",
    subject: "사무실 좌석 배치 변경 수요 조사 (회신: 다음 주 수요일)",
    body: "다음 달 사무실 리모델링에 따라 팀별 좌석 배치 희망안을 다음 주 수요일까지 회신해 주시기 바랍니다. 미회신 시 현행 유지로 처리됩니다.",
    urgency: "LOW",
    importance: "LOW",
    isDistractor: true,
    targetCompetencyCode: "PROBLEM_SOLVING",
  },
  {
    sortOrder: 6,
    fromLabel: "김주임",
    subject: "(부탁) 목요일 반차 관련",
    body: "팀장님, 처음 인사드리는데 이런 부탁부터 드려 죄송합니다. 목요일에 개인 사정으로 반차를 쓰고 싶은데, 그날 정대리님도 외근이라 자리가 빕니다. 괜찮을까요? 급한 건 아니고 수요일까지만 알려주시면 됩니다.",
    urgency: "LOW",
    importance: "LOW",
    isDistractor: true,
    targetCompetencyCode: "LEADERSHIP",
  },
  {
    sortOrder: 7,
    fromLabel: "품질관리팀 한팀장",
    subject: "C제품 불량률 급증 — 영업 대응 협의 요청",
    body: "김 팀장님, 부임 첫날부터 미안합니다. 지난주 C제품 불량률이 평소의 3배로 뛰었습니다. 이미 출하된 물량이 있어 주요 거래처 클레임이 이번 주 안에 들어올 가능성이 큽니다. 영업 쪽 선제 대응을 협의하고 싶습니다. 언제 시간 되십니까?",
    urgency: "HIGH",
    importance: "HIGH",
    isDistractor: false,
    targetCompetencyCode: "COMMUNICATION",
  },
  {
    sortOrder: 8,
    fromLabel: "전임 팀장 (퇴사자, 자동 전달)",
    subject: "FW: 미결 — 분기 판촉비 정산 이슈",
    body: "(전달된 메일) 경리팀장님, 판촉비 정산 건은 제가 퇴사 전까지 정리해서 넘기겠습니다. — 이 메일은 규정에 따라 후임자에게 자동 전달되었습니다. 첨부: 판촉비_정산_미결내역.xlsx (거래처 3곳, 합계 4,200만원, 증빙 일부 누락)",
    urgency: "MEDIUM",
    importance: "HIGH",
    isDistractor: false,
    targetCompetencyCode: "PROBLEM_SOLVING",
  },
];

const INBASKET_COMPETENCIES: CompetencySeed[] = [
  {
    competencyCode: "PROBLEM_SOLVING",
    nameKo: "문제해결·의사결정",
    definition: "긴급성과 중요성을 구분해 우선순위를 정하고, 불완전한 정보 하에서 리스크를 인지한 채 근거 있는 판단을 내린다.",
    subskills: [
      {
        code: "PRIORITIZE",
        nameKo: "우선순위 판단",
        definition: "긴급하지만 사소한 일과 긴급하지 않지만 중요한 일을 구분해 시간을 배분한다.",
        indicators: [
          { code: "PR_P1", polarity: "POSITIVE", textKo: "중요·긴급 항목(임원 보고, A사 회신, 불량 대응)을 먼저·깊게 처리한다." },
          { code: "PR_P2", polarity: "POSITIVE", textKo: "사소한 항목(좌석 조사, 반차)은 간단히 처리하거나 뒤로 미룬다." },
          { code: "PR_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "미끼 항목에 장문으로 과잉대응하고 중요 항목을 소홀히 한다." },
          { code: "PR_N2", polarity: "NEGATIVE_OR_MISSING", textKo: "모든 항목을 같은 깊이로 처리해 우선순위 판단이 드러나지 않는다." },
        ],
      },
      {
        code: "RISK_DECISION",
        nameKo: "리스크 인지 의사결정",
        definition: "결정에 따르는 리스크(매출 비중, 컴플라이언스 등)를 명시적으로 고려해 판단한다.",
        indicators: [
          { code: "RD_P1", polarity: "POSITIVE", textKo: "A사 매출 비중 20%·마진 한계 등 제약을 고려해 협상안 또는 보고 경로를 정한다." },
          { code: "RD_P2", polarity: "POSITIVE", textKo: "증빙 누락 정산 건의 규정 리스크를 인지하고 확인 절차를 밟는다." },
          { code: "RD_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "정보가 부족한데도 확인 없이 단정적으로 결정한다." },
          { code: "RD_N2", polarity: "NEGATIVE_OR_MISSING", textKo: "결정이 필요한 항목을 무기한 보류하며 회피한다." },
        ],
      },
    ],
  },
  {
    competencyCode: "LEADERSHIP",
    nameKo: "리더십(위임·활용)",
    definition: "직접 할 일과 맡길 일을 구분하고, 맡길 때는 담당자·산출물·기한·기준을 명확히 하여 팀을 활용한다.",
    subskills: [
      {
        code: "DELEGATE_CLEAR",
        nameKo: "명확한 위임",
        definition: "위임 시 누구에게·무엇을·언제까지·어떤 기준으로를 명시한다.",
        indicators: [
          { code: "DL_P1", polarity: "POSITIVE", textKo: "실무 항목을 적임자에게 맡기며 산출물·기한·기준을 명시한다." },
          { code: "DL_P2", polarity: "POSITIVE", textKo: "위임하면서도 최종 확인 지점(보고 시점)을 남긴다." },
          { code: "DL_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "모든 일을 직접 처리하려 하거나, 판단 없이 통째로 떠넘긴다." },
        ],
      },
    ],
  },
  {
    competencyCode: "COMMUNICATION",
    nameKo: "이해관계자 커뮤니케이션",
    definition: "상부 보고·타 부서 협의·팀원 지시 등 상대와 상황에 맞는 톤과 정보 수준으로 명확하게 소통한다.",
    subskills: [
      {
        code: "STAKEHOLDER_FIT",
        nameKo: "상대 맞춤 소통",
        definition: "받는 사람이 다음 행동을 알 수 있게 명확하고 상황에 맞게 쓴다.",
        indicators: [
          { code: "SF_P1", polarity: "POSITIVE", textKo: "타 팀장 협의 요청에 구체적 시간·안건을 제시하며 협력적으로 응한다." },
          { code: "SF_P2", polarity: "POSITIVE", textKo: "상부 보고 시 현황·리스크·계획을 구조화해 전달한다." },
          { code: "SF_N1", polarity: "NEGATIVE_OR_MISSING", textKo: "회신문이 모호해 받는 사람이 다음 행동을 알 수 없다." },
        ],
      },
    ],
  },
];

async function seedScenarioCompetencies(
  scenarioId: string,
  competencies: CompetencySeed[],
): Promise<void> {
  for (const [competencyIndex, competency] of competencies.entries()) {
    const bank = await resolvePlatformCompetency(competency.competencyCode);
    const scenarioCompetency = await prisma.assessmentScenarioCompetency.upsert({
      where: {
        scenarioId_competencyCode: {
          scenarioId,
          competencyCode: competency.competencyCode,
        },
      },
      create: {
        scenarioId,
        competencyId: bank?.id ?? null,
        rubricSetId: bank?.rubricSets[0]?.id ?? null,
        competencyCode: competency.competencyCode,
        nameKo: competency.nameKo,
        definition: competency.definition,
        sortOrder: competencyIndex,
      },
      update: {
        competencyId: bank?.id ?? null,
        rubricSetId: bank?.rubricSets[0]?.id ?? null,
        nameKo: competency.nameKo,
        definition: competency.definition,
        sortOrder: competencyIndex,
      },
    });

    for (const [subskillIndex, subskill] of competency.subskills.entries()) {
      const scenarioSubskill = await prisma.assessmentScenarioSubskill.upsert({
        where: {
          scenarioCompetencyId_code: {
            scenarioCompetencyId: scenarioCompetency.id,
            code: subskill.code,
          },
        },
        create: {
          scenarioCompetencyId: scenarioCompetency.id,
          code: subskill.code,
          nameKo: subskill.nameKo,
          definition: subskill.definition,
          sortOrder: subskillIndex,
        },
        update: {
          nameKo: subskill.nameKo,
          definition: subskill.definition,
          sortOrder: subskillIndex,
        },
      });

      for (const [indicatorIndex, indicator] of subskill.indicators.entries()) {
        await prisma.assessmentScenarioIndicator.upsert({
          where: {
            subskillId_code: {
              subskillId: scenarioSubskill.id,
              code: indicator.code,
            },
          },
          create: {
            subskillId: scenarioSubskill.id,
            code: indicator.code,
            polarity: indicator.polarity,
            textKo: indicator.textKo,
            sortOrder: indicatorIndex,
          },
          update: {
            polarity: indicator.polarity,
            textKo: indicator.textKo,
            sortOrder: indicatorIndex,
          },
        });
      }
    }
  }
}

async function seedInBasketScenario(): Promise<void> {
  const scenario = await prisma.assessmentScenario.upsert({
    where: { code: INBASKET_SCENARIO.code },
    create: {
      ...INBASKET_SCENARIO,
      organizationId: null,
      isActive: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: {
      ...INBASKET_SCENARIO,
      isActive: true,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await seedScenarioCompetencies(scenario.id, INBASKET_COMPETENCIES);

  // (scenarioId, sortOrder) 유니크 제약이 없으므로 sortOrder 기준 수동 upsert —
  // 기존 응답이 연결된 아이템을 삭제하지 않기 위해 delete+recreate 대신 갱신한다.
  for (const item of INBASKET_ITEMS) {
    const bank = item.targetCompetencyCode
      ? await resolvePlatformCompetency(item.targetCompetencyCode)
      : null;
    const existing = await prisma.assessmentInBasketItem.findFirst({
      where: { scenarioId: scenario.id, sortOrder: item.sortOrder },
    });
    if (existing) {
      await prisma.assessmentInBasketItem.update({
        where: { id: existing.id },
        data: {
          fromLabel: item.fromLabel,
          subject: item.subject,
          body: item.body,
          urgency: item.urgency,
          importance: item.importance,
          isDistractor: item.isDistractor,
          targetCompetencyCode: item.targetCompetencyCode,
          targetCompetencyId: bank?.id ?? null,
        },
      });
    } else {
      await prisma.assessmentInBasketItem.create({
        data: {
          scenarioId: scenario.id,
          ...item,
          targetCompetencyId: bank?.id ?? null,
        },
      });
    }
  }
}

export async function seedEvidenceAssessment(): Promise<void> {
  const anchorCount = await seedRatingScaleAnchors();
  await seedUnderperformScenario();
  await seedInBasketScenario();
  console.log(
    `[evidence-assessment] 평정척도 ${anchorCount}행, ${UNDERPERFORM_SCENARIO.code}·${INBASKET_SCENARIO.code} 시나리오를 동기화했습니다.`,
  );
}

const invokedDirectly = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("evidence-assessment.ts");

if (invokedDirectly) {
  seedEvidenceAssessment()
    .catch((error) => {
      console.error("[evidence-assessment] 시드 실패:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

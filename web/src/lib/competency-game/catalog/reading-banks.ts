/**
 * 독해형 뱅크 — 의도 독해 · 베스트/워스트
 * 영어앱 독해처럼 지문 → 정확히 고르기
 */

import type { CompetencyCode } from "@/types";
import { getLexicon } from "@/lib/competency/lexicon";

export type IntentReadDraft = {
  passage: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explain: string;
};

export type BestWorstDraft = {
  scenario: string;
  prompt: string;
  choices: string[];
  bestIndex: number;
  worstIndex: number;
  explain: string;
};

type ReadingPack = {
  intentReads: IntentReadDraft[];
  bestWorsts: BestWorstDraft[];
};

const PACKS: Record<CompetencyCode, ReadingPack> = {
  COMMUNICATION: {
    intentReads: [
      {
        passage:
          "면접관: 「팀에서 의견이 갈렸을 때 어떻게 조율하셨나요?」\n지원자 메모: 성격이 원만하다는 이야기를 길게 준비함.",
        prompt: "이 질문이 진짜 보려는 의도는?",
        choices: [
          "갈등에서 합의를 이끈 구체 행동과 결과",
          "평소 성격이 원만하다는 인상 전달",
          "갈등을 피하고 넘어간 태도",
          "상사에게 결정을 맡긴 신중함",
        ],
        answerIndex: 0,
        explain: "의도 독해: ‘조율’은 성격이 아니라 합의 행동·근거·결과를 묻습니다.",
      },
      {
        passage:
          "메일 본문: 「이번 주 배포 범위, 리스크, 롤백 기준을 한 장으로 공유해 주세요. 내일 스탠드업 전에 보고 결정하겠습니다.」",
        prompt: "보낸 사람이 원하는 핵심 산출은?",
        choices: [
          "범위·리스크·롤백이 담긴 한 장 요약",
          "배포를 하루 미루자는 제안",
          "팀에 대한 사과 메시지",
          "장문의 기술 스펙 전문",
        ],
        answerIndex: 0,
        explain: "의도: 결정용 한 장. 장문 스펙이나 사과가 아닙니다.",
      },
      {
        passage:
          "동료: 「일정은 지키되, 고객 문의가 몰리면 우선순위를 다시 잡아야 할 것 같아요.」\n당신: 답변을 준비 중.",
        prompt: "상대 발화의 핵심 의도는?",
        choices: [
          "일정과 문의 대응 중 트레이드오프를 같이 정하자",
          "일정을 무조건 지키자는 확정",
          "문의 대응을 포기하자는 제안",
          "당신 혼자 야근으로 해결하라는 지시",
        ],
        answerIndex: 0,
        explain: "의도 되받기: 일정 vs 문의 우선순위를 함께 맞추자는 신호입니다.",
      },
    ],
    bestWorsts: [
      {
        scenario:
          "배포 직후 결제 오류 문의가 몰렸다. 당신은 주니어 개발자다. 시니어는 회의 중이다.",
        prompt: "가장 좋은 행동(베스트)과 가장 나쁜 행동(워스트)을 고르세요.",
        choices: [
          "영향 범위를 한 줄로 정리해 채널에 올리고 롤백 여부를 묻는다",
          "문의가 잠잠해질 때까지 기다린다",
          "고객에게 「곧 고친다」고만 답하고 원인 파악은 미룬다",
          "로그를 보지 않은 채 서버를 재시작한다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "베스트는 범위 공유·의사결정 요청. 워스트는 근거 없는 재시작입니다.",
      },
      {
        scenario:
          "기획·개발이 API 필드명으로 이틀째 평행선이다. 출시 D-2다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "합의안·트레이드오프를 한 줄로 적어 양쪽 확인을 받는다",
          "더 목소리 큰 쪽 안을 그대로 따른다",
          "결정을 출시 이후로 미룬다",
          "회의에서 감정적으로 상대 안을 깎아내린다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "베스트는 결론 먼저 + 합의 기록. 워스트는 관계·합의를 깨는 발화입니다.",
      },
      {
        scenario:
          "상사가 「그래서 결론이 뭐야?」라고 화상 중간 mid에 끼어들었다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "한 문장 결론 → 근거 한 줄 → 필요 시 세부 순으로 다시 말한다",
          "처음부터 배경을 더 자세히 설명한다",
          "「잠깐만요」만 반복한다",
          "「잘 모르겠습니다」로 끝낸다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "결론 먼저가 베스트. 포기는 워스트입니다.",
      },
    ],
  },

  PROBLEM_SOLVING: {
    intentReads: [
      {
        passage:
          "면접관: 「가장 어려웠던 장애를 어떻게 해결했나요?」\n지원자 메모: 야근해서 막은 에피소드를 감동적으로 말하려 함.",
        prompt: "질문이 보려는 핵심 의도는?",
        choices: [
          "문제 정의·가설·검증·재발 방지까지의 사고 과정",
          "얼마나 오래 야근했는지",
          "팀원 칭찬으로 분위기 만들기",
          "장애가 없었다는 안정성 어필",
        ],
        answerIndex: 0,
        explain: "문제해결 의도는 사고 과정과 재발 방지입니다.",
      },
      {
        passage:
          "슬랙: 「전환율이 이틀째 떨어져요. 원인 가설 세 개랑 오늘 검증 순서만 먼저 공유해 주세요.」",
        prompt: "요청자가 지금 당장 원하는 것은?",
        choices: [
          "가설 목록과 검증 우선순위",
          "완성된 최종 수정 PR",
          "사과문 초안",
          "다음 분기 로드맵",
        ],
        answerIndex: 0,
        explain: "의도: 가설·검증 순서. 완성 PR이 아닙니다.",
      },
      {
        passage:
          "리뷰어: 「이 핫픽스는 증상은 줄여요. 근본 원인은 어디에 적어 두었죠?」",
        prompt: "리뷰어 질문의 의도는?",
        choices: [
          "재발 방지로 이어지는 원인·조치 기록 여부",
          "핫픽스를 되돌리자는 지시",
          "코드 스타일 지적",
          "일정 연기를 승인받자는 제안",
        ],
        answerIndex: 0,
        explain: "근본 원인·재발 방지를 묻습니다.",
      },
    ],
    bestWorsts: [
      {
        scenario: "결제 전환율이 이틀째 떨어졌다. 배포는 어제 있었다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "영향 지표로 문제를 한 줄 정의하고 가설을 나눠 검증한다",
          "체감으로 「서버 문제」라 단정한다",
          "문의가 줄 때까지 관망한다",
          "로그 없이 전체 롤백부터 강행한다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "베스트는 문제 정의+가설. 워스트는 근거 없는 전면 롤백입니다.",
      },
      {
        scenario: "성능과 신기능 일정 중 하나만 지킬 수 있다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "무엇을 포기·지킬지 트레이드오프를 명시하고 합의한다",
          "둘 다 지키겠다고 하고 일정을 넘긴다",
          "결정을 미루고 매일 논쟁한다",
          "상대 팀을 탓하며 회의를 끝낸다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "트레이드오프 명시는 베스트, 비난은 워스트입니다.",
      },
      {
        scenario: "핫픽스로 장애는 멈췄다. 같은 피크가 다음 주 예정이다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "알림·가드 규칙을 바꿔 재발을 막고 기록한다",
          "「일단 됐고」로 이슈를 닫는다",
          "야근만 더 하겠다는 계획을 세운다",
          "로그를 지워 원인을 숨긴다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "재발 방지가 베스트. 증거 은폐는 워스트입니다.",
      },
    ],
  },

  JOB_FIT: {
    intentReads: [
      {
        passage:
          "면접관: 「우리 공고의 주 과업과 본인 경험의 연결을 말해 주세요.」\n지원자 메모: 회사 성장성·문화 칭찬을 먼저 말하려 함.",
        prompt: "질문이 보려는 의도는?",
        choices: [
          "주 과업 ↔ 내 산출·성과의 직접 매칭",
          "회사에 대한 호감 표현",
          "전공 성적 나열",
          "앞으로 배우겠다는 태도만",
        ],
        answerIndex: 0,
        explain: "직무적합 의도는 과업 매칭 증거입니다.",
      },
      {
        passage:
          "JD 요약: 「주간 실험 보드 운영, CAC 개선, SQL·스프레드시트 활용」",
        prompt: "이 JD를 읽은 뒤 면접에서 가장 먼저 맞춰야 할 신호는?",
        choices: [
          "실험 보드·CAC·도구 사용 경험",
          "동아리 친목 활동",
          "취미로 읽은 경영 서적",
          "이전 회사 복리후생",
        ],
        answerIndex: 0,
        explain: "지문의 주 과업·도구가 독해 포인트입니다.",
      },
      {
        passage:
          "면접관: 「부족한 스택이 있다면 어떻게 메울 건가요?」",
        prompt: "질문 의도에 가장 가까운 해석은?",
        choices: [
          "갭을 인정하고 학습·산출 계획으로 메우는 방식",
          "부족한 점이 전혀 없다고 주장",
          "회사 교육을 기다리겠다는 태도",
          "다른 지원자 탓으로 돌리기",
        ],
        answerIndex: 0,
        explain: "갭 메우기 계획·실행이 의도입니다.",
      },
    ],
    bestWorsts: [
      {
        scenario: "공고 주 과업이 ‘주간 실험’인데, 경험은 월간 리포트 위주다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "유사 퍼널 개선 경험을 주간 주기로 재구성해 연결한다",
          "성장 가능성이 커서 지원했다고만 말한다",
          "과업과 무관한 수상 경력을 길게 말한다",
          "주 과업을 읽지 않은 티를 내며 질문을 되돌린다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "과업 매칭이 베스트. JD 무시는 워스트입니다.",
      },
      {
        scenario: "면접에서 사용 툴을 물었다. SQL은 기초, 보드는 익숙하다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "보드 산출을 말하고 SQL은 학습·적용 계획을 붙인다",
          "모든 툴을 마스터했다고 과장한다",
          "툴 이야기를 피하고 성격만 말한다",
          "「잘 모릅니다」로 끝내고 대안을 안 낸다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "증거+갭 계획이 베스트입니다.",
      },
      {
        scenario: "면접관이 「입사 후 첫 달을 어떻게 설계하겠어요?」라고 묻는다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "실험 보드·리뷰 같은 직무 산출 일정을 구체화한다",
          "적응만 하겠다고 막연히 말한다",
          "회사 복지를 먼저 묻는다",
          "첫 달은 쉬면서 둘러보겠다고 한다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "직무 산출 계획이 베스트입니다.",
      },
    ],
  },

  ORG_FIT: {
    intentReads: [
      {
        passage:
          "면접관: 「우리 조직에서 일하려면 어떤 방식이 맞을까요?」\n지원자 메모: 어느 조직이든 잘 맞는다고 말하려 함.",
        prompt: "질문이 보려는 의도는?",
        choices: [
          "이 조직의 의사결정·협업 방식과 내 행동의 정합",
          "어디에나 잘 적응한다는 만능 태도",
          "연봉·복지 우선순위",
          "전 직장 불만 토로",
        ],
        answerIndex: 0,
        explain: "조직적합은 구체 방식 정합을 봅니다.",
      },
      {
        passage:
          "채용 페이지: 「문서화·투명한 공유·역할 경계를 중시합니다. 빠른 실행도 중요하지만, 합의 없는 단독 배포는 지양합니다.」",
        prompt: "이 조직이 특히 경계하는 행동은?",
        choices: [
          "합의·공유 없는 단독 배포",
          "문서 한 장으로 공유하기",
          "역할 경계를 존중하기",
          "투명하게 리스크를 말하기",
        ],
        answerIndex: 0,
        explain: "지문이 명시한 금지 신호는 단독 배포입니다.",
      },
      {
        passage:
          "면접관: 「규정과 속도가 충돌할 때 어떻게 하시겠어요?」",
        prompt: "의도 독해로 가장 맞는 해석은?",
        choices: [
          "규정·리스크를 지키며 합의 가능한 속도를 찾는 판단",
          "규정은 무시하고 속도만 내기",
          "항상 규정만 따르고 개선 제안은 안 하기",
          "결정을 무한히 미루기",
        ],
        answerIndex: 0,
        explain: "공공·대기업 렌즈: 절차와 실행의 균형입니다.",
      },
    ],
    bestWorsts: [
      {
        scenario: "급한 요청으로 문서 없이 배포하자는 제안이 들어왔다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "최소 체크리스트로 리스크를 남기고 합의 후 배포한다",
          "문서 없이 바로 배포한다",
          "응답을 무시한다",
          "규정을 이유로 협의 없이 전부 거절만 한다",
        ],
        bestIndex: 0,
        worstIndex: 1,
        explain: "최소 기록+합의가 베스트. 무단 배포가 워스트입니다.",
      },
      {
        scenario: "다른 팀 영역 업무를 당신이 대신 처리해 달라는 요청이다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "역할 경계를 확인하고 필요 시 정식 핸드오프를 잡는다",
          "경계 무시하고 혼자 다 한다",
          "상대를 공개적으로 비난한다",
          "업무를 조용히 방치한다",
        ],
        bestIndex: 0,
        worstIndex: 2,
        explain: "경계 확인이 베스트. 공개 비난은 워스트입니다.",
      },
      {
        scenario: "신규 입사자가 온보딩 문서가 없다고 헤맨다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "핵심 절차를 짧게 문서화해 공유하고 피드백을 받는다",
          "「알아서 배우라」고 한다",
          "구두로만 알려 주고 남기지 않는다",
          "온보딩을 방해한다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "문서화·공유가 조직적합 베스트입니다.",
      },
    ],
  },

  LEADERSHIP: {
    intentReads: [
      {
        passage:
          "면접관: 「팀을 이끌었던 경험을 말해 주세요.」\n지원자 메모: 성격이 리더형이라는 자기소개를 준비함.",
        prompt: "질문이 보려는 의도는?",
        choices: [
          "목표 정렬·위임·장애 제거 등 관찰 가능한 리더 행동",
          "타고난 리더 기질 강조",
          "직함·직책 이름만 나열",
          "혼자 다 해낸 영웅담",
        ],
        answerIndex: 0,
        explain: "리더십은 기질이 아니라 행동 증거입니다.",
      },
      {
        passage:
          "팀 슬랙: 「이번 주 목표가 사람마다 달라요. 같은 지표를 보게 해 주세요.」",
        prompt: "요청의 핵심 의도는?",
        choices: [
          "공유 목표·지표로 팀을 정렬해 달라는 것",
          "목표를 없애 달라는 것",
          "개인 KPI만 따로 키우라는 것",
          "회의를 취소하라는 것",
        ],
        answerIndex: 0,
        explain: "정렬·공유 지표가 의도입니다.",
      },
      {
        passage:
          "면접관: 「성과가 안 나오는 팀원을 어떻게 하셨나요?」",
        prompt: "의도 독해상 올바른 해석은?",
        choices: [
          "피드백·지원·기준 명확화로 성과를 회복시킨 과정",
          "바로 교체했다는 강경함만",
          "문제를 못 본 척했다는 온정",
          "전부 대신 해 준 희생",
        ],
        answerIndex: 0,
        explain: "육성·기준·결과의 균형이 의도입니다.",
      },
    ],
    bestWorsts: [
      {
        scenario: "팀 목표가 제각각이라 주간 리뷰가 산만하다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "주간 목표를 소수로 고정해 같은 지표를 보게 한다",
          "목표가 정해질 때까지 논의를 끝없이 연다",
          "자신이 모든 일을 대신한다",
          "성과 낮은 사람을 공개적으로 망신 준다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "정렬이 베스트. 공개 망신은 워스트입니다.",
      },
      {
        scenario: "마감 전날 막힌 작업을 팀원이 보고했다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "장애물을 제거하고 필요 시 범위를 조정한다",
          "「알아서 해」만 반복한다",
          "보고한 사람을 탓한다",
          "아무 조치 없이 마감만 독촉한다",
        ],
        bestIndex: 0,
        worstIndex: 2,
        explain: "장애 제거가 베스트입니다.",
      },
      {
        scenario: "의사결정이 매일 번복되어 팀이 피로하다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "결정 기준표를 만들어 빠른 선택을 가능하게 한다",
          "합의될 때까지 결정을 무기한 미룬다",
          "독단으로 매일 번복한다",
          "책임을 팀에 떠넘긴다",
        ],
        bestIndex: 0,
        worstIndex: 2,
        explain: "기준표·일관성이 베스트입니다.",
      },
    ],
  },

  GROWTH: {
    intentReads: [
      {
        passage:
          "면접관: 「실패에서 무엇을 배웠나요?」\n지원자 메모: 실패가 없었다는 답을 준비함.",
        prompt: "질문이 보려는 의도는?",
        choices: [
          "실패 → 학습 → 다음 행동 변화의 이어지는 성장 루프",
          "실패가 없다는 완벽함",
          "운 탓으로 돌리기",
          "감정 위로만 구하기",
        ],
        answerIndex: 0,
        explain: "성장 의도는 학습 전이입니다.",
      },
      {
        passage:
          "피드백: 「발표는 좋았는데, 수치 근거가 약했어요. 다음엔 지표를 붙여 주세요.」",
        prompt: "피드백의 실행 의도는?",
        choices: [
          "다음 산출에 검증 가능한 지표를 붙이라는 것",
          "발표를 그만두라는 것",
          "수치를 조작하라는 것",
          "피드백을 무시해도 된다는 것",
        ],
        answerIndex: 0,
        explain: "성장 = 피드백을 다음 행동에 반영.",
      },
      {
        passage:
          "면접관: 「최근 세 달간 의도적으로 키운 스킬이 있나요?」",
        prompt: "의도 독해로 맞는 해석은?",
        choices: [
          "목표·연습·산출로 증명되는 의도적 학습",
          "유튜브만 본 감상",
          "언젠가 배울 계획만",
          "남이 시킨 교육 이수 증명만",
        ],
        answerIndex: 0,
        explain: "의도적 학습의 증거(산출)를 묻습니다.",
      },
    ],
    bestWorsts: [
      {
        scenario: "첫 발표 피드백으로 「근거가 약하다」는 말을 들었다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "다음 발표에 지표를 붙이고 변화를 기록한다",
          "피드백을 무시한다",
          "피드백한 사람을 피한다",
          "「원래 그런 스타일」이라며 고치지 않는다",
        ],
        bestIndex: 0,
        worstIndex: 2,
        explain: "반영·기록이 베스트입니다.",
      },
      {
        scenario: "새 도구를 써야 하는 프로젝트가 시작됐다. 경험은 없다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "작은 산출물로 먼저 검증하며 학습 루프를 돌린다",
          "배우기 전에 큰 설계만 미룬다",
          "모른다고 숨기고 넘어간다",
          "다른 사람 결과물을 베끼고 만다",
        ],
        bestIndex: 0,
        worstIndex: 3,
        explain: "작은 산출 학습이 베스트입니다.",
      },
      {
        scenario: "지난 분기 목표가 미달했다.",
        prompt: "가장 좋은 행동과 가장 나쁜 행동을 고르세요.",
        choices: [
          "원인을 분해하고 다음 분기 가설·지표를 다시 잡는다",
          "외부 탓만 한다",
          "목표를 없었던 일로 한다",
          "같은 방식을 바꾸지 않고 반복한다",
        ],
        bestIndex: 0,
        worstIndex: 2,
        explain: "회고→재설계가 베스트입니다.",
      },
    ],
  },
};

/** 단어장 신호어를 explain에 살짝 연결 */
function withLexiconHint<T extends { explain: string }>(
  competency: CompetencyCode,
  draft: T,
): T {
  const terms = getLexicon(competency).terms.slice(0, 2).map((t) => t.termKo);
  if (!terms.length) return draft;
  return {
    ...draft,
    explain: `${draft.explain} (신호어: ${terms.join("·")})`,
  };
}

export function intentReadBank(competency: CompetencyCode): IntentReadDraft[] {
  return PACKS[competency].intentReads.map((d) => withLexiconHint(competency, d));
}

export function bestWorstBank(competency: CompetencyCode): BestWorstDraft[] {
  return PACKS[competency].bestWorsts.map((d) => withLexiconHint(competency, d));
}

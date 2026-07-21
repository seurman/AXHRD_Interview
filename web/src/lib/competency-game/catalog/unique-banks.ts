/**
 * 게임 타입별 고유 뱅크 — judges/stories를 재사용하지 않음
 */

import type { CompetencyCode } from "@/types";
import type {
  ChipBuildItem,
  MatchPairsItem,
  SpotWeakItem,
  TrueFalseItem,
} from "../types";

type Banks = {
  trueFalse: Array<Pick<TrueFalseItem, "prompt" | "statement" | "isTrue" | "explain">>;
  matches: Array<Pick<MatchPairsItem, "prompt" | "left" | "right" | "answerMap" | "explain">>;
  spots: Array<Pick<SpotWeakItem, "prompt" | "sentences" | "weakIndex" | "explain">>;
  chips: Array<Pick<ChipBuildItem, "prompt" | "chips" | "answerOrder" | "explain">>;
};

const COMMON_TF_BASE = {
  prompt: "다음 진술이 참인지 고르세요.",
};

export const UNIQUE_BANKS: Record<CompetencyCode, Banks> = {
  COMMUNICATION: {
    trueFalse: [
      {
        ...COMMON_TF_BASE,
        statement: "면접 첫 문장은 분위기 설명부터 시작하는 편이 안전하다.",
        isTrue: false,
        explain: "첫 문장에 결론·행동을 두는 편이 설득력 있습니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "질문의 핵심 단어를 첫 문장에 되받으면 의도가 맞기 쉽다.",
        isTrue: true,
        explain: "질문 의도를 받아치는 신호입니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "결과가 없어도 노력한 과정을 길게 말하면 충분하다.",
        isTrue: false,
        explain: "과정만으로는 임팩트가 약합니다. 결과를 붙이세요.",
      },
    ],
    matches: [
      {
        prompt: "말하기 요소와 역할을 짝지으세요.",
        left: ["오프닝", "근거", "마무리"],
        right: ["한 줄 결론", "데이터·행동", "숫자 결과"],
        answerMap: [0, 1, 2],
        explain: "오프닝-근거-마무리 뼈대.",
      },
      {
        prompt: "약한 신호와 강한 신호를 짝지으세요.",
        left: ["약한 시작", "강한 시작", "약한 끝"],
        right: [
          "사실 그때는요…",
          "제가 한 일은 ○○입니다",
          "다들 힘들었습니다",
        ],
        answerMap: [0, 1, 2],
        explain: "신호 강약을 구분합니다.",
      },
      {
        prompt: "설득 재료를 짝지으세요.",
        left: ["리스크", "대안", "합의"],
        right: ["수치로 보여 주기", "범위 축소안", "이해관계자 OK"],
        answerMap: [0, 1, 2],
        explain: "설득 스토리의 세 재료.",
      },
    ],
    spots: [
      {
        prompt: "가장 설득력이 약한 문장을 고르세요.",
        sentences: [
          "일정 리스크를 표로 공유했습니다.",
          "사실 분위기가 좀 복잡했어요.",
          "역할 재분배로 하루를 앞당겼습니다.",
        ],
        weakIndex: 1,
        explain: "분위기만 있고 행동이 없습니다.",
      },
      {
        prompt: "질문 의도를 놓친 문장을 고르세요.",
        sentences: [
          "갈등에서 제가 한 일은 우선순위 합의였습니다.",
          "회사 비전과 제 가치관이 맞습니다.",
          "반발에는 데이터로 설득했습니다.",
        ],
        weakIndex: 1,
        explain: "갈등 질문이 아닌 지원 동기로 새었습니다.",
      },
      {
        prompt: "결과가 빠진 문장을 고르세요.",
        sentences: [
          "체크리스트를 도입해 질문이 절반으로 줄었습니다.",
          "페어 온보딩을 제안했습니다.",
          "시니어 시간을 주 4시간 아꼈습니다.",
        ],
        weakIndex: 1,
        explain: "제안만 있고 결과가 없습니다.",
      },
    ],
    chips: [
      {
        prompt: "설득 한 줄을 순서대로 조립하세요.",
        chips: ["리스크를 수치로", "보여 준 뒤", "범위 축소를", "합의했습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "재료→행동→합의.",
      },
      {
        prompt: "갈등 답의 뼈대를 조립하세요.",
        chips: ["의견이 갈려", "공통 지표를", "먼저 맞추고", "안을 고른 겁니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "상황→정렬→선택.",
      },
      {
        prompt: "결과 문장을 조립하세요.",
        chips: ["그 결과", "배포를", "하루 앞당겨", "마쳤습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "연결어→행동→결과.",
      },
    ],
  },
  JOB_FIT: {
    trueFalse: [
      {
        ...COMMON_TF_BASE,
        statement: "직무적합은 ‘성실함’만 강조해도 충분히 전달된다.",
        isTrue: false,
        explain: "과업·도구·성과 증거가 필요합니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "부족한 경험은 유사 과업에서의 학습 방법으로 메울 수 있다고 말하는 게 좋다.",
        isTrue: true,
        explain: "갭 + 전이 가능한 방법이 설득력 있습니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "복지·출퇴근 거리는 직무적합의 핵심 근거다.",
        isTrue: false,
        explain: "동기일 수는 있어도 직무 증거가 아닙니다.",
      },
    ],
    matches: [
      {
        prompt: "직무 증거 유형을 짝지으세요.",
        left: ["도구", "과업", "성과"],
        right: ["SQL·실험 보드", "실험 설계 12회", "CAC −18%"],
        answerMap: [0, 1, 2],
        explain: "도구-과업-성과 삼각.",
      },
      {
        prompt: "90일 계획 요소를 짝지으세요.",
        left: ["진단", "정착", "확장"],
        right: ["지표 가시화", "주간 리뷰 고정", "채널 스케일"],
        answerMap: [0, 1, 2],
        explain: "입사 초 로드맵.",
      },
      {
        prompt: "갭 대응을 짝지으세요.",
        left: ["인정", "방법", "증거"],
        right: ["대규모 경험 부족", "2주 파일럿", "동작 데모"],
        answerMap: [0, 1, 2],
        explain: "갭을 실행으로.",
      },
    ],
    spots: [
      {
        prompt: "직무 증거가 가장 약한 문장을 고르세요.",
        sentences: [
          "분기 12회 실험으로 전환을 1.4%p 올렸습니다.",
          "멀티플레이어라 뭐든 잘합니다.",
          "요구 스택 중 두 도구는 현업에서 썼습니다.",
        ],
        weakIndex: 1,
        explain: "초점이 없는 자평입니다.",
      },
      {
        prompt: "과업과 무관한 문장을 고르세요.",
        sentences: [
          "실험 보드로 주기를 1주로 줄였습니다.",
          "복지가 좋아 지원했습니다.",
          "CAC를 목표 안으로 맞췄습니다.",
        ],
        weakIndex: 1,
        explain: "직무 과업 근거가 아닙니다.",
      },
      {
        prompt: "수치가 모호한 문장을 고르세요.",
        sentences: [
          "리포트 준비 4시간→2시간으로 줄었습니다.",
          "업무가 꽤 빨라진 편입니다.",
          "실험 주기 2주→1주가 됐습니다.",
        ],
        weakIndex: 1,
        explain: "Before→After가 없습니다.",
      },
    ],
    chips: [
      {
        prompt: "직무 임팩트 문장을 조립하세요.",
        chips: ["유입 실험을", "주 3회 돌려", "CAC를", "18% 낮췄습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "과업→빈도→지표.",
      },
      {
        prompt: "자동화 기여를 조립하세요.",
        chips: ["수작업 리포트를", "SQL로 바꿔", "주간 리뷰에", "붙였습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "痛→도구→정착.",
      },
      {
        prompt: "갭 메우기를 조립하세요.",
        chips: ["채널 지식이", "부족해", "2주 파일럿으로", "CAC를 쟀습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "갭→실험→측정.",
      },
    ],
  },
  PROBLEM_SOLVING: {
    trueFalse: [
      {
        ...COMMON_TF_BASE,
        statement: "문제를 정의할 때는 현상을 측정 가능한 단위로 쪼개는 것이 좋다.",
        isTrue: true,
        explain: "측정 가능해야 검증·비교가 됩니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "야근으로 막으면 원인 분석은 생략해도 된다.",
        isTrue: false,
        explain: "노력≠문제해결. 정의·검증이 필요합니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "대안이 갈리면 영향·복구시간 같은 기준으로 비교하는 편이 낫다.",
        isTrue: true,
        explain: "트레이드오프 기준이 드러나야 합니다.",
      },
    ],
    matches: [
      {
        prompt: "문제해결 단계를 짝지으세요.",
        left: ["정의", "검증", "조치"],
        right: ["지표로 쪼개기", "가설 실험", "롤백·패치"],
        answerMap: [0, 1, 2],
        explain: "정의→검증→조치.",
      },
      {
        prompt: "신호와 대응을 짝지으세요.",
        left: ["알림", "영향 범위", "재발 방지"],
        right: ["타임아웃 급증", "상점 수 집계", "카나리 규칙"],
        answerMap: [0, 1, 2],
        explain: "감지→완화→제도.",
      },
      {
        prompt: "나쁜 습관과 좋은 습관을 짝지으세요.",
        left: ["감으로 고름", "기준 표", "회의만"],
        right: ["익숙한 안 선택", "영향·시간 비교", "정의 없이 논의"],
        answerMap: [0, 1, 2],
        explain: "습관 대조.",
      },
    ],
    spots: [
      {
        prompt: "문제해결이 가장 약한 문장을 고르세요.",
        sentences: [
          "퍼널을 쪼개 결제 병목을 찾았습니다.",
          "일단 인력 투입량을 늘려 버티기로 했습니다.",
          "타임아웃을 조정해 전환율이 회복됐습니다.",
        ],
        weakIndex: 1,
        explain: "정의·선택 없이 투입만 키웁니다.",
      },
      {
        prompt: "근거가 없는 문장을 고르세요.",
        sentences: [
          "로그를 구간별로 나눠 확인했습니다.",
          "직감으로 서버가 문제라고 봤습니다.",
          "가설 3개를 영향도 순으로 검증했습니다.",
        ],
        weakIndex: 1,
        explain: "데이터가 없습니다.",
      },
      {
        prompt: "결과가 빠진 문장을 고르세요.",
        sentences: [
          "평균 복구 90분→25분으로 줄었습니다.",
          "롤백안을 제안했습니다.",
          "다음 피크에서 재발하지 않았습니다.",
        ],
        weakIndex: 1,
        explain: "제안만 있고 결과 수치가 없습니다.",
      },
    ],
    chips: [
      {
        prompt: "장애 대응을 조립하세요.",
        chips: ["영향 범위를", "집계한 뒤", "우회를 열고", "롤백했습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "완화→제거.",
      },
      {
        prompt: "실험 개선을 조립하세요.",
        chips: ["이탈 구간을", "좁힌 뒤", "A/B로", "승자 안을 배포했습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "병목→검증→확대.",
      },
      {
        prompt: "정의 문장을 조립하세요.",
        chips: ["전환율", "3%p 하락을", "결제 단계", "병목으로 좁혔습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "현상→분해.",
      },
    ],
  },
  ORG_FIT: {
    trueFalse: [
      {
        ...COMMON_TF_BASE,
        statement: "갈등이 생기면 피하는 것이 조직적합의 미덕이다.",
        isTrue: false,
        explain: "공통 기준으로 정렬하는 행동이 필요합니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "목표가 달라 보일 때 공통 성공 정의를 먼저 합의하는 편이 좋다.",
        isTrue: true,
        explain: "정렬의 시작점입니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "‘어디든 잘 적응하는 성격’만 말해도 조직적합이 증명된다.",
        isTrue: false,
        explain: "장면·행동이 있어야 합니다.",
      },
    ],
    matches: [
      {
        prompt: "정렬 도구를 짝지으세요.",
        left: ["충돌", "가시화", "합의"],
        right: ["일정 어긋남", "마일스톤 표", "범위 축소"],
        answerMap: [0, 1, 2],
        explain: "충돌→도구→합의.",
      },
      {
        prompt: "문화 맞춤을 짝지으세요.",
        left: ["투명성", "빠른 피드백", "암묵지"],
        right: ["리스크 공개", "중간 공유", "체크리스트"],
        answerMap: [0, 1, 2],
        explain: "문화→행동.",
      },
      {
        prompt: "신뢰 회복을 짝지으세요.",
        left: ["사고", "규칙", "이행"],
        right: ["공유 누락", "알림 합의", "2주 누락 제로"],
        answerMap: [0, 1, 2],
        explain: "책임→제도→증명.",
      },
    ],
    spots: [
      {
        prompt: "조직적합이 약한 문장을 고르세요.",
        sentences: [
          "공유 보드로 우선순위를 맞췄습니다.",
          "저는 어디든 잘 적응합니다.",
          "리뷰 대기가 4일→1.5일로 줄었습니다.",
        ],
        weakIndex: 1,
        explain: "성격 선언만 있습니다.",
      },
      {
        prompt: "회피에 가까운 문장을 고르세요.",
        sentences: [
          "목표가 달라 공통 정의를 다시 썼습니다.",
          "갈등이 생기면 시간이 지나길 기다립니다.",
          "범위를 줄여 출시일을 지켰습니다.",
        ],
        weakIndex: 1,
        explain: "정렬 행동이 없습니다.",
      },
      {
        prompt: "결과가 없는 문장을 고르세요.",
        sentences: [
          "중간 공유를 제도화해 막판 부하가 줄었습니다.",
          "피드백 문화가 좋다고 느꼈습니다.",
          "페어로 온보딩 질문이 줄었습니다.",
        ],
        weakIndex: 1,
        explain: "느낌만 있고 행동이 없습니다.",
      },
    ],
    chips: [
      {
        prompt: "일정 정렬을 조립하세요.",
        chips: ["일정이 어긋나", "공통 표를 만들고", "범위를 줄여", "약속을 지켰습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "충돌→도구→합의→결과.",
      },
      {
        prompt: "피드백 제도를 조립하세요.",
        chips: ["수정이 몰려", "중간 공유를", "제안·정착시켜", "부하를 나눴습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "병목→제도→효과.",
      },
      {
        prompt: "온보딩 지원을 조립하세요.",
        chips: ["암묵지가 많아", "체크리스트를", "공유하고", "질문이 줄었습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "조직 학습 비용.",
      },
    ],
  },
  LEADERSHIP: {
    trueFalse: [
      {
        ...COMMON_TF_BASE,
        statement: "리더십은 직책이 있어야만 발휘할 수 있다.",
        isTrue: false,
        explain: "정렬·설득·자립 장치는 직책 없이도 가능합니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "어려운 결정에서는 무엇을 버리고 취했는지가 드러나야 한다.",
        isTrue: true,
        explain: "트레이드오프가 리더십 증거입니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "주니어를 도울 때는 대신 다 해주는 것이 최고의 리더십이다.",
        isTrue: false,
        explain: "자립 장치(체크리스트 등)를 남기는 편이 낫습니다.",
      },
    ],
    matches: [
      {
        prompt: "리더십 장면을 짝지으세요.",
        left: ["정렬", "설득", "코칭"],
        right: ["목표 3개 고정", "리스크 수치 공유", "체크리스트 남김"],
        answerMap: [0, 1, 2],
        explain: "세 가지 리더십 행동.",
      },
      {
        prompt: "결정 과정을 짝지으세요.",
        left: ["옵션", "기준", "공유"],
        right: ["롤백·핫픽스·축소", "복구 시간", "이해관계자 공지"],
        answerMap: [0, 1, 2],
        explain: "위기 결정 루프.",
      },
      {
        prompt: "실패 교정을 짝지으세요.",
        left: ["지연", "규칙", "효과"],
        right: ["결정 미룸", "기한 앞당김", "리드타임 단축"],
        answerMap: [0, 1, 2],
        explain: "실패→제도→수치.",
      },
    ],
    spots: [
      {
        prompt: "리더십이 가장 약한 문장을 고르세요.",
        sentences: [
          "주간 목표를 3개로 재고정했습니다.",
          "분위기를 잘 이끌어 팀이 저를 따르는 편입니다.",
          "결정 기준표로 리드타임을 줄였습니다.",
        ],
        weakIndex: 1,
        explain: "장면·기준 없는 자평입니다.",
      },
      {
        prompt: "결정이 없는 문장을 고르세요.",
        sentences: [
          "기능을 하나 제외하고 일정을 지켰습니다.",
          "정답은 없다고 보고 논의를 이어갔습니다.",
          "축소 데모로 핵심 시나리오를 통과시켰습니다.",
        ],
        weakIndex: 1,
        explain: "결정을 미룬 태도입니다.",
      },
      {
        prompt: "자립이 빠진 도움을 고르세요.",
        sentences: [
          "페어 후 체크리스트를 남겨 다음엔 혼자 닫게 했습니다.",
          "막힐 때마다 제가 대신 다 해결해 줬습니다.",
          "재현 절차를 문서화했습니다.",
        ],
        weakIndex: 1,
        explain: "의존만 키웁니다.",
      },
    ],
    chips: [
      {
        prompt: "정렬 리더십을 조립하세요.",
        chips: ["목표가 흔들려", "주간 3개로", "고정한 뒤", "초점을 회복했습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "흔들림→정렬→효과.",
      },
      {
        prompt: "설득을 조립하세요.",
        chips: ["반발에", "리스크를", "수치로 공유해", "합의를 얻었습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "저항→근거→합의.",
      },
      {
        prompt: "코칭을 조립하세요.",
        chips: ["막힌 동료와", "페어로 풀고", "체크리스트를", "남겼습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "도움→자립.",
      },
    ],
  },
  GROWTH: {
    trueFalse: [
      {
        ...COMMON_TF_BASE,
        statement: "‘평생 학습형’이라고 선언하면 성장 역량이 증명된다.",
        isTrue: false,
        explain: "피드백→행동→측정 장면이 필요합니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "같은 실수가 반복되면 체크리스트 같은 시스템으로 바꾸는 편이 좋다.",
        isTrue: true,
        explain: "실수를 제도로 바꿉니다.",
      },
      {
        ...COMMON_TF_BASE,
        statement: "배움은 노트에만 쌓아 두어도 업무에 자동으로 붙는다.",
        isTrue: false,
        explain: "다음 티켓·산출에 연결해야 전이됩니다.",
      },
    ],
    matches: [
      {
        prompt: "성장 루프를 짝지으세요.",
        left: ["피드백", "변경", "효과"],
        right: ["설명이 길다", "템플릿 적용", "미팅 −15분"],
        answerMap: [0, 1, 2],
        explain: "피드백→도구→수치.",
      },
      {
        prompt: "실패 학습을 짝지으세요.",
        left: ["롤백", "기록", "규칙"],
        right: ["배포 사고", "원인 문서", "카나리 비율"],
        answerMap: [0, 1, 2],
        explain: "실패→문서→재발방지.",
      },
      {
        prompt: "전이를 짝지으세요.",
        left: ["스파이크", "이식", "확장"],
        right: ["새 스택 학습", "작은 기능", "본 스프린트"],
        answerMap: [0, 1, 2],
        explain: "학습→적용→확대.",
      },
    ],
    spots: [
      {
        prompt: "성장 증거가 약한 문장을 고르세요.",
        sentences: [
          "리뷰 피드백을 템플릿에 반영해 미팅을 줄였습니다.",
          "배움을 좋아하는 성격이라 성장에 자신 있습니다.",
          "온보딩 자립 4주→2주로 앞당겼습니다.",
        ],
        weakIndex: 1,
        explain: "성격 선언만 있습니다.",
      },
      {
        prompt: "행동이 없는 문장을 고르세요.",
        sentences: [
          "실수해도 괜찮다고 생각하며 다음을 기다렸습니다.",
          "동종 코멘트가 줄도록 PR 템플릿을 바꿨습니다.",
          "섀도잉 후 안건을 직접 리드했습니다.",
        ],
        weakIndex: 0,
        explain: "위로만 있고 학습 행동이 없습니다.",
      },
      {
        prompt: "전이가 빠진 문장을 고르세요.",
        sentences: [
          "강의를 여러 개 수강했습니다.",
          "배운 내용을 다음 스프린트 티켓에 연결했습니다.",
          "사이드 학습을 본 기능에 이식했습니다.",
        ],
        weakIndex: 0,
        explain: "수강≠전이.",
      },
    ],
    chips: [
      {
        prompt: "피드백 성장을 조립하세요.",
        chips: ["설명이 길다는", "피드백에", "템플릿을 적용해", "미팅을 줄였습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "피드백→변경→효과.",
      },
      {
        prompt: "실패 학습을 조립하세요.",
        chips: ["롤백 후", "원인을 문서로", "남기고", "카나리 규칙을 바꿨습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "실패→기록→규칙.",
      },
      {
        prompt: "전이를 조립하세요.",
        chips: ["새 스택을", "스파이크로 익혀", "작은 기능에", "이식했습니다"],
        answerOrder: [0, 1, 2, 3],
        explain: "학습→이식.",
      },
    ],
  },
};

import type { DuoPack } from "../build-duo-course";

export const LEADERSHIP_PACK: DuoPack = {
  competency: "LEADERSHIP",
  key: "ld",
  blurbKo: "권한 없이도 방향을 맞추고 사람을 움직인 경험을 연습합니다.",
  unit1: { titleKo: "앞에서 끌기", subtitleKo: "리더십 장면을 형식으로 익힙니다" },
  unit2: { titleKo: "한 단계 더", subtitleKo: "영향력·결정·혼합" },
  openers: [
    {
      prompt: "‘리더십을 발휘한 경험’ 좋은 시작은?",
      choices: [
        "공식 권한이 없는 프로젝트에서 주간 목표를 3개로 고정해 팀이 같은 방향을 보게 했습니다.",
        "성격이 리더형입니다.",
        "조장을 많이 했습니다.",
        "카리스마가 있습니다.",
      ],
      answerIndex: 0,
      explain: "상황 + 내가 만든 정렬 장치.",
    },
    {
      prompt: "‘어려운 결정을 내린 경험’",
      choices: [
        "범위를 줄이지 않으면 품질 리스크가 커져, 기능을 하나 빼고 일정을 지켰습니다.",
        "결정을 미뤘습니다.",
        "다수결에만 따랐습니다.",
        "상부에 전부 올렸습니다.",
      ],
      answerIndex: 0,
      explain: "트레이드오프를 명시하고 결정.",
    },
    {
      prompt: "‘팀원을 도와준 경험’",
      choices: [
        "막힌 동료와 페어로 병목을 풀고, 다음에 혼자 할 체크리스트를 남겼습니다.",
        "대신 다 해줬습니다.",
        "격려만 했습니다.",
        "보고하게 했습니다.",
      ],
      answerIndex: 0,
      explain: "단기 도움 + 자립 장치.",
    },
  ],
  judges: [
    {
      prompt: "리더십 답?",
      answerText:
        "목표가 흔들려 주간 3목표로 재고정하고, 반발에는 리스크 수치로 설득해 일정을 지켰습니다.",
      isGood: true,
      explain: "방향·설득·결과.",
    },
    {
      prompt: "어떤가요?",
      answerText: "사람들이 저를 잘 따릅니다.",
      isGood: false,
      explain: "자평만 있고 장면이 없습니다.",
    },
    {
      prompt: "괜찮나요?",
      answerText:
        "의사결정이 늦어져 결정 기준표를 만들어 30분 안에 고르도록 바꿨습니다.",
      isGood: true,
      explain: "병목→리더십 개입→속도.",
    },
  ],
  blanks: [
    {
      prompt: "잇기.",
      template: "방향이 흩어져 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["주간 목표를 3개로 제한", "모든 요청 수용", "방임", "비난"],
          answerIndex: 0,
        },
        {
          options: ["스프린트 초점 회복", "더 큰 산만", "이탈", "일정 붕괴"],
          answerIndex: 0,
        },
      ],
      explain: "정렬이 리더십의 기본 산출입니다.",
    },
    {
      prompt: "채우기.",
      template: "반발이 있어 ___했고, 그 결과 ___했습니다.",
      blanks: [
        {
          options: ["리스크와 대안을 수치로 공유", "강압", "회피", "감정 대립"],
          answerIndex: 0,
        },
        {
          options: ["합의 후 실행", "교착", "팀 분열", "결정 공백"],
          answerIndex: 0,
        },
      ],
      explain: "설득 재료를 공개합니다.",
    },
    {
      prompt: "연결.",
      template: "주니어가 막혀 ___했고, 결국 ___했습니다.",
      blanks: [
        {
          options: ["페어 후 체크리스트를 남김", "대신 전부 수행", "방치", "질책만"],
          answerIndex: 0,
        },
        {
          options: ["다음엔 혼자 처리", "의존 고착", "사기 저하", "지연 상시화"],
          answerIndex: 0,
        },
      ],
      explain: "리더십은 자립을 남깁니다.",
    },
  ],
  stories: [
    {
      prompt: "영향력 스토리.",
      cards: [
        "권한이 없는 크로스팀 일정이 충돌했다",
        "공통 목표 3개를 제안했다",
        "리스크 표로 반발을 설득했다",
        "단일 마일스톤으로 출시했다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "상황→정렬→설득→결과.",
    },
    {
      prompt: "결정 스토리.",
      cards: [
        "일정이 이틀 밀릴 위기였다",
        "기능 우선순위를 다시 매겼다",
        "하나를 과감히 제외했다",
        "약속일을 지켰다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "위기→기준→결정→결과.",
    },
    {
      prompt: "코칭 스토리.",
      cards: [
        "주니어가 같은 버에서 반복해서 막혔다",
        "함께 재현 절차를 정리했다",
        "체크리스트를 문서화했다",
        "이후 동종 이슈를 혼자 닫았다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "관찰→함께→자립 장치→성과.",
    },
  ],
  scripts: [
    {
      prompt: "따라.",
      script:
        "권한 없는 일정 충돌에서 목표 3개로 맞추고 리스크 수치로 설득해 출시 약속을 지켰습니다.",
      tip: "정렬·설득·결과.",
    },
    {
      prompt: "호흡.",
      script:
        "밀릴 위기에서 우선순위를 다시 매겨 기능을 하나 제외하고 일정을 지켰습니다.",
      tip: "결정의 대가를 말하세요.",
    },
    {
      prompt: "마지막.",
      script:
        "막힌 동료와 페어로 풀고 체크리스트를 남겨 다음엔 혼자 닫게 했습니다.",
      tip: "도움→자립.",
    },
  ],
  traps: [
    {
      prompt: "‘리더십 ≠ 직책’을 물었습니다.",
      choices: [
        "직책 없이도 주간 목표를 고정해 팀이 같은 지표를 보게 만든 경험이 있습니다.",
        "나중에 매니저가 되고 싶습니다.",
        "리더 경험이 많습니다.",
        "조장을 했습니다.",
      ],
      answerIndex: 0,
      explain: "직책 없는 영향력 장면.",
    },
    {
      prompt: "실패 리더십.",
      choices: [
        "결정을 미뤄 일정이 무너졌고, 이후 결정 기한을 의식적으로 앞당기는 규칙을 만들었습니다.",
        "팀원 탓이었습니다.",
        "외부 탓이었습니다.",
        "운이 없었습니다.",
      ],
      answerIndex: 0,
      skillRule: "ownership",
      explain: "내 실패 + 제도적 교정.",
    },
    {
      prompt: "수치.",
      choices: [
        "결정 리드타임이 평균 3일에서 반나절로 줄었습니다.",
        "리더십이 좋아졌습니다.",
        "팀이 단단해졌습니다.",
        "분위기가 좋아졌습니다.",
      ],
      answerIndex: 0,
      skillRule: "quantify",
      explain: "리더십도 리드타임으로.",
    },
  ],
  challengeOrders: [
    {
      prompt: "크로스팀 리드 5장면.",
      cards: [
        "세 팀 일정이 엇갈렸다",
        "공통 성공 정의를 제안했다",
        "반발하는 팀에 리스크를 공유했다",
        "범위 축소를 합의했다",
        "단일 출시일을 지켰다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "충돌→정의→설득→합의→결과.",
    },
    {
      prompt: "위기 결정.",
      cards: [
        "데모 전날 치명 버그가 났다",
        "롤백·핫픽스·축소 데모를 비교했다",
        "축소 데모로 결정했다",
        "이해관계자에게 즉시 공유했다",
        "약속한 핵심 시나리오만 통과시켰다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "위기→옵션→결정→커뮤니케이션→결과.",
    },
  ],
  challengeBlank: {
    prompt: "고르세요.",
    template: "팀이 지쳐 보여 ___했고, 결국 ___했습니다.",
    blanks: [
      {
        options: [
          "범위를 줄이고 회복 버퍼를 명시",
          "동기부여 연설만",
          "야근 강요",
          "무관심",
        ],
        answerIndex: 0,
      },
      {
        options: [
          "번아웃 없이 핵심 일정을 지킴",
          "이탈 증가",
          "품질 사고",
          "일정만 붕괴",
        ],
        answerIndex: 0,
      },
    ],
    explain: "사람 상태를 일정 설계에 반영합니다.",
  },
  boss: [
    {
      id: "ld-boss-1",
      gameType: "choice",
      skillRule: "question_intent",
      prompt: "‘사람들을 어떻게 움직였나요?’",
      choices: [
        "공통 지표를 먼저 합의한 뒤, 제 안이 그 지표에 가깝다는 근거로 동의를 얻었습니다.",
        "카리스마로 이끌었습니다.",
        "친하게 지냈습니다.",
        "명령을 잘합니다.",
      ],
      answerIndex: 0,
      explain: "공통 기준 + 근거.",
    },
    {
      id: "ld-boss-2",
      gameType: "swipe_judge",
      skillRule: "good_vs_bad",
      prompt: "판정.",
      answerText: "리더로서 항상 옳은 결정을 내립니다.",
      isGood: false,
      explain: "장면·근거·결과가 없습니다.",
    },
    {
      id: "ld-boss-3",
      gameType: "order",
      skillRule: "star_order",
      prompt: "순서.",
      cards: [
        "목표가 흔들렸다",
        "주간 3목표로 재고정했다",
        "반발을 수치로 설득했다",
        "스프린트 초점이 돌아왔다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "흔들림→정렬→설득→효과.",
    },
    {
      id: "ld-boss-4",
      gameType: "fill_blank",
      skillRule: "cause_result",
      prompt: "빈칸.",
      template: "결정이 늦어 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["기준표를 만들어 기한을 못 박음", "논의를 끝없이 연장", "독단", "회피"],
          answerIndex: 0,
        },
        {
          options: ["리드타임 단축", "기회 상실", "팀 분열", "신뢰 하락"],
          answerIndex: 0,
        },
      ],
      explain: "결정 시스템을 남깁니다.",
    },
    {
      id: "ld-boss-5",
      gameType: "speak_along",
      skillRule: "speak_compress",
      prompt: "보스.",
      script:
        "권한이 없는 충돌에서 목표 3개로 맞추고 리스크 수치로 설득해 출시 약속을 지켰으며, 막힌 동료에겐 체크리스트를 남겨 자립시켰습니다.",
      tip: "정렬·설득·자립을 한 호흡에.",
    },
  ],
};

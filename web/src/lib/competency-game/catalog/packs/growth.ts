import type { DuoPack } from "../build-duo-course";

export const GROWTH_PACK: DuoPack = {
  competency: "GROWTH",
  key: "gr",
  blurbKo: "피드백을 받아 고치고, 빠르게 배우는 답을 연습합니다.",
  unit1: { titleKo: "배우는 속도", subtitleKo: "성장·학습 장면을 형식으로 익힙니다" },
  unit2: { titleKo: "한 단계 더", subtitleKo: "피드백·전이·혼합" },
  openers: [
    {
      prompt: "‘최근에 배운 것’ 좋은 시작은?",
      choices: [
        "배포 롤백을 두 번 겪으며 카나리 비율을 문서화해, 다음 배포부터 사고를 막았습니다.",
        "책을 많이 읽습니다.",
        "강의를 듣습니다.",
        "성장에 관심이 많습니다.",
      ],
      answerIndex: 0,
      explain: "학습 → 행동 변화 → 재발 방지.",
    },
    {
      prompt: "‘피드백을 받은 경험’",
      choices: [
        "설명이 길다는 피드백을 받아 결론-근거-숫자 순 템플릿으로 바꿨고, 미팅 시간이 줄었습니다.",
        "상처받았지만 극복했습니다.",
        "그 피드백은 틀렸습니다.",
        "특별히 없습니다.",
      ],
      answerIndex: 0,
      explain: "피드백→구체 변경→효과.",
    },
    {
      prompt: "‘모르는 걸 어떻게 배우나요?’",
      choices: [
        "최소 동작 예제를 먼저 돌리고, 막히면 질문 리스트로 30분 안에 확인합니다.",
        "끝까지 혼자 합니다.",
        "물어보는 걸 좋아합니다.",
        "시간이 되면 배웁니다.",
      ],
      answerIndex: 0,
      explain: "학습 루프가 보이면 설득력 있습니다.",
    },
  ],
  judges: [
    {
      prompt: "성장 답?",
      answerText:
        "코드리뷰에서 ‘테스트 부족’ 피드백을 받아 체크리스트를 추가했고, 동종 버그가 줄었습니다.",
      isGood: true,
      explain: "피드백→제도→결과.",
    },
    {
      prompt: "어떤가요?",
      answerText: "저는 평생 학습형 인간입니다.",
      isGood: false,
      explain: "선언만 있고 장면이 없습니다.",
    },
    {
      prompt: "괜찮나요?",
      answerText:
        "새 스택을 2주 파일럿으로 배워 프로토타입을 올렸고, 본 프로젝트에 전이했습니다.",
      isGood: true,
      explain: "짧은 학습→산출→전이.",
    },
  ],
  blanks: [
    {
      prompt: "잇기.",
      template: "같은 실수를 반복해 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["사후 체크리스트를 만들어 배포 전 확인", "반성문만", "무시", "남 탓"],
          answerIndex: 0,
        },
        {
          options: ["동일 유형 사고 감소", "실수 반복", "신뢰 하락", "학습 정체"],
          answerIndex: 0,
        },
      ],
      explain: "실수를 시스템으로 바꿉니다.",
    },
    {
      prompt: "채우기.",
      template: "피드백이 모호해 ___했고, 그 결과 ___했습니다.",
      blanks: [
        {
          options: ["구체 예시를 요청해 행동 단위로 바꿈", "감정적으로만 수용", "거부", "무시"],
          answerIndex: 0,
        },
        {
          options: ["다음 산출물에 바로 반영", "모호한 채 종료", "관계만 악화", "성장 정체"],
          answerIndex: 0,
        },
      ],
      explain: "피드백을 실행 가능하게 만듭니다.",
    },
    {
      prompt: "연결.",
      template: "새 도구가 생소해 ___했고, 결국 ___했습니다.",
      blanks: [
        {
          options: ["작은 스파이크로 위험만 검증", "바로 전면 도입", "학습 포기", "남에게 전가"],
          answerIndex: 0,
        },
        {
          options: ["본 적용 여부를 데이터로 결정", "사고로 이어짐", "비용만 증가", "기회 상실"],
          answerIndex: 0,
        },
      ],
      explain: "안전한 학습 실험.",
    },
  ],
  stories: [
    {
      prompt: "피드백 성장 순서.",
      cards: [
        "리뷰에서 설명이 길다는 지적을 받았다",
        "결론-근거-숫자 템플릿을 만들었다",
        "다음 발표에 적용했다",
        "미팅이 15분 짧아졌다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "피드백→도구→적용→효과.",
    },
    {
      prompt: "실패 학습.",
      cards: [
        "배포 후 롤백을 했다",
        "원인을 문서로 남겼다",
        "카나리 비율을 조정했다",
        "다음 배포에서 동종 이슈가 없었다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "실패→기록→규칙→검증.",
    },
    {
      prompt: "전이 학습.",
      cards: [
        "사이드에서 새 스택을 익혔다",
        "작은 기능을 이식했다",
        "리뷰를 받으며 기준을 맞췄다",
        "본 스프린트 작업으로 확장했다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "학습→이식→교정→확장.",
    },
  ],
  scripts: [
    {
      prompt: "따라.",
      script:
        "설명이 길다는 피드백에 템플릿을 만들어 적용했고 미팅을 15분 줄였습니다.",
      tip: "피드백→변경→수치.",
    },
    {
      prompt: "호흡.",
      script:
        "롤백 후 원인을 문서로 남기고 카나리 비율을 바꿔 다음 배포 사고를 막았습니다.",
      tip: "실패를 규칙으로.",
    },
    {
      prompt: "마지막.",
      script:
        "새 스택을 스파이크로 익혀 작은 기능에 이식한 뒤 본 스프린트로 확장했습니다.",
      tip: "학습→전이.",
    },
  ],
  traps: [
    {
      prompt: "‘강점과 약점’",
      choices: [
        "약점은 초기 과몰입인데, 지금은 성공 기준을 먼저 적고 시작합니다.",
        "약점이 없습니다.",
        "완벽주의가 장점이자 단점입니다.",
        "잘 모르겠습니다.",
      ],
      answerIndex: 0,
      explain: "약점 + 교정 행동.",
      skillRule: "ownership",
    },
    {
      prompt: "‘5년 후’",
      choices: [
        "지금은 실험 설계를 깊게 파고, 3년 안에 팀의 학습 속도를 지표로 설계하는 쪽이 목표입니다.",
        "성공한 사람이 되고 싶습니다.",
        "임원이 되고 싶습니다.",
        "행복한 사람이 되고 싶습니다.",
      ],
      answerIndex: 0,
      explain: "현재 학습축 → 확장 방향.",
    },
    {
      prompt: "숫자로 성장.",
      choices: [
        "온보딩 자립까지 4주→2주, 리뷰 반영 주기 3일→1일로 줄었습니다.",
        "많이 성장했습니다.",
        "배움이 즐거웠습니다.",
        "성실히 임했습니다.",
      ],
      answerIndex: 0,
      skillRule: "quantify",
      explain: "성장도 Before→After.",
    },
  ],
  challengeOrders: [
    {
      prompt: "학습 루프 5장면.",
      cards: [
        "생소한 도메인 미팅에서 막혔다",
        "용어집과 질문 리스트를 만들었다",
        "주 2회 섀도잉을 요청했다",
        "작은 안건을 맡아 발표했다",
        "2주 뒤 스스로 리드했다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "막힘→도구→노출→연습→자립.",
    },
    {
      prompt: "피드백 제도화.",
      cards: [
        "같은 리뷰 코멘트가 반복됐다",
        "팀 체크리스트에 항목을 추가했다",
        "PR 템플릿에 반영했다",
        "2스프린트 관찰했다",
        "동종 코멘트 빈도가 줄었다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "패턴→제도→측정→효과.",
    },
  ],
  challengeBlank: {
    prompt: "고르세요.",
    template: "배움이 업무에 안 붙어 ___했고, 결국 ___했습니다.",
    blanks: [
      {
        options: [
          "배운 내용을 다음 스프린트 티켓에 바로 연결",
          "노트만 쌓음",
          "강의만 수강",
          "관심만 유지",
        ],
        answerIndex: 0,
      },
      {
        options: [
          "학습이 산출물로 전이",
          "지식만 잔뜩",
          "시간만 소모",
          "성장 착시",
        ],
        answerIndex: 0,
      },
    ],
    explain: "학습을 티켓·산출에 붙입니다.",
  },
  boss: [
    {
      id: "gr-boss-1",
      gameType: "choice",
      skillRule: "question_intent",
      prompt: "‘어떻게 성장하나요?’",
      choices: [
        "피드백을 행동 단위로 바꿔 다음 산출물에 바로 넣고, 수치로 효과가 있는지 봅니다.",
        "긍정적으로 생각합니다.",
        "책을 읽습니다.",
        "경험을 쌓습니다.",
      ],
      answerIndex: 0,
      explain: "루프: 피드백→행동→측정.",
    },
    {
      id: "gr-boss-2",
      gameType: "swipe_judge",
      skillRule: "good_vs_bad",
      prompt: "판정.",
      answerText: "실패해도 괜찮다고 스스로를 다독입니다.",
      isGood: false,
      explain: "위로는 있으나 학습 행동이 없습니다.",
    },
    {
      id: "gr-boss-3",
      gameType: "order",
      skillRule: "star_order",
      prompt: "순서.",
      cards: [
        "리뷰 지적을 받았다",
        "템플릿을 바꿨다",
        "다음 발표에 적용했다",
        "미팅이 짧아졌다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "피드백→변경→적용→효과.",
    },
    {
      id: "gr-boss-4",
      gameType: "fill_blank",
      skillRule: "cause_result",
      prompt: "빈칸.",
      template: "같은 버그가 반복돼 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["배포 전 체크리스트에 항목 추가", "기억에만 의존", "무시", "남 탓"],
          answerIndex: 0,
        },
        {
          options: ["동종 버그 감소", "반복 사고", "신뢰 하락", "학습 정체"],
          answerIndex: 0,
        },
      ],
      explain: "반복을 시스템으로.",
    },
    {
      id: "gr-boss-5",
      gameType: "speak_along",
      skillRule: "speak_compress",
      prompt: "보스.",
      script:
        "설명이 길다는 피드백에 템플릿을 적용해 미팅을 줄였고, 롤백 학습은 카나리 규칙으로 남겨 다음 사고를 막았습니다.",
      tip: "피드백 성장 + 실패 학습을 한 호흡에.",
    },
  ],
};

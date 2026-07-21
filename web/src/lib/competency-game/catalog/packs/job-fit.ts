import type { DuoPack } from "../build-duo-course";

export const JOB_FIT_PACK: DuoPack = {
  competency: "JOB_FIT",
  key: "jf",
  blurbKo: "직무에서 무엇을 했고, 왜 그 선택이 맞았는지 짧게 말합니다.",
  unit1: { titleKo: "이 역할에서", subtitleKo: "직무 증거를 형식으로 익힙니다" },
  unit2: { titleKo: "한 단계 더", subtitleKo: "함정·혼합 라운드" },
  openers: [
    {
      prompt: "‘이 직무에 왜 맞나요?’ 가장 강한 시작은?",
      choices: [
        "지난 2년 캠페인 성과를 SQL로 직접 뽑아 주간 의사결정에 붙인 경험이 이 역할과 맞습니다.",
        "사람이 좋아서요.",
        "스펙이 비슷합니다.",
        "성장하고 싶습니다.",
      ],
      answerIndex: 0,
      explain: "직무 과업과 내 증거(도구·성과)를 바로 연결합니다.",
    },
    {
      prompt: "‘핵심 기여’를 물었습니다.",
      choices: [
        "신규 유입 실험을 설계·실행해 CAC를 18% 낮췄습니다.",
        "팀에 잘 어울렸습니다.",
        "야근을 많이 했습니다.",
        "다양한 일을 했습니다.",
      ],
      answerIndex: 0,
      explain: "역할 기여는 과업+수치로.",
      skillRule: "quantify",
    },
    {
      prompt: "‘부족한 경험’을 물었을 때?",
      choices: [
        "대규모 브랜드는 없지만, 유사 퍼널에서 주 3실험 속도로 학습한 방법으로 갭을 메우겠습니다.",
        "부족하지 않습니다.",
        "입사 후 배우면 됩니다.",
        "잘 모르겠습니다.",
      ],
      answerIndex: 0,
      explain: "갭 인정 + 전이 가능한 방법.",
    },
  ],
  judges: [
    {
      prompt: "직무적합 답으로 괜찮나요?",
      answerText:
        "이 포지션의 주 과업인 ‘실험 설계’를 지난 분기 12회 실행해 전환 1.4%p를 올렸습니다.",
      isGood: true,
      explain: "과업 매칭 + 빈도 + 결과.",
    },
    {
      prompt: "어떤가요?",
      answerText: "귀사 비전과 제 가치관이 같아서 지원했습니다.",
      isGood: false,
      explain: "비전만으로는 직무 증거가 아닙니다.",
    },
    {
      prompt: "괜찮은가요?",
      answerText:
        "요구 스택 중 두 도구는 현업에서 썼고, 나머지 하나는 사이드 프로젝트로 파이프라인을 돌려 봤습니다.",
      isGood: true,
      explain: "요구 대비 증거와 보완 계획이 분명합니다.",
    },
  ],
  blanks: [
    {
      prompt: "빈칸을 채우세요.",
      template: "직무 요구가 실험 속도였기 때문에 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["주간 실험 보드를 만들어 병목을 제거", "회의만 늘림", "도구를 바꿈", "인력만 요청"],
          answerIndex: 0,
        },
        {
          options: ["실험 주기 단축", "속도 정체", "비용만 증가", "품질 붕괴"],
          answerIndex: 0,
        },
      ],
      explain: "요구→직무 행동→성과.",
    },
    {
      prompt: "이어 주세요.",
      template: "데이터가 분산돼 있어 ___했고, 그 결과 ___했습니다.",
      blanks: [
        {
          options: ["공통 지표 정의를 문서화", "감으로 보고", "분석 중단", "외주만 맡김"],
          answerIndex: 0,
        },
        {
          options: ["의사결정 시간이 줄었음", "혼선 증가", "지표 난립", "보고 지연"],
          answerIndex: 0,
        },
      ],
      explain: "직무 맥락의 인프라성 행동도 기여입니다.",
    },
    {
      prompt: "맞추세요.",
      template: "신규 채널 지식이 부족해 ___했고, 결국 ___했습니다.",
      blanks: [
        {
          options: ["2주 파일럿으로 학습 루프를 만듦", "지원을 철회", "이론만 공부", "다른 업무로 회피"],
          answerIndex: 0,
        },
        {
          options: ["채널 CAC를 측정 가능하게 만듦", "배움 없이 종료", "비용만 소모", "책임 전가"],
          answerIndex: 0,
        },
      ],
      explain: "갭을 실험으로 메우는 게 직무적합 스토리입니다.",
    },
  ],
  stories: [
    {
      prompt: "직무 성과 이야기 순서.",
      cards: [
        "CAC가 목표 대비 높았다",
        "유입 실험을 주 3회로 설계했다",
        "승자 안만 예산에 반영했다",
        "CAC가 18% 낮아졌다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "목표 갭→직무 행동→선택→수치.",
    },
    {
      prompt: "도구·스킬 증명 순서.",
      cards: [
        "리포트가 수작업이라 늦었다",
        "SQL 템플릿을 만들어 자동화했다",
        "주간 리뷰에 붙였다",
        "준비 시간이 반으로 줄었다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "痛점→스킬 적용→정착→효과.",
    },
    {
      prompt: "도메인 학습 순서.",
      cards: [
        "산업 용어를 몰라 미팅이 막혔다",
        "용어집과 질문 리스트를 만들었다",
        "주 2회 섀도잉을 요청했다",
        "2주 뒤 스스로 안건을 리드했다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "갭→학습 설계→실행→자립.",
    },
  ],
  scripts: [
    {
      prompt: "따라 말하세요.",
      script:
        "이 역할의 실험 설계 과업에 맞춰 분기 12회 실험을 돌렸고 CAC를 18% 낮췄습니다.",
      tip: "과업 이름과 숫자를 또렷이.",
    },
    {
      prompt: "한 호흡.",
      script:
        "수작업 리포트를 SQL로 자동화해 주간 리뷰에 붙였고 준비 시간을 절반으로 줄였습니다.",
      tip: "도구→정착→효과.",
    },
    {
      prompt: "마지막.",
      script:
        "도메인 갭은 용어집과 섀도잉으로 메웠고 2주 만에 안건을 직접 리드했습니다.",
      tip: "갭→방법→자립.",
    },
  ],
  traps: [
    {
      prompt: "‘왜 우리 회사?’와 직무를 같이 물었습니다.",
      choices: [
        "귀사 데이터 제품의 실험 문화가, 제가 CAC를 숫자로 개선해 온 방식과 맞습니다.",
        "복지가 좋아서요.",
        "브랜드가 유명해서요.",
        "집이 가까워서요.",
      ],
      answerIndex: 0,
      explain: "회사 맥락 × 내 직무 증거.",
    },
    {
      prompt: "‘가장 자신 있는 스킬’",
      choices: [
        "실험 설계입니다. 가설·샘플·성공지표를 한 장에 고정하는 템플릿을 씁니다.",
        "성실함입니다.",
        "소통입니다.",
        "열정입니다.",
      ],
      answerIndex: 0,
      explain: "스킬명 + 일하는 방식의 증거.",
    },
    {
      prompt: "수치화하세요.",
      choices: [
        "리포트 준비 4시간→2시간, 실험 주기 2주→1주가 됐습니다.",
        "많이 개선됐습니다.",
        "꽤 빨라졌습니다.",
        "만족스러웠습니다.",
      ],
      answerIndex: 0,
      skillRule: "quantify",
      explain: "Before→After.",
    },
  ],
  challengeOrders: [
    {
      prompt: "직무 임팩트 5장면.",
      cards: [
        "신규 채널 CAC가 목표의 1.6배였다",
        "채널별 가설을 표로 정리했다",
        "예산 20%만 파일럿에 배정했다",
        "2주 데이터로 채널을 컷/스케일했다",
        "전체 CAC가 목표 안으로 들어왔다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "갭→설계→제한 실행→판정→결과.",
    },
    {
      prompt: "협업 속 직무 기여.",
      cards: [
        "디자인·개발 우선순위가 충돌했다",
        "공통 성공지표를 제안했다",
        "주간 실험 보드로 합의했다",
        "스프린트에 실험 슬롯을 고정했다",
        "출시 일정을 지키며 학습 속도를 유지했다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "충돌→지표→합의→제도화→성과.",
    },
  ],
  challengeBlank: {
    prompt: "정확히 고르세요.",
    template: "요구 스택에 빈칸이 있어 ___했고, 결국 ___했습니다.",
    blanks: [
      {
        options: [
          "사이드 프로젝트로 동일 파이프라인을 재현",
          "모른다고만 답함",
          "다른 지원자에게 미룸",
          "스택을 무시함",
        ],
        answerIndex: 0,
      },
      {
        options: [
          "면접에서 동작 데모를 보여 줌",
          "신뢰 하락",
          "기회 상실",
          "모호한 인상만 남김",
        ],
        answerIndex: 0,
      },
    ],
    explain: "갭을 데모 가능한 학습으로 메웁니다.",
  },
  boss: [
    {
      id: "jf-boss-1",
      gameType: "choice",
      skillRule: "question_intent",
      prompt: "‘이 포지션에서 90일 계획’",
      choices: [
        "90일 안에는 실험 보드를 정착시키고 CAC 가시성을 주간 리뷰에 붙이는 게 목표입니다.",
        "열심히 배우겠습니다.",
        "분위기를 파악하겠습니다.",
        "시니어를 따르겠습니다.",
      ],
      answerIndex: 0,
      explain: "직무 산출물 중심 90일.",
    },
    {
      id: "jf-boss-2",
      gameType: "swipe_judge",
      skillRule: "good_vs_bad",
      prompt: "괜찮은가요?",
      answerText: "저는 멀티플레이어라 뭐든 잘합니다.",
      isGood: false,
      explain: "직무 초점이 없습니다.",
    },
    {
      id: "jf-boss-3",
      gameType: "order",
      skillRule: "star_order",
      prompt: "순서.",
      cards: [
        "리포트가 늦어 의사결정이 밀렸다",
        "SQL 자동화를 제안·구현했다",
        "주간 리뷰에 붙였다",
        "준비 시간이 절반이 됐다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "痛→실행→정착→수치.",
    },
    {
      id: "jf-boss-4",
      gameType: "fill_blank",
      skillRule: "cause_result",
      prompt: "빈칸.",
      template: "채널 지식이 부족해 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["2주 파일럿으로 CAC를 측정", "추측으로 예산 집행", "학습 포기", "채널 전면 중단"],
          answerIndex: 0,
        },
        {
          options: ["스케일 여부를 데이터로 결정", "예산만 소진", "혼란", "책임 공방"],
          answerIndex: 0,
        },
      ],
      explain: "학습을 의사결정에 연결.",
    },
    {
      id: "jf-boss-5",
      gameType: "speak_along",
      skillRule: "speak_compress",
      prompt: "보스 말하기.",
      script:
        "실험 설계가 핵심인 역할에 맞춰 분기 12회 실험을 돌렸고 CAC를 18% 낮추며 주간 리뷰에 지표를 정착시켰습니다.",
      tip: "역할 과업→행동→수치.",
    },
  ],
};

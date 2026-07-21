import type { DuoPack } from "../build-duo-course";

export const ORG_FIT_PACK: DuoPack = {
  competency: "ORG_FIT",
  key: "of",
  blurbKo: "조직에서 맞추고, 설득하고, 관계를 남기는 답을 연습합니다.",
  unit1: { titleKo: "같이 일하는 법", subtitleKo: "조직 맥락의 답을 형식으로 익힙니다" },
  unit2: { titleKo: "한 단계 더", subtitleKo: "이해관계·충돌이 섞입니다" },
  openers: [
    {
      prompt: "‘팀과 의견이 다를 때’ 좋은 시작은?",
      choices: [
        "목표 지표를 먼저 합의한 뒤, 제 안이 그 지표에 더 가깝다는 근거를 공유했습니다.",
        "제가 맞아 끝까지 주장했습니다.",
        "그냥 따랐습니다.",
        "갈등을 피했습니다.",
      ],
      answerIndex: 0,
      explain: "공통 기준(지표)으로 정렬합니다.",
    },
    {
      prompt: "‘조직 문화에 맞춘 행동’",
      choices: [
        "투명성 문화에 맞춰 주간 리스크를 문서에 먼저 올렸습니다.",
        "눈치를 많이 봤습니다.",
        "조용히 일했습니다.",
        "회식에 빠지지 않았습니다.",
      ],
      answerIndex: 0,
      explain: "문화 키워드 → 구체 행동.",
    },
    {
      prompt: "‘이해관계자 관리’",
      choices: [
        "영업·개발 일정이 어긋나 공통 마일스톤 표를 만들어 합의를 다시 봤습니다.",
        "각자의 일을 존중했습니다.",
        "상부에 보고만 했습니다.",
        "시간이 해결해 주길 기다렸습니다.",
      ],
      answerIndex: 0,
      explain: "이해관계 충돌을 가시화·재합의.",
    },
  ],
  judges: [
    {
      prompt: "조직적합 답으로?",
      answerText:
        "우선순위 충돌 때 공유 보드로 기준을 맞추고, 합의된 순서로 스프린트를 재정렬했습니다.",
      isGood: true,
      explain: "정렬 도구 + 실행 변경.",
    },
    {
      prompt: "어떤가요?",
      answerText: "저는 어디든 잘 적응하는 성격입니다.",
      isGood: false,
      explain: "성격 선언만 있고 행동이 없습니다.",
    },
    {
      prompt: "괜찮나요?",
      answerText:
        "피드백이 빠른 문화라 초안을 일찍 공유해 수정 사이클을 앞당겼습니다.",
      isGood: true,
      explain: "문화 읽기 + 맞춤 행동.",
    },
  ],
  blanks: [
    {
      prompt: "잇기.",
      template: "목표가 달라 보여 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["공통 성공 정의를 한 장으로 합의", "각자 진행", "갈등 회피", "상부만 설득"],
          answerIndex: 0,
        },
        {
          options: ["스프린트 충돌 감소", "일정 붕괴", "신뢰 하락", "침묵만 남음"],
          answerIndex: 0,
        },
      ],
      explain: "공통 정의가 조직 정렬의 시작입니다.",
    },
    {
      prompt: "채우기.",
      template: "정보가 닫혀 있어 ___했고, 그 결과 ___했습니다.",
      blanks: [
        {
          options: ["리스크를 공개 채널에 먼저 공유", "뒷말로만 불만을 말함", "정보를 독점", "무반응"],
          answerIndex: 0,
        },
        {
          options: ["관련 팀이 일찍 대응", "갑작스러운 장애", "책임 공방", "일정 은폐"],
          answerIndex: 0,
        },
      ],
      explain: "투명 공유가 조직 신뢰를 만듭니다.",
    },
    {
      prompt: "연결.",
      template: "피드백이 늦어 ___했고, 결국 ___했습니다.",
      blanks: [
        {
          options: ["리뷰 슬롯을 캘린더에 고정", "기다림만", "독단 배포", "작업 중단"],
          answerIndex: 0,
        },
        {
          options: ["수정 사이클이 앞당겨짐", "품질 사고", "관계 악화", "무기한 지연"],
          answerIndex: 0,
        },
      ],
      explain: "문화 병목을 제도로 푸는 이야기.",
    },
  ],
  stories: [
    {
      prompt: "정렬 스토리.",
      cards: [
        "마케팅과 개발 일정이 이틀 어긋났다",
        "공통 마일스톤 표를 만들었다",
        "범위 축소를 함께 골랐다",
        "약속일을 지켰다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "충돌→가시화→합의→결과.",
    },
    {
      prompt: "피드백 문화 적응.",
      cards: [
        "초안을 늦게 공유해 수정이 몰렸다",
        "중간 공유 규칙을 제안했다",
        "팀 합의를 받았다",
        "리뷰가 분산되어 막판 부하가 줄었다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "문제→제안→합의→효과.",
    },
    {
      prompt: "온보딩 조직 적응.",
      cards: [
        "암묵지가 많아 질문이 폭주했다",
        "체크리스트를 만들어 공유했다",
        "시니어와 페어 시간을 잡았다",
        "질문 밀도가 줄고 자립이 빨라졌다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "조직 학습 비용 줄이기.",
    },
  ],
  scripts: [
    {
      prompt: "따라.",
      script:
        "일정이 어긋나 공통 마일스톤 표로 합의하고 범위를 줄여 약속일을 지켰습니다.",
      tip: "정렬→합의→결과.",
    },
    {
      prompt: "호흡.",
      script:
        "피드백이 몰려 중간 공유 규칙을 제안·정착시켰고 막판 수정 부하가 줄었습니다.",
      tip: "문화 병목→제도.",
    },
    {
      prompt: "마지막.",
      script:
        "암묵지를 체크리스트와 페어로 풀어 온보딩 질문을 줄이고 자립을 앞당겼습니다.",
      tip: "조직 학습 비용.",
    },
  ],
  traps: [
    {
      prompt: "‘갈등’ — 함정 보기 주의.",
      choices: [
        "감정 대립으로 보지 않고 목표 불일치로 재정의한 뒤 지표로 재합의했습니다.",
        "상대를 설득해 이겼습니다.",
        "갈등이 없어 좋습니다.",
        "인사팀에 넘겼습니다.",
      ],
      answerIndex: 0,
      explain: "재정의 + 공동 기준.",
    },
    {
      prompt: "‘동료 평가가 나빴던 경험’",
      choices: [
        "공유가 늦다는 피드백을 받아 업데이트 주기를 고정했고, 다음 분기 코멘트가 바뀌었습니다.",
        "오해라고 생각합니다.",
        "그 동료가 까다로웠습니다.",
        "기억나지 않습니다.",
      ],
      answerIndex: 0,
      skillRule: "ownership",
      explain: "피드백→행동 변경→증거.",
    },
    {
      prompt: "숫자로.",
      choices: [
        "리뷰 대기 시간이 평균 4일에서 1.5일로 줄었습니다.",
        "소통이 좋아졌습니다.",
        "분위기가 괜찮아졌습니다.",
        "협업이 원활해졌습니다.",
      ],
      answerIndex: 0,
      skillRule: "quantify",
      explain: "협업도 수치화 가능합니다.",
    },
  ],
  challengeOrders: [
    {
      prompt: "크로스팀 합의 5장면.",
      cards: [
        "출시일이 팀마다 달랐다",
        "리스크를 표로 공개했다",
        "공통 정의를 다시 썼다",
        "범위 축소를 합의했다",
        "단일 마일스톤으로 출시했다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "충돌→공개→재정의→합의→실행.",
    },
    {
      prompt: "신뢰 회복.",
      cards: [
        "공유 누락으로 현업이 놀랐다",
        "사과와 함께 재발 방지 체크를 제안했다",
        "알림 규칙을 합의했다",
        "2주간 누락 제로를 지켰다",
        "다음 협업 요청이 다시 늘었다",
      ],
      answerOrder: [0, 1, 2, 3, 4],
      explain: "사고→책임→규칙→이행→관계.",
    },
  ],
  challengeBlank: {
    prompt: "고르세요.",
    template: "부서 목표가 충돌해 ___했고, 결국 ___했습니다.",
    blanks: [
      {
        options: [
          "회사 분기 OKR 기준으로 우선순위를 재정렬",
          "우리 팀 이익만 관철",
          "결정을 무기한 보류",
          "비공식 로비만",
        ],
        answerIndex: 0,
      },
      {
        options: [
          "상위 목표에 맞는 단일 계획으로 수렴",
          "갈등 고착",
          "일정 파탄",
          "신뢰 붕괴",
        ],
        answerIndex: 0,
      },
    ],
    explain: "상위 기준으로 정렬합니다.",
  },
  boss: [
    {
      id: "of-boss-1",
      gameType: "choice",
      skillRule: "question_intent",
      prompt: "‘우리 팀에 어떻게 기여?’",
      choices: [
        "우선순위 충돌을 줄이는 공유 보드를 정착시켜 스프린트 합의 시간을 줄이겠습니다.",
        "밝고 긍정적입니다.",
        "술을 잘 마십니다.",
        "묵묵히 따르겠습니다.",
      ],
      answerIndex: 0,
      explain: "팀 통증 × 기여 방식.",
    },
    {
      id: "of-boss-2",
      gameType: "swipe_judge",
      skillRule: "good_vs_bad",
      prompt: "판정.",
      answerText: "갈등이 생기면 일단 피하고 시간이 지나길 기다립니다.",
      isGood: false,
      explain: "회피는 조직적합 증거가 아닙니다.",
    },
    {
      id: "of-boss-3",
      gameType: "order",
      skillRule: "star_order",
      prompt: "순서.",
      cards: [
        "일정이 팀마다 달랐다",
        "공통 표를 만들었다",
        "범위를 줄였다",
        "출시일을 지켰다",
      ],
      answerOrder: [0, 1, 2, 3],
      explain: "충돌→도구→합의→결과.",
    },
    {
      id: "of-boss-4",
      gameType: "fill_blank",
      skillRule: "cause_result",
      prompt: "빈칸.",
      template: "피드백이 몰려 ___했고, 결과는 ___였습니다.",
      blanks: [
        {
          options: ["중간 공유를 제도화", "막판에만 공유", "피드백 거부", "작업 은폐"],
          answerIndex: 0,
        },
        {
          options: ["수정 부하 분산", "품질 사고", "관계 악화", "일정 붕괴"],
          answerIndex: 0,
        },
      ],
      explain: "제도화가 조직 답입니다.",
    },
    {
      id: "of-boss-5",
      gameType: "speak_along",
      skillRule: "speak_compress",
      prompt: "보스.",
      script:
        "목표가 달라 보여 공통 성공 정의를 합의하고 공유 보드로 우선순위를 맞춰 출시 약속을 지켰습니다.",
      tip: "정렬→도구→약속.",
    },
  ],
};

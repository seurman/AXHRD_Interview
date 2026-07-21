/**
 * 역량 학습 패스 — 지식·원리 레슨 카탈로그 (시드/런타임 폴백)
 * stage: 0 CONCEPT · 1 FRAMEWORK · 2 SWIPE_DRILL · 3 WEAKNESS · 4 MOCK · 5 CERTIFY
 *
 * 근거 자료(요약 반영, 원문 비복제):
 * - NCS 직업기초능력 면접 평가 포인트 (의사소통·문제해결·조직이해·자기개발 등)
 * - STAR / BARS 역량면접 채점 관행 (Situation–Task–Action–Result, 1~5 행동지표)
 */

import type { CareerTrack, LessonKind } from "@prisma/client";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import type { AnswerDimensionKey } from "@/lib/interview/answer-dimensions";

export type LessonQuiz = {
  questions: Array<{
    prompt: string;
    choices: string[];
    answerIndex: number;
    explain: string;
  }>;
};

export type LessonSeed = {
  competency: CompetencyCode;
  track: CareerTrack | null;
  stage: number;
  kind: LessonKind;
  slug: string;
  titleKo: string;
  bodyMd: string;
  quizJson?: LessonQuiz;
  sortOrder: number;
};

/** 약점 드릴·인증용 메타 (NCS·STAR 정렬) */
export type CompetencyLearningMeta = {
  title: string;
  /** NCS 직업기초능력 대응 키워드 */
  ncsAnchor: string;
  principle: string;
  frame: string;
  /** STAR 약점 점검 프롬프트 */
  weaknessPrompt: string;
  /** 자주 약한 6축 → 코칭 한 줄 */
  dimensionTips: Partial<Record<AnswerDimensionKey, string>>;
  /** 인증(CERTIFY) 자가점검 기준 */
  certifyChecks: string[];
  sampleQuestion: string;
};

export const COMPETENCY_LEARNING_META: Record<
  CompetencyCode,
  CompetencyLearningMeta
> = {
  COMMUNICATION: {
    title: "의사소통",
    ncsAnchor: "NCS 의사소통능력 — 명확한 표현·경청·상대 관점",
    principle:
      "면접관은 ‘말을 잘하는지’보다 **상대가 이해했는지·핵심이 전달됐는지**를 봅니다. 결론→근거→예시 순이 기본입니다.",
    frame:
      "1) 한 문장 결론  2) 근거 1개  3) 짧은 예시  4) 상대 관점 한 줄. 필러·장황함보다 구조가 우선입니다.",
    weaknessPrompt:
      "같은 경험을 **60초**로 다시 말하세요. 첫 문장에 결론, 중간에 ‘그래서/때문에’, 마지막에 상대(팀/고객)가 얻은 이득을 넣으세요.",
    dimensionTips: {
      delivery: "속도·필러를 줄이고, 문장 사이 0.5초 쉼을 넣으세요.",
      questionIntent: "질문의 핵심 단어를 첫 문장에 그대로 받아 치세요.",
      logic: "근거→예시 순서를 지키면 논리가 살아납니다.",
    },
    certifyChecks: [
      "첫 문장에 결론이 있는가",
      "상대(면접관/팀) 관점 한 줄이 있는가",
      "불필요한 수식·필러 없이 60초 안에 끝나는가",
    ],
    sampleQuestion: "협업 중 의견이 달랐을 때, 상대를 설득한 경험을 말해 주세요.",
  },
  PROBLEM_SOLVING: {
    title: "문제해결",
    ncsAnchor: "NCS 문제해결능력 — 원인 파악·대안·실행계획",
    principle:
      "결과는 결과이고, 면접은 **문제를 어떻게 정의·분해·검증했는지**를 봅니다. 원인 가설→실험→지표가 핵심입니다.",
    frame:
      "상황 → 문제 정의 → 가설 2개 → 검증 방법 → 결과 지표 → 배운 점. 숫자 없으면 ‘무엇을 보면 성공인지’라도 말하세요.",
    weaknessPrompt:
      "같은 사례를 **문제 정의 한 문장**부터 다시 말하세요. 가설을 2개 들고, 왜 그 하나를 골랐는지 밝히세요.",
    dimensionTips: {
      logic: "원인→대안→선택의 이유를 한 줄씩 끊어서 말하세요.",
      outcomeQuantification: "결과 지표(시간·비용·오류율·만족)를 최소 1개 넣으세요.",
      situationSpecificity: "언제·누가·무엇이 막혔는지 숫자/기한으로 고정하세요.",
    },
    certifyChecks: [
      "문제 정의가 한 문장으로 명확한가",
      "가설/대안이 2개 이상인가",
      "검증·결과 지표가 있는가",
    ],
    sampleQuestion: "애매한 문제를 맡았을 때, 어떻게 쪼개고 검증했는지 말해 주세요.",
  },
  JOB_FIT: {
    title: "직무적합",
    ncsAnchor: "직무수행능력 — 공고 요구↔내 행동·산출물 정합",
    principle:
      "직무적합은 열정이 아니라 **그 일에서 쓰는 행동·도구·성과**가 자소서·경험과 맞는지입니다.",
    frame:
      "공고 요구 1개 → 내 경험의 대응 행동 → 산출물/지표 → 이 회사에서의 적용. 추상적 ‘열심히’는 감점 요인입니다.",
    weaknessPrompt:
      "공고 문장 하나를 고른 뒤, **그 문장 ↔ 내 행동 1개 ↔ 산출물**만으로 45초 답변을 만드세요.",
    dimensionTips: {
      situationSpecificity: "역할·도구·산출물을 고유명사로 말하세요.",
      outcomeQuantification: "산출물의 규모·주기를 숫자로 밝히세요.",
      questionIntent: "질문이 묻는 ‘이 직무에서의 쓰임’에 바로 연결하세요.",
    },
    certifyChecks: [
      "공고/직무 키워드와 경험이 1:1로 연결되는가",
      "산출물·도구가 구체적으로 나오는가",
      "이 회사에서 어떻게 쓸지 한 줄이 있는가",
    ],
    sampleQuestion: "이 직무에서 바로 쓸 수 있는 본인 경험을 하나만 골라 설명해 주세요.",
  },
  ORG_FIT: {
    title: "조직적합",
    ncsAnchor: "NCS 조직이해·대인관계 — 규범·갈등 조율·협업",
    principle:
      "조직적합은 착한 사람이 아니라 **갈등·우선순위·협업 규칙을 어떻게 다루는지**입니다.",
    frame:
      "이해관계자 → 이견 지점 → 내가 한 조율 → 합의/결과 → 관계 유지. ‘참았다’만으로는 부족합니다.",
    weaknessPrompt:
      "갈등 사례를 **이해관계자 2명 + 이견 한 줄 + 내가 한 조율 행동** 구조로 다시 말하세요.",
    dimensionTips: {
      individualOwnership: "‘팀에서’가 아니라 내가 한 조율 행동을 주어로 쓰세요.",
      delivery: "감정 서술보다 합의 절차·기준을 말하세요.",
      logic: "왜 그 합의가 조직 목표에 맞는지 한 줄 연결하세요.",
    },
    certifyChecks: [
      "이견의 본질(목표/자원/기준)이 드러나는가",
      "조율 행동이 구체적인가",
      "관계·신뢰를 어떻게 유지했는지 있는가",
    ],
    sampleQuestion: "팀 목표와 개인 의견이 충돌했을 때 어떻게 조율했나요?",
  },
  LEADERSHIP: {
    title: "리더십",
    ncsAnchor: "리더십·영향력 (직무 수행 태도) — 방향·위임·책임 (직책 불문)",
    principle:
      "리더십은 직책이 아니라 **방향 제시·위임·책임 소유**입니다. 신입은 ‘제안·솔선’, 경력은 ‘의사결정·트레이드오프’가 중심입니다.",
    frame:
      "목표 → 팀 상태 → 내가 정한 방향 → 위임/지원 → 결과·회고. ‘혼자 다 했다’는 오히려 감점입니다.",
    weaknessPrompt:
      "같은 경험을 **내가 정한 방향 한 줄 + 위임한 일 1개 + 내가 진 책임**으로 다시 구성하세요.",
    dimensionTips: {
      individualOwnership: "‘우리가’ 대신 내가 고른 결정/트레이드오프를 말하세요.",
      logic: "왜 그 방향이었는지 대안과 비교해 설명하세요.",
      outcomeQuantification: "팀 성과와 내 기여를 분리해 숫자로 말하세요.",
    },
    certifyChecks: [
      "방향(우선순위)을 내가 제시했는가",
      "위임·지원이 드러나는가",
      "결과에 대한 책임이 명확한가",
    ],
    sampleQuestion: "직책이 없어도 팀을 이끈 경험을 말해 주세요.",
  },
  GROWTH: {
    title: "성장",
    ncsAnchor: "NCS 자기개발능력 — 피드백→행동 변화→재측정",
    principle:
      "성장은 실패 자랑이 아니라 **피드백을 행동으로 바꿨는지**입니다. Before→After가 보여야 합니다.",
    frame:
      "부족한 점 → 피드백/신호 → 구체적 행동 변화 → 재측정 → 다음 계획. 감정만 말하고 끝내면 약합니다.",
    weaknessPrompt:
      "Before 행동 1개 → 받은 피드백 → After 행동 1개 → 재측정 신호 순으로 45초 답변을 만드세요.",
    dimensionTips: {
      outcomeQuantification: "변화 전후를 같은 지표로 비교하세요.",
      individualOwnership: "피드백을 ‘누가 뭐라 해서’가 아니라 내가 바꾼 행동으로 말하세요.",
      situationSpecificity: "언제 어떤 신호로 부족함을 알았는지 구체적으로.",
    },
    certifyChecks: [
      "Before/After가 행동 수준에서 대비되는가",
      "피드백·신호의 출처가 있는가",
      "재측정·다음 계획이 있는가",
    ],
    sampleQuestion: "피드백을 받고 실제로 바꾼 행동과, 그 결과를 말해 주세요.",
  },
};

function quizFor(
  competency: CompetencyCode,
  kind: "concept" | "framework" | "certify",
): LessonQuiz {
  const meta = COMPETENCY_LEARNING_META[competency];
  if (kind === "concept") {
    return {
      questions: [
        {
          prompt: `${meta.title} 역량에서 면접관이 가장 중요하게 보는 것은?`,
          choices: [
            "유창한 말솜씨",
            "원리에 맞는 구체 행동과 근거",
            "회사 비전을 길게 인용하는 것",
            "무조건 긍정적 태도",
          ],
          answerIndex: 1,
          explain: `${meta.principle}\n\n(${meta.ncsAnchor})`,
        },
      ],
    };
  }
  if (kind === "framework") {
    return {
      questions: [
        {
          prompt: `${meta.title} 답변 프레임으로 가장 적절한 순서는?`,
          choices: [
            meta.frame.slice(0, 80) + "…",
            "감정 → 변명 → 결론",
            "회사 칭찬만 반복",
            "질문과 무관한 스펙 나열",
          ],
          answerIndex: 0,
          explain: meta.frame,
        },
      ],
    };
  }
  // CERTIFY — STAR/BARS 자가점검
  return {
    questions: [
      {
        prompt: `${meta.title} 인증: 고득점 답변에 가장 가까운 것은?`,
        choices: [
          "STAR(상황–과제–행동–결과) + 측정 가능한 결과 + 내 기여",
          "회사 비전을 외워 말하기",
          "팀 전체를 ‘우리’로만 설명하고 내 행동은 생략",
          "결과가 없으면 과정을 길게 변명",
        ],
        answerIndex: 0,
        explain:
          "역량면접(BARS)은 과거 행동 근거를 1~5 지표로 채점합니다. Action·Result가 점수 핵심입니다.",
      },
      {
        prompt: `다음 중 ${meta.title} 인증 체크에 포함되는 것은?`,
        choices: [
          meta.certifyChecks[0],
          "지원 동기만 감성적으로 말하기",
          "질문과 무관한 스펙 나열",
          "다른 사람 공을 내 것처럼 말하기",
        ],
        answerIndex: 0,
        explain: meta.certifyChecks.map((c, i) => `${i + 1}. ${c}`).join("\n"),
      },
    ],
  };
}

function weaknessBody(meta: CompetencyLearningMeta): string {
  const tips = Object.entries(meta.dimensionTips)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");
  return `## ${meta.title} · 약점 드릴

${meta.ncsAnchor}

### 오늘 할 일
${meta.weaknessPrompt}

### 샘플 질문
> ${meta.sampleQuestion}

### STAR 자가점검
${meta.certifyChecks.map((c) => `- [ ] ${c}`).join("\n")}

### 6축이 약할 때
${tips}

채점 LLM 없이, 녹음·타이머만으로 2회 반복하세요. (저원가)
`;
}

function certifyBody(meta: CompetencyLearningMeta): string {
  return `## ${meta.title} · 역량 인증

${meta.ncsAnchor}

면접관이 쓰는 **행동지표(BARS 1~5)** 관점으로 스스로 통과 여부를 확인합니다.

### 통과 기준
${meta.certifyChecks.map((c, i) => `${i + 1}. ${c}`).join("\n")}

### 연습 질문
> ${meta.sampleQuestion}

### 채점 힌트 (STAR)
- **S/T**: 맥락·책임을 2문장 이내
- **A**: 내가 한 행동·결정·트레이드오프 (점수 핵심)
- **R**: 수치·재측정·배운 점

퀴즈를 통과(70%+)하면 이 역량 트랙을 인증 완료로 표시합니다.
`;
}

/** 6역량 × (개념+프레임+스와이프+약점+실전+인증) 시드 */
export function buildLessonCatalog(): LessonSeed[] {
  const out: LessonSeed[] = [];
  let order = 0;
  for (const code of COMPETENCY_CODES) {
    const meta = COMPETENCY_LEARNING_META[code];
    out.push({
      competency: code,
      track: null,
      stage: 0,
      kind: "CONCEPT",
      slug: `${code.toLowerCase()}-concept`,
      titleKo: `${meta.title} · 개념`,
      bodyMd: `## ${meta.title}이란?\n\n${meta.ncsAnchor}\n\n${meta.principle}\n`,
      quizJson: quizFor(code, "concept"),
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: null,
      stage: 1,
      kind: "FRAMEWORK",
      slug: `${code.toLowerCase()}-framework`,
      titleKo: `${meta.title} · 답변 원리`,
      bodyMd: `## 답변 프레임 (STAR 정렬)\n\n${meta.frame}\n`,
      quizJson: quizFor(code, "framework"),
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: null,
      stage: 2,
      kind: "SWIPE_DRILL",
      slug: `${code.toLowerCase()}-swipe`,
      titleKo: `${meta.title} · 질문 카드 연습`,
      bodyMd: `틴더식 질문 카드에서 **${meta.title}** 태그가 있는 질문을 Save한 뒤, 30~60초 말로 답해보세요.\n\n팁: ${meta.frame}\n\n(채점 없음 · 저원가)`,
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: null,
      stage: 3,
      kind: "WEAKNESS_DRILL",
      slug: `${code.toLowerCase()}-weakness`,
      titleKo: `${meta.title} · 약점 드릴`,
      bodyMd: weaknessBody(meta),
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: "NEW_GRAD",
      stage: 4,
      kind: "MOCK",
      slug: `${code.toLowerCase()}-mock-new`,
      titleKo: `${meta.title} · 신입 실전`,
      bodyMd: `자소서 기반 모의면접(신입 톤)으로 **${meta.title}**을 집중 연습합니다.\n\n예상 질문: ${meta.sampleQuestion}`,
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: "EXPERIENCED",
      stage: 4,
      kind: "MOCK",
      slug: `${code.toLowerCase()}-mock-exp`,
      titleKo: `${meta.title} · 경력 실전`,
      bodyMd: `JD·의사결정 중심 모의면접(경력 톤)으로 **${meta.title}**을 집중 연습합니다.\n\n예상 질문: ${meta.sampleQuestion}`,
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: null,
      stage: 5,
      kind: "CERTIFY",
      slug: `${code.toLowerCase()}-certify`,
      titleKo: `${meta.title} · 인증`,
      bodyMd: certifyBody(meta),
      quizJson: quizFor(code, "certify"),
      sortOrder: order++,
    });
  }
  return out;
}

export const STAGE_LABELS_KO: Record<number, string> = {
  0: "개념",
  1: "원리",
  2: "카드 연습",
  3: "약점 드릴",
  4: "실전",
  5: "인증",
};

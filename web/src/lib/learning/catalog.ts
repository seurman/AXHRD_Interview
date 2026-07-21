/**
 * 역량 학습 패스 — 지식·원리 레슨 카탈로그 (시드/런타임 폴백)
 * stage: 0 CONCEPT · 1 FRAMEWORK · 2 SWIPE_DRILL · 3 WEAKNESS · 4 MOCK · 5 CERTIFY
 */

import type { CareerTrack, LessonKind } from "@prisma/client";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

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

const COMPETENCY_META: Record<
  CompetencyCode,
  { title: string; principle: string; frame: string }
> = {
  COMMUNICATION: {
    title: "의사소통",
    principle:
      "면접관은 ‘말을 잘하는지’보다 **상대가 이해했는지·핵심이 전달됐는지**를 봅니다. 결론→근거→예시 순이 기본입니다.",
    frame:
      "1) 한 문장 결론  2) 근거 1개  3) 짧은 예시  4) 상대 관점 한 줄. 필러·장황함보다 구조가 우선입니다.",
  },
  PROBLEM_SOLVING: {
    title: "문제해결",
    principle:
      "결과는 결과이고, 면접은 **문제를 어떻게 정의·분해·검증했는지**를 봅니다. 원인 가설→실험→지표가 핵심입니다.",
    frame:
      "상황 → 문제 정의 → 가설 2개 → 검증 방법 → 결과 지표 → 배운 점. 숫자 없으면 ‘무엇을 보면 성공인지’라도 말하세요.",
  },
  JOB_FIT: {
    title: "직무적합",
    principle:
      "직무적합은 열정이 아니라 **그 일에서 쓰는 행동·도구·성과**가 자소서·경험과 맞는지입니다.",
    frame:
      "공고 요구 1개 → 내 경험의 대응 행동 → 산출물/지표 → 이 회사에서의 적용. 추상적 ‘열심히’는 감점 요인입니다.",
  },
  ORG_FIT: {
    title: "조직적합",
    principle:
      "조직적합은 착한 사람이 아니라 **갈등·우선순위·협업 규칙을 어떻게 다루는지**입니다.",
    frame:
      "이해관계자 → 이견 지점 → 내가 한 조율 → 합의/결과 → 관계 유지. ‘참았다’만으로는 부족합니다.",
  },
  LEADERSHIP: {
    title: "리더십",
    principle:
      "리더십은 직책이 아니라 **방향 제시·위임·책임 소유**입니다. 신입은 ‘제안·솔선’, 경력은 ‘의사결정·트레이드오프’가 중심입니다.",
    frame:
      "목표 → 팀 상태 → 내가 정한 방향 → 위임/지원 → 결과·회고. ‘혼자 다 했다’는 오히려 감점입니다.",
  },
  GROWTH: {
    title: "성장",
    principle:
      "성장은 실패 자랑이 아니라 **피드백을 행동으로 바꿨는지**입니다. Before→After가 보여야 합니다.",
    frame:
      "부족한 점 → 피드백/신호 → 구체적 행동 변화 → 재측정 → 다음 계획. 감정만 말하고 끝내면 약합니다.",
  },
};

function quizFor(
  competency: CompetencyCode,
  kind: "concept" | "framework",
): LessonQuiz {
  const meta = COMPETENCY_META[competency];
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
          explain: meta.principle,
        },
      ],
    };
  }
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

/** 6역량 × (개념+프레임+스와이프 안내+실전 안내) 공통 시드 */
export function buildLessonCatalog(): LessonSeed[] {
  const out: LessonSeed[] = [];
  let order = 0;
  for (const code of COMPETENCY_CODES) {
    const meta = COMPETENCY_META[code];
    out.push({
      competency: code,
      track: null,
      stage: 0,
      kind: "CONCEPT",
      slug: `${code.toLowerCase()}-concept`,
      titleKo: `${meta.title} · 개념`,
      bodyMd: `## ${meta.title}이란?\n\n${meta.principle}\n`,
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
      bodyMd: `## 답변 프레임\n\n${meta.frame}\n`,
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
      bodyMd:
        "틴더식 질문 카드에서 이 역량 태그가 있는 질문을 Save한 뒤, 30초 말로 답해보세요. (채점 없음 · 저원가)",
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: null,
      stage: 3,
      kind: "WEAKNESS_DRILL",
      slug: `${code.toLowerCase()}-weakness`,
      titleKo: `${meta.title} · 약점 드릴`,
      bodyMd:
        "최근 약한 포인트 1개를 골라 같은 프레임으로 다시 말해보세요. LLM 채점 없이 스스로 점검합니다.",
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: "NEW_GRAD",
      stage: 4,
      kind: "MOCK",
      slug: `${code.toLowerCase()}-mock-new`,
      titleKo: `${meta.title} · 신입 실전`,
      bodyMd: "자소서 기반 모의면접(신입 톤)으로 이 역량을 집중 연습합니다.",
      sortOrder: order++,
    });
    out.push({
      competency: code,
      track: "EXPERIENCED",
      stage: 4,
      kind: "MOCK",
      slug: `${code.toLowerCase()}-mock-exp`,
      titleKo: `${meta.title} · 경력 실전`,
      bodyMd: "JD·의사결정 중심 모의면접(경력 톤)으로 이 역량을 집중 연습합니다.",
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

/**
 * 역량게임 카탈로그 — Phase A: 의사소통 유닛1 (미니게임 5종)
 * 다른 역량은 코스 셸만 두고 유닛은 이후 단계에서 채움
 */

import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";
import { competencyLabel } from "@/lib/labels";
import type { GameCourse, GameUnit } from "./types";

const COMM_UNIT_1: GameUnit = {
  id: "communication-u1",
  competency: "COMMUNICATION",
  index: 0,
  titleKo: "결론이 먼저",
  subtitleKo: "면접관의 질문에 한 문장으로 답을 여는 법",
  levels: [
    {
      id: "communication-u1-l1",
      unitId: "communication-u1",
      index: 0,
      titleKo: "결론 고르기",
      skillRule: "conclusion_first",
      gameType: "choice",
      xpReward: 20,
      items: [
        {
          id: "comm-u1-l1-i1",
          gameType: "choice",
          skillRule: "conclusion_first",
          prompt: "‘팀과 의견이 달랐을 때’ 질문에 가장 좋은 첫 문장은?",
          choices: [
            "결론부터 말하면, 일정 리스크를 줄이기 위해 데이터를 보여 설득했습니다.",
            "사실 그때 분위기가 좀 복잡했는데요…",
            "저는 원래 말을 잘해서요.",
            "팀이 잘못한 부분이 있었습니다.",
          ],
          answerIndex: 0,
          explain: "첫 문장에 결론(무엇을 했는지)을 두면 면접관이 나머지를 듣습니다.",
        },
        {
          id: "comm-u1-l1-i2",
          gameType: "choice",
          skillRule: "conclusion_first",
          prompt: "다음 중 ‘질문 의도’를 받아친 시작은?",
          choices: [
            "갈등 상황에서 제가 한 일은 역할 재분배를 제안한 것입니다.",
            "회사 비전이 좋아서 지원했습니다.",
            "스펙을 말씀드리면…",
            "잘 모르겠습니다만…",
          ],
          answerIndex: 0,
          explain: "질문의 핵심 단어(갈등·역할)를 첫 문장에 반복하면 의도가 맞습니다.",
        },
      ],
    },
    {
      id: "communication-u1-l2",
      unitId: "communication-u1",
      index: 1,
      titleKo: "STAR 순서",
      skillRule: "star_order",
      gameType: "order",
      xpReward: 25,
      items: [
        {
          id: "comm-u1-l2-i1",
          gameType: "order",
          skillRule: "star_order",
          prompt: "설득 경험을 STAR 순서로 배열하세요.",
          cards: [
            "데모가 이틀 밀릴 위기에 팀 일정이 충돌했다",
            "역할 재분배와 일일 체크인을 제안했다",
            "반발하는 팀원에게 리스크 수치를 공유했다",
            "데모를 하루 앞당겨 릴리스했다",
          ],
          answerOrder: [0, 1, 2, 3],
          explain: "상황 → 과제/행동 → 설득 행동 → 결과 순이 기본입니다.",
        },
      ],
    },
    {
      id: "communication-u1-l3",
      unitId: "communication-u1",
      index: 2,
      titleKo: "그래서 · 결과",
      skillRule: "cause_result",
      gameType: "fill_blank",
      xpReward: 25,
      items: [
        {
          id: "comm-u1-l3-i1",
          gameType: "fill_blank",
          skillRule: "cause_result",
          prompt: "인과가 보이게 빈칸을 채우세요.",
          template: "일정이 충돌했기 때문에 ___했고, 결과는 ___였습니다.",
          blanks: [
            {
              options: ["역할 재분배를 제안", "화를 냄", "자리를 피함", "침묵함"],
              answerIndex: 0,
            },
            {
              options: ["데모 지연 해소", "관계가 악화", "업무 포기", "모름"],
              answerIndex: 0,
            },
          ],
          explain: "‘때문에 → 행동 → 결과’가 한 호흡이면 논리가 살아납니다.",
        },
      ],
    },
    {
      id: "communication-u1-l4",
      unitId: "communication-u1",
      index: 3,
      titleKo: "좋은 답 판정",
      skillRule: "good_vs_bad",
      gameType: "swipe_judge",
      xpReward: 20,
      items: [
        {
          id: "comm-u1-l4-i1",
          gameType: "swipe_judge",
          skillRule: "good_vs_bad",
          prompt: "이 답은 설득 질문에 좋은가요?",
          answerText:
            "일정 충돌이 있어 데모 리스크를 수치로 보여 주고, 역할 재분배를 제안해 하루를 앞당겼습니다.",
          isGood: true,
          explain: "결론·행동·결과가 한 문장에 있습니다.",
        },
        {
          id: "comm-u1-l4-i2",
          gameType: "swipe_judge",
          skillRule: "good_vs_bad",
          prompt: "이 답은 설득 질문에 좋은가요?",
          answerText: "팀이 워낙 바빠서요. 다들 힘들었고 분위기가 안 좋았습니다.",
          isGood: false,
          explain: "상황만 있고 내가 한 행동·결과가 없습니다.",
        },
      ],
    },
    {
      id: "communication-u1-l5",
      unitId: "communication-u1",
      index: 4,
      titleKo: "20초 따라 말하기",
      skillRule: "speak_compress",
      gameType: "speak_along",
      xpReward: 30,
      items: [
        {
          id: "comm-u1-l5-i1",
          gameType: "speak_along",
          skillRule: "speak_compress",
          prompt: "아래 답을 소리 내어 따라 말해 보세요. (채점 없음)",
          script:
            "결론부터 말하면, 일정 충돌로 데모가 밀릴 위기에서 역할 재분배를 제안해 하루를 앞당겼습니다. 반발에는 리스크 수치를 공유해 설득했습니다.",
          tip: "첫 호흡에 ‘결론부터 말하면’을 넣고, 숫자(하루)를 또렷이.",
        },
      ],
    },
  ],
};

function emptyCourse(competency: CompetencyCode): GameCourse {
  return {
    competency,
    titleKo: competencyLabel(competency),
    blurbKo: `${competencyLabel(competency)} 규칙을 짧은 게임으로 쌓습니다.`,
    units:
      competency === "COMMUNICATION"
        ? [COMM_UNIT_1]
        : [
            {
              id: `${competency.toLowerCase()}-u1`,
              competency,
              index: 0,
              titleKo: "준비 중",
              subtitleKo: "다음 단계에서 유닛이 열립니다",
              levels: [],
            },
          ],
  };
}

export const COMPETENCY_GAME_COURSES: Record<CompetencyCode, GameCourse> = Object.fromEntries(
  COMPETENCY_CODES.map((c) => [c, emptyCourse(c)]),
) as Record<CompetencyCode, GameCourse>;

export function listGameCourses(): GameCourse[] {
  return COMPETENCY_CODES.map((c) => COMPETENCY_GAME_COURSES[c]);
}

export function getGameCourse(competency: CompetencyCode): GameCourse {
  return COMPETENCY_GAME_COURSES[competency];
}

export function findGameLevel(levelId: string) {
  for (const course of listGameCourses()) {
    for (const unit of course.units) {
      const level = unit.levels.find((l) => l.id === levelId);
      if (level) return { course, unit, level };
    }
  }
  return null;
}

export function findGameItem(levelId: string, itemId: string) {
  const found = findGameLevel(levelId);
  if (!found) return null;
  const item = found.level.items.find((i) => i.id === itemId);
  if (!item) return null;
  return { ...found, item };
}

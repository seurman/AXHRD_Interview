/**
 * 듀오링고식 표준 패스 — 레벨마다 게임 타입 1개씩 순서대로
 * (자유 선택 없음 · IRT가 뱅크에서 문항 추출)
 */

import type { CompetencyCode } from "@/types";
import { competencyLabel } from "@/lib/labels";
import type {
  ChoiceItem,
  ChipBuildItem,
  FillBlankItem,
  GameCourse,
  GameItem,
  GameUnit,
  MatchPairsItem,
  OrderItem,
  SkillRuleId,
  SpeakAlongItem,
  SpotWeakItem,
  SwipeJudgeItem,
  TrueFalseItem,
} from "../types";
import { level } from "./helpers";

export type DuoPack = {
  competency: CompetencyCode;
  key: string;
  blurbKo: string;
  unit1: { titleKo: string; subtitleKo: string };
  unit2: { titleKo: string; subtitleKo: string };
  openers: Array<
    Pick<ChoiceItem, "prompt" | "choices" | "answerIndex" | "explain"> & {
      skillRule?: SkillRuleId;
    }
  >;
  judges: Array<Pick<SwipeJudgeItem, "prompt" | "answerText" | "isGood" | "explain">>;
  blanks: Array<Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">>;
  stories: Array<Pick<OrderItem, "prompt" | "cards" | "answerOrder" | "explain">>;
  scripts: Array<Pick<SpeakAlongItem, "prompt" | "script" | "tip">>;
  traps: Array<
    Pick<ChoiceItem, "prompt" | "choices" | "answerIndex" | "explain"> & {
      skillRule?: SkillRuleId;
    }
  >;
  challengeOrders: Array<Pick<OrderItem, "prompt" | "cards" | "answerOrder" | "explain">>;
  challengeBlank: Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">;
  boss: GameItem[];
  /** optional richer banks */
  trueFalse?: Array<Pick<TrueFalseItem, "prompt" | "statement" | "isTrue" | "explain">>;
  matches?: Array<Pick<MatchPairsItem, "prompt" | "left" | "right" | "answerMap" | "explain">>;
  spots?: Array<Pick<SpotWeakItem, "prompt" | "sentences" | "weakIndex" | "explain">>;
  chips?: Array<Pick<ChipBuildItem, "prompt" | "chips" | "answerOrder" | "explain">>;
};

function id(key: string, unit: number, lv: number, item: number) {
  return `${key}-u${unit}-l${lv}-i${item}`;
}

function unitId(competency: CompetencyCode, unit: number) {
  return `${competency.toLowerCase()}-u${unit}`;
}

function synthTrueFalse(
  key: string,
  judges: DuoPack["judges"],
): TrueFalseItem[] {
  return judges.map((j, i) => ({
    id: id(key, 1, 2, i + 1),
    gameType: "true_false" as const,
    skillRule: "good_vs_bad" as const,
    prompt: "다음 판단이 참인지 고르세요.",
    statement: j.isGood
      ? `「${j.answerText}」는 면접에서 설득력 있는 답이다.`
      : `「${j.answerText}」는 면접에서 설득력 있는 답이다.`,
    isTrue: j.isGood,
    explain: j.explain,
  }));
}

function synthMatches(key: string, competency: CompetencyCode): MatchPairsItem[] {
  const packs: Record<string, MatchPairsItem[]> = {
    default: [
      {
        id: id(key, 1, 6, 1),
        gameType: "match_pairs",
        skillRule: "star_order",
        prompt: "왼쪽 요소와 알맞은 설명을 짝지으세요.",
        left: ["상황", "행동", "결과"],
        right: ["무슨 일이 있었는지", "내가 한 일", "달라진 숫자·성과"],
        answerMap: [0, 1, 2],
        explain: "이야기 뼈대를 짝으로 익힙니다.",
      },
      {
        id: id(key, 1, 6, 2),
        gameType: "match_pairs",
        skillRule: "conclusion_first",
        prompt: "목적과 첫 문장 전략을 짝지으세요.",
        left: ["질문 의도 받기", "결론 먼저", "수치화"],
        right: [
          "질문 핵심 단어를 첫 문장에",
          "무엇을 했는지부터",
          "Before→After를 한 줄에",
        ],
        answerMap: [0, 1, 2],
        explain: "전략 이름을 숨긴 채 짝으로 익힙니다.",
      },
      {
        id: id(key, 1, 6, 3),
        gameType: "match_pairs",
        skillRule: "ownership",
        prompt: "태도와 문장 예시를 짝지으세요.",
        left: ["오너십", "회피", "근거"],
        right: [
          "제가 늦춰 생긴 충돌을 문서로 고쳤습니다",
          "상대 팀 탓이었습니다",
          "로그를 구간별로 나눠 확인했습니다",
        ],
        answerMap: [0, 1, 2],
        explain: "태도가 문장에 어떻게 드러나는지.",
      },
    ],
  };
  return packs.default;
}

function synthSpots(key: string, judges: DuoPack["judges"]): SpotWeakItem[] {
  const weak = judges.find((j) => !j.isGood)?.answerText ?? "그냥 열심히 했습니다.";
  const good = judges.find((j) => j.isGood)?.answerText ?? "지표를 보고 행동을 바꿨습니다.";
  return [
    {
      id: id(key, 1, 7, 1),
      gameType: "spot_weak",
      skillRule: "good_vs_bad",
      prompt: "가장 약한 문장을 고르세요.",
      sentences: [
        good.slice(0, Math.min(40, good.length)) + (good.length > 40 ? "…" : ""),
        weak,
        "그래서 다음엔 체크리스트로 재발을 막았습니다.",
      ],
      weakIndex: 1,
      explain: "행동·결과가 없는 문장이 약점입니다.",
    },
    {
      id: id(key, 1, 7, 2),
      gameType: "spot_weak",
      skillRule: "quantify",
      prompt: "수치가 빠져 약한 문장을 고르세요.",
      sentences: [
        "배포 주기를 2주에서 1주로 줄였습니다.",
        "배포가 좀 더 자주 이뤄지게 됐습니다.",
        "핫픽스 대기 시간이 절반으로 줄었습니다.",
      ],
      weakIndex: 1,
      explain: "모호한 비교는 설득력이 떨어집니다.",
    },
    {
      id: id(key, 1, 7, 3),
      gameType: "spot_weak",
      skillRule: "ownership",
      prompt: "책임이 빠진 문장을 고르세요.",
      sentences: [
        "제가 요구를 늦게 정리해 충돌이 커졌습니다.",
        "팀이 바빠서 분위기가 안 좋았습니다.",
        "이후 주간 합의 문서를 만들었습니다.",
      ],
      weakIndex: 1,
      explain: "상황만 있고 내 책임이 없습니다.",
    },
  ];
}

function synthChips(key: string, stories: DuoPack["stories"]): ChipBuildItem[] {
  return stories.slice(0, 3).map((s, i) => {
    const chips = s.cards.map((c) => c.slice(0, 18) + (c.length > 18 ? "…" : ""));
    return {
      id: id(key, 1, 8, i + 1),
      gameType: "chip_build" as const,
      skillRule: "star_order" as const,
      prompt: "조각을 눌러 이야기 순서로 조립하세요.",
      chips,
      answerOrder: s.answerOrder,
      explain: s.explain,
    };
  });
}

export function buildDuoCourse(pack: DuoPack): GameCourse {
  const c = pack.competency;
  const k = pack.key;
  const u1 = unitId(c, 1);
  const u2 = unitId(c, 2);

  const trueFalse =
    pack.trueFalse?.map((o, i) => ({
      id: id(k, 1, 2, i + 1),
      gameType: "true_false" as const,
      skillRule: "good_vs_bad" as const,
      ...o,
    })) ?? synthTrueFalse(k, pack.judges);

  const matches = pack.matches
    ? pack.matches.map((o, i) => ({
        id: id(k, 1, 6, i + 1),
        gameType: "match_pairs" as const,
        skillRule: "star_order" as const,
        ...o,
      }))
    : synthMatches(k, c);

  const spots =
    pack.spots?.map((o, i) => ({
      id: id(k, 1, 7, i + 1),
      gameType: "spot_weak" as const,
      skillRule: "good_vs_bad" as const,
      ...o,
    })) ?? synthSpots(k, pack.judges);

  const chips =
    pack.chips?.map((o, i) => ({
      id: id(k, 1, 8, i + 1),
      gameType: "chip_build" as const,
      skillRule: "star_order" as const,
      ...o,
    })) ?? synthChips(k, pack.stories);

  const unit1: GameUnit = {
    id: u1,
    competency: c,
    index: 0,
    titleKo: pack.unit1.titleKo,
    subtitleKo: pack.unit1.subtitleKo,
    levels: [
      level({
        id: `${c.toLowerCase()}-u1-l1`,
        unitId: u1,
        index: 0,
        titleKo: "장면을 고르면",
        skillRule: "conclusion_first",
        difficulty: 1,
        xpReward: 25,
        items: pack.openers.map((o, i) => ({
          id: id(k, 1, 1, i + 1),
          gameType: "choice" as const,
          skillRule: o.skillRule ?? "conclusion_first",
          prompt: o.prompt,
          choices: o.choices,
          answerIndex: o.answerIndex,
          explain: o.explain,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l2`,
        unitId: u1,
        index: 1,
        titleKo: "참일까 거짓일까",
        skillRule: "good_vs_bad",
        difficulty: 1,
        xpReward: 25,
        items: trueFalse,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l3`,
        unitId: u1,
        index: 2,
        titleKo: "이 답이 될까",
        skillRule: "good_vs_bad",
        difficulty: 1,
        xpReward: 25,
        items: pack.judges.map((o, i) => ({
          id: id(k, 1, 3, i + 1),
          gameType: "swipe_judge" as const,
          skillRule: "good_vs_bad" as const,
          ...o,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l4`,
        unitId: u1,
        index: 3,
        titleKo: "한 문장으로 잇기",
        skillRule: "cause_result",
        difficulty: 2,
        xpReward: 35,
        items: pack.blanks.map((o, i) => ({
          id: id(k, 1, 4, i + 1),
          gameType: "fill_blank" as const,
          skillRule: "cause_result" as const,
          ...o,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l5`,
        unitId: u1,
        index: 4,
        titleKo: "이야기 순서",
        skillRule: "star_order",
        difficulty: 2,
        xpReward: 40,
        items: pack.stories.map((o, i) => ({
          id: id(k, 1, 5, i + 1),
          gameType: "order" as const,
          skillRule: "star_order" as const,
          ...o,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l6`,
        unitId: u1,
        index: 5,
        titleKo: "짝을 맞추면",
        skillRule: "star_order",
        difficulty: 2,
        xpReward: 40,
        items: matches,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l7`,
        unitId: u1,
        index: 6,
        titleKo: "약한 문장 찾기",
        skillRule: "good_vs_bad",
        difficulty: 3,
        xpReward: 45,
        items: spots,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l8`,
        unitId: u1,
        index: 7,
        titleKo: "조각으로 조립",
        skillRule: "star_order",
        difficulty: 3,
        xpReward: 45,
        items: chips,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l9`,
        unitId: u1,
        index: 8,
        titleKo: "소리 내어 한 번",
        skillRule: "speak_compress",
        difficulty: 3,
        xpReward: 45,
        items: pack.scripts.map((o, i) => ({
          id: id(k, 1, 9, i + 1),
          gameType: "speak_along" as const,
          skillRule: "speak_compress" as const,
          ...o,
        })),
      }),
    ],
  };

  const unit2: GameUnit = {
    id: u2,
    competency: c,
    index: 1,
    titleKo: pack.unit2.titleKo,
    subtitleKo: pack.unit2.subtitleKo,
    levels: [
      level({
        id: `${c.toLowerCase()}-u2-l1`,
        unitId: u2,
        index: 0,
        titleKo: "거의 비슷해 보이는 답",
        skillRule: "conclusion_first",
        difficulty: 4,
        xpReward: 55,
        items: pack.traps.map((o, i) => ({
          id: id(k, 2, 1, i + 1),
          gameType: "choice" as const,
          skillRule: o.skillRule ?? "conclusion_first",
          ...o,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u2-l2`,
        unitId: u2,
        index: 1,
        titleKo: "다섯 장면 맞추기",
        skillRule: "star_order",
        difficulty: 4,
        xpReward: 55,
        items: [
          ...pack.challengeOrders.map((o, i) => ({
            id: id(k, 2, 2, i + 1),
            gameType: "order" as const,
            skillRule: "star_order" as const,
            ...o,
          })),
          {
            id: id(k, 2, 2, pack.challengeOrders.length + 1),
            gameType: "fill_blank" as const,
            skillRule: "cause_result" as const,
            ...pack.challengeBlank,
          },
        ],
      }),
      level({
        id: `${c.toLowerCase()}-u2-l3`,
        unitId: u2,
        index: 2,
        titleKo: "실전 한 판",
        skillRule: "mixed_review",
        difficulty: 5,
        xpReward: 70,
        items: pack.boss.map((item, i) => ({
          ...item,
          id: item.id || id(k, 2, 3, i + 1),
        })),
      }),
    ],
  };

  return {
    competency: c,
    titleKo: competencyLabel(c),
    blurbKo: pack.blurbKo,
    units: [unit1, unit2],
  };
}

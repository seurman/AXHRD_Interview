/**
 * 듀오링고식 표준 패스 — 레벨마다 게임 타입 1개
 * 고유 뱅크 사용 · 보기 셔플로 길이/위치 편향 완화
 */

import type { CompetencyCode } from "@/types";
import { competencyLabel } from "@/lib/labels";
import type {
  BestWorstItem,
  ChoiceItem,
  ChipBuildItem,
  FillBlankItem,
  GameCourse,
  GameItem,
  GameUnit,
  IntentReadItem,
  MatchPairsItem,
  OrderItem,
  SkillRuleId,
  SpeakAlongItem,
  SpotWeakItem,
  SwipeJudgeItem,
  TrueFalseItem,
} from "../types";
import { level } from "./helpers";
import {
  balanceChoiceCues,
  shuffleBestWorst,
  shuffleBlankOptions,
  shuffleChoices,
} from "./content-shuffle";
import { UNIQUE_BANKS } from "./unique-banks";
import {
  lexiconMatchItems,
  lexiconOrgLensChoices,
  lexiconTrueFalseItems,
} from "./lexicon-banks";
import { bestWorstBank, intentReadBank } from "./reading-banks";

export type DuoPack = {
  competency: CompetencyCode;
  key: string;
  blurbKo: string;
  unit1: { titleKo: string; subtitleKo: string };
  unit2: { titleKo: string; subtitleKo: string };
  openers: Array<
    Pick<ChoiceItem, "prompt" | "choices" | "answerIndex" | "explain" | "scenario"> & {
      skillRule?: SkillRuleId;
    }
  >;
  judges: Array<Pick<SwipeJudgeItem, "prompt" | "answerText" | "isGood" | "explain">>;
  blanks: Array<Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">>;
  stories: Array<Pick<OrderItem, "prompt" | "cards" | "answerOrder" | "explain">>;
  scripts: Array<Pick<SpeakAlongItem, "prompt" | "script" | "tip">>;
  traps: Array<
    Pick<ChoiceItem, "prompt" | "choices" | "answerIndex" | "explain" | "scenario"> & {
      skillRule?: SkillRuleId;
    }
  >;
  challengeOrders: Array<Pick<OrderItem, "prompt" | "cards" | "answerOrder" | "explain">>;
  challengeBlank: Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">;
  boss: GameItem[];
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

function choiceItem(
  itemId: string,
  o: {
    scenario?: string;
    prompt: string;
    choices: string[];
    answerIndex: number;
    explain: string;
    skillRule?: SkillRuleId;
  },
  defaultRule: SkillRuleId,
): ChoiceItem {
  const sh = shuffleChoices(o.choices, o.answerIndex, itemId);
  return {
    id: itemId,
    gameType: "choice",
    skillRule: o.skillRule ?? defaultRule,
    scenario: o.scenario,
    prompt: o.prompt,
    choices: sh.choices,
    answerIndex: sh.answerIndex,
    explain: o.explain,
  };
}

function fillItem(
  itemId: string,
  o: Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">,
): FillBlankItem {
  return {
    id: itemId,
    gameType: "fill_blank",
    skillRule: "cause_result",
    prompt: o.prompt,
    template: o.template,
    explain: o.explain,
    blanks: o.blanks.map((b, bi) => {
      const sh = shuffleBlankOptions(b.options, b.answerIndex, `${itemId}-b${bi}`);
      return { options: sh.options, answerIndex: sh.answerIndex };
    }),
  };
}

function intentReadItem(
  itemId: string,
  o: {
    passage: string;
    prompt: string;
    choices: string[];
    answerIndex: number;
    explain: string;
  },
): IntentReadItem {
  const balanced = balanceChoiceCues(o.choices, o.answerIndex);
  const sh = shuffleChoices(balanced, o.answerIndex, itemId);
  return {
    id: itemId,
    gameType: "intent_read",
    skillRule: "question_intent",
    passage: o.passage,
    prompt: o.prompt,
    choices: sh.choices,
    answerIndex: sh.answerIndex,
    explain: o.explain,
  };
}

function bestWorstItem(
  itemId: string,
  o: {
    scenario: string;
    prompt: string;
    choices: string[];
    bestIndex: number;
    worstIndex: number;
    explain: string;
  },
): BestWorstItem {
  const balanced = balanceChoiceCues(o.choices, o.bestIndex);
  const sh = shuffleBestWorst(balanced, o.bestIndex, o.worstIndex, itemId);
  return {
    id: itemId,
    gameType: "best_worst",
    skillRule: "good_vs_bad",
    scenario: o.scenario,
    prompt: o.prompt,
    choices: sh.choices,
    bestIndex: sh.bestIndex,
    worstIndex: sh.worstIndex,
    explain: o.explain,
  };
}

export function buildDuoCourse(pack: DuoPack): GameCourse {
  const c = pack.competency;
  const k = pack.key;
  const u1 = unitId(c, 1);
  const u2 = unitId(c, 2);
  const banks = UNIQUE_BANKS[c];

  // 단어장(SSoT) 우선 — 영어앱 단어/숙어 드릴에 대응
  const trueFalse = (pack.trueFalse ?? lexiconTrueFalseItems(c) ?? banks.trueFalse).map(
    (o, i) => ({
      id: id(k, 1, 2, i + 1),
      gameType: "true_false" as const,
      skillRule: "good_vs_bad" as const,
      ...o,
    }),
  );

  const matches = (pack.matches ?? lexiconMatchItems(c) ?? banks.matches).map((o, i) => ({
    id: id(k, 1, 6, i + 1),
    gameType: "match_pairs" as const,
    skillRule: "star_order" as const,
    ...o,
  }));

  const spots = (pack.spots ?? banks.spots).map((o, i) => ({
    id: id(k, 1, 7, i + 1),
    gameType: "spot_weak" as const,
    skillRule: "good_vs_bad" as const,
    ...o,
  }));

  const chips = (pack.chips ?? banks.chips).map((o, i) => ({
    id: id(k, 1, 8, i + 1),
    gameType: "chip_build" as const,
    skillRule: "star_order" as const,
    ...o,
  }));

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
        titleKo: "상황 판단",
        skillRule: "conclusion_first",
        difficulty: 1,
        xpReward: 25,
        items: pack.openers.map((o, i) =>
          choiceItem(id(k, 1, 1, i + 1), o, "conclusion_first"),
        ),
      }),
      // 독해 비중 ↑ — 기존 레벨 id는 유지(진행도 보존), 새 id만 삽입
      level({
        id: `${c.toLowerCase()}-u1-intent`,
        unitId: u1,
        index: 1,
        titleKo: "의도 독해",
        skillRule: "question_intent",
        difficulty: 2,
        xpReward: 35,
        items: intentReadBank(c).map((o, i) =>
          intentReadItem(id(k, 1, 10, i + 1), o),
        ),
      }),
      level({
        id: `${c.toLowerCase()}-u1-bestworst`,
        unitId: u1,
        index: 2,
        titleKo: "베스트·워스트",
        skillRule: "good_vs_bad",
        difficulty: 2,
        xpReward: 40,
        items: bestWorstBank(c).map((o, i) =>
          bestWorstItem(id(k, 1, 11, i + 1), o),
        ),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l2`,
        unitId: u1,
        index: 3,
        titleKo: "참일까 거짓일까",
        skillRule: "good_vs_bad",
        difficulty: 1,
        xpReward: 25,
        items: trueFalse,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l3`,
        unitId: u1,
        index: 4,
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
        index: 5,
        titleKo: "한 문장으로 잇기",
        skillRule: "cause_result",
        difficulty: 2,
        xpReward: 35,
        items: pack.blanks.map((o, i) => fillItem(id(k, 1, 4, i + 1), o)),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l5`,
        unitId: u1,
        index: 6,
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
        index: 7,
        titleKo: "짝을 맞추면",
        skillRule: "star_order",
        difficulty: 2,
        xpReward: 40,
        items: matches,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l7`,
        unitId: u1,
        index: 8,
        titleKo: "약한 문장 찾기",
        skillRule: "good_vs_bad",
        difficulty: 3,
        xpReward: 45,
        items: spots,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l8`,
        unitId: u1,
        index: 9,
        titleKo: "조각으로 조립",
        skillRule: "star_order",
        difficulty: 3,
        xpReward: 45,
        items: chips,
      }),
      level({
        id: `${c.toLowerCase()}-u1-l9`,
        unitId: u1,
        index: 10,
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
        titleKo: "조직 렌즈로 읽기",
        skillRule: "question_intent",
        difficulty: 4,
        xpReward: 55,
        // 대기업·공공·스타트업 렌즈 독해 (담당자 어필 신호)
        items: (() => {
          const lensItems = lexiconOrgLensChoices(c);
          const source = lensItems.length >= 3 ? lensItems : pack.traps;
          return source.map((o, i) =>
            choiceItem(id(k, 2, 1, i + 1), o, "question_intent"),
          );
        })(),
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
          fillItem(id(k, 2, 2, pack.challengeOrders.length + 1), pack.challengeBlank),
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
        items: pack.boss.map((item, i) => {
          if (item.gameType === "choice") {
            return choiceItem(item.id || id(k, 2, 3, i + 1), item, item.skillRule);
          }
          return { ...item, id: item.id || id(k, 2, 3, i + 1) };
        }),
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

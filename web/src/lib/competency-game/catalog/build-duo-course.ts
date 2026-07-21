/**
 * 듀오링고식 표준 패스 빌더 — 유닛1(5) + 유닛2(3, 혼합 보스)
 */

import type { CompetencyCode } from "@/types";
import { competencyLabel } from "@/lib/labels";
import type {
  ChoiceItem,
  FillBlankItem,
  GameCourse,
  GameItem,
  GameUnit,
  OrderItem,
  SkillRuleId,
  SpeakAlongItem,
  SwipeJudgeItem,
} from "../types";
import { level } from "./helpers";

export type DuoPack = {
  competency: CompetencyCode;
  /** id용 짧은 키: ps, jf, of, ld, gr */
  key: string;
  blurbKo: string;
  unit1: { titleKo: string; subtitleKo: string };
  unit2: { titleKo: string; subtitleKo: string };
  /** L1 choice ×3 */
  openers: Array<Pick<ChoiceItem, "prompt" | "choices" | "answerIndex" | "explain"> & { skillRule?: SkillRuleId }>;
  /** L2 swipe ×3 */
  judges: Array<Pick<SwipeJudgeItem, "prompt" | "answerText" | "isGood" | "explain">>;
  /** L3 fill ×3 */
  blanks: Array<Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">>;
  /** L4 order ×3 */
  stories: Array<Pick<OrderItem, "prompt" | "cards" | "answerOrder" | "explain">>;
  /** L5 speak ×3 */
  scripts: Array<Pick<SpeakAlongItem, "prompt" | "script" | "tip">>;
  /** U2 L1 hard choice ×3 */
  traps: Array<Pick<ChoiceItem, "prompt" | "choices" | "answerIndex" | "explain"> & { skillRule?: SkillRuleId }>;
  /** U2 L2: 2 order(5cards) + 1 fill */
  challengeOrders: Array<Pick<OrderItem, "prompt" | "cards" | "answerOrder" | "explain">>;
  challengeBlank: Pick<FillBlankItem, "prompt" | "template" | "blanks" | "explain">;
  /** U2 L3 boss mixed — 5 items any types */
  boss: GameItem[];
  bossTitles?: { trap: string; challenge: string; boss: string };
};

function id(key: string, unit: number, lv: number, item: number) {
  return `${key}-u${unit}-l${lv}-i${item}`;
}

function unitId(competency: CompetencyCode, unit: number) {
  return `${competency.toLowerCase()}-u${unit}`;
}

export function buildDuoCourse(pack: DuoPack): GameCourse {
  const c = pack.competency;
  const k = pack.key;
  const u1 = unitId(c, 1);
  const u2 = unitId(c, 2);
  const titles = pack.bossTitles ?? {
    trap: "거의 비슷해 보이는 답",
    challenge: "다섯 장면 맞추기",
    boss: "실전 한 판",
  };

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
        titleKo: "이 답이 될까",
        skillRule: "good_vs_bad",
        difficulty: 1,
        xpReward: 25,
        items: pack.judges.map((o, i) => ({
          id: id(k, 1, 2, i + 1),
          gameType: "swipe_judge" as const,
          skillRule: "good_vs_bad" as const,
          prompt: o.prompt,
          answerText: o.answerText,
          isGood: o.isGood,
          explain: o.explain,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l3`,
        unitId: u1,
        index: 2,
        titleKo: "한 문장으로 잇기",
        skillRule: "cause_result",
        difficulty: 2,
        xpReward: 35,
        items: pack.blanks.map((o, i) => ({
          id: id(k, 1, 3, i + 1),
          gameType: "fill_blank" as const,
          skillRule: "cause_result" as const,
          prompt: o.prompt,
          template: o.template,
          blanks: o.blanks,
          explain: o.explain,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l4`,
        unitId: u1,
        index: 3,
        titleKo: "이야기 순서",
        skillRule: "star_order",
        difficulty: 2,
        xpReward: 40,
        items: pack.stories.map((o, i) => ({
          id: id(k, 1, 4, i + 1),
          gameType: "order" as const,
          skillRule: "star_order" as const,
          prompt: o.prompt,
          cards: o.cards,
          answerOrder: o.answerOrder,
          explain: o.explain,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u1-l5`,
        unitId: u1,
        index: 4,
        titleKo: "소리 내어 한 번",
        skillRule: "speak_compress",
        difficulty: 2,
        xpReward: 40,
        items: pack.scripts.map((o, i) => ({
          id: id(k, 1, 5, i + 1),
          gameType: "speak_along" as const,
          skillRule: "speak_compress" as const,
          prompt: o.prompt,
          script: o.script,
          tip: o.tip,
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
        titleKo: titles.trap,
        skillRule: "conclusion_first",
        difficulty: 3,
        xpReward: 45,
        items: pack.traps.map((o, i) => ({
          id: id(k, 2, 1, i + 1),
          gameType: "choice" as const,
          skillRule: o.skillRule ?? "conclusion_first",
          prompt: o.prompt,
          choices: o.choices,
          answerIndex: o.answerIndex,
          explain: o.explain,
        })),
      }),
      level({
        id: `${c.toLowerCase()}-u2-l2`,
        unitId: u2,
        index: 1,
        titleKo: titles.challenge,
        skillRule: "star_order",
        difficulty: 4,
        xpReward: 55,
        items: [
          ...pack.challengeOrders.map((o, i) => ({
            id: id(k, 2, 2, i + 1),
            gameType: "order" as const,
            skillRule: "star_order" as const,
            prompt: o.prompt,
            cards: o.cards,
            answerOrder: o.answerOrder,
            explain: o.explain,
          })),
          {
            id: id(k, 2, 2, pack.challengeOrders.length + 1),
            gameType: "fill_blank" as const,
            skillRule: "cause_result" as const,
            prompt: pack.challengeBlank.prompt,
            template: pack.challengeBlank.template,
            blanks: pack.challengeBlank.blanks,
            explain: pack.challengeBlank.explain,
          },
        ],
      }),
      level({
        id: `${c.toLowerCase()}-u2-l3`,
        unitId: u2,
        index: 2,
        titleKo: titles.boss,
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

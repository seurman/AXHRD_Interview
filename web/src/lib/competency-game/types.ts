/**
 * 역량게임 — 듀오링고식 미니드릴 타입·스키마
 * Phase A: 고르기 / 순서 / 빈칸 / 스와이프판정 / 따라말하기
 */

import type { CompetencyCode } from "@/types";

export const GAME_TYPES = [
  "choice",
  "order",
  "fill_blank",
  "swipe_judge",
  "speak_along",
] as const;

export type GameType = (typeof GAME_TYPES)[number];

export const GAME_TYPE_LABEL_KO: Record<GameType, string> = {
  choice: "고르기",
  order: "순서 맞추기",
  fill_blank: "빈칸 채우기",
  swipe_judge: "좋은 답 고르기",
  speak_along: "따라 말하기",
};

export type SkillRuleId =
  | "conclusion_first"
  | "star_order"
  | "cause_result"
  | "good_vs_bad"
  | "speak_compress"
  | "ownership"
  | "quantify"
  | "question_intent";

export type ChoiceItem = {
  id: string;
  gameType: "choice";
  skillRule: SkillRuleId;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explain: string;
};

export type OrderItem = {
  id: string;
  gameType: "order";
  skillRule: SkillRuleId;
  prompt: string;
  cards: string[];
  /** 정답 순서 (cards 인덱스) */
  answerOrder: number[];
  explain: string;
};

export type FillBlankItem = {
  id: string;
  gameType: "fill_blank";
  skillRule: SkillRuleId;
  prompt: string;
  template: string;
  blanks: Array<{ options: string[]; answerIndex: number }>;
  explain: string;
};

export type SwipeJudgeItem = {
  id: string;
  gameType: "swipe_judge";
  skillRule: SkillRuleId;
  prompt: string;
  answerText: string;
  /** true = 좋은 답(오른쪽), false = 나쁜 답(왼쪽) */
  isGood: boolean;
  explain: string;
};

export type SpeakAlongItem = {
  id: string;
  gameType: "speak_along";
  skillRule: SkillRuleId;
  prompt: string;
  script: string;
  tip: string;
};

export type GameItem =
  | ChoiceItem
  | OrderItem
  | FillBlankItem
  | SwipeJudgeItem
  | SpeakAlongItem;

export type GameLevel = {
  id: string;
  unitId: string;
  index: number;
  titleKo: string;
  skillRule: SkillRuleId;
  gameType: GameType;
  xpReward: number;
  items: GameItem[];
};

export type GameUnit = {
  id: string;
  competency: CompetencyCode;
  index: number;
  titleKo: string;
  subtitleKo: string;
  levels: GameLevel[];
};

export type GameCourse = {
  competency: CompetencyCode;
  titleKo: string;
  blurbKo: string;
  units: GameUnit[];
};

export type GameAnswerPayload =
  | { gameType: "choice"; itemId: string; answerIndex: number }
  | { gameType: "order"; itemId: string; order: number[] }
  | { gameType: "fill_blank"; itemId: string; blankIndexes: number[] }
  | { gameType: "swipe_judge"; itemId: string; judgedGood: boolean }
  | { gameType: "speak_along"; itemId: string; completed: true };

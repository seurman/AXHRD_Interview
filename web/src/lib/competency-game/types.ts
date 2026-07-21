/**
 * 역량게임 — 미니드릴 타입
 * 레벨마다 하나의 게임 타입이 순서대로 등장 (자유 선택 없음)
 */

import type { CompetencyCode } from "@/types";

export const GAME_TYPES = [
  "choice",
  "true_false",
  "swipe_judge",
  "fill_blank",
  "order",
  "match_pairs",
  "spot_weak",
  "chip_build",
  "speak_along",
] as const;

export type GameType = (typeof GAME_TYPES)[number];

export type LevelGameType = GameType | "mixed";

/** 플레이 중에는 쓰지 않음 — 관리/테스트용 */
export const GAME_TYPE_LABEL_KO: Record<GameType, string> = {
  choice: "상황 판단",
  true_false: "참/거짓",
  swipe_judge: "판정",
  fill_blank: "빈칸",
  order: "순서",
  match_pairs: "짝 맞추기",
  spot_weak: "약한 부분 찾기",
  chip_build: "조각 조립",
  speak_along: "따라 말하기",
};

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABEL_KO: Record<Difficulty, string> = {
  1: "기초",
  2: "익숙",
  3: "응용",
  4: "도전",
  5: "보스",
};

/** UX 난이도 → IRT b 시드 */
export const DIFFICULTY_TO_B: Record<Difficulty, number> = {
  1: -2,
  2: -1,
  3: 0,
  4: 1,
  5: 2,
};

export type SkillRuleId =
  | "conclusion_first"
  | "star_order"
  | "cause_result"
  | "good_vs_bad"
  | "speak_compress"
  | "ownership"
  | "quantify"
  | "question_intent"
  | "mixed_review";

export type ChoiceItem = {
  id: string;
  gameType: "choice";
  skillRule: SkillRuleId;
  /** SJT 장면 — 있으면 프롬프트 위에 표시 */
  scenario?: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explain: string;
};

export type TrueFalseItem = {
  id: string;
  gameType: "true_false";
  skillRule: SkillRuleId;
  prompt: string;
  statement: string;
  isTrue: boolean;
  explain: string;
};

export type OrderItem = {
  id: string;
  gameType: "order";
  skillRule: SkillRuleId;
  prompt: string;
  cards: string[];
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
  isGood: boolean;
  explain: string;
};

export type MatchPairsItem = {
  id: string;
  gameType: "match_pairs";
  skillRule: SkillRuleId;
  prompt: string;
  left: string[];
  right: string[];
  /** left[i] → right[answerMap[i]] */
  answerMap: number[];
  explain: string;
};

export type SpotWeakItem = {
  id: string;
  gameType: "spot_weak";
  skillRule: SkillRuleId;
  prompt: string;
  sentences: string[];
  weakIndex: number;
  explain: string;
};

export type ChipBuildItem = {
  id: string;
  gameType: "chip_build";
  skillRule: SkillRuleId;
  prompt: string;
  chips: string[];
  /** 정답 칩 순서 (chips 인덱스) */
  answerOrder: number[];
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
  | TrueFalseItem
  | OrderItem
  | FillBlankItem
  | SwipeJudgeItem
  | MatchPairsItem
  | SpotWeakItem
  | ChipBuildItem
  | SpeakAlongItem;

export type GameLevel = {
  id: string;
  unitId: string;
  index: number;
  titleKo: string;
  skillRule: SkillRuleId;
  gameType: LevelGameType;
  difficulty: Difficulty;
  xpReward: number;
  /** 문항 뱅크 — 플레이 시 IRT로 N개 추출 */
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
  | { gameType: "true_false"; itemId: string; judgedTrue: boolean }
  | { gameType: "order"; itemId: string; order: number[] }
  | { gameType: "fill_blank"; itemId: string; blankIndexes: number[] }
  | { gameType: "swipe_judge"; itemId: string; judgedGood: boolean }
  | { gameType: "match_pairs"; itemId: string; map: number[] }
  | { gameType: "spot_weak"; itemId: string; weakIndex: number }
  | { gameType: "chip_build"; itemId: string; order: number[] }
  | { gameType: "speak_along"; itemId: string; completed: true };

export function resolveLevelGameType(items: GameItem[]): LevelGameType {
  if (items.length === 0) return "choice";
  const types = new Set(items.map((i) => i.gameType));
  if (types.size === 1) return items[0].gameType;
  return "mixed";
}

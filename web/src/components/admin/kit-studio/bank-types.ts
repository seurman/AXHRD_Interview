import type { KitCompetency, KitQuestion } from "./types";

export type BankCompetency = KitCompetency;

export type BankQuestion = KitQuestion & {
  difficulty: number;
  discrimination: number;
  followUpHints: string[];
};

export const BANK_QUESTION_DEFAULTS = {
  difficulty: 0,
  discrimination: 1,
  followUpHints: [] as string[],
};

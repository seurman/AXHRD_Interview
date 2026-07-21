import type { GameLevel } from "../types";
import { resolveLevelGameType } from "../types";

export function level(
  partial: Omit<GameLevel, "gameType"> & { gameType?: GameLevel["gameType"] },
): GameLevel {
  const gameType = partial.gameType ?? resolveLevelGameType(partial.items);
  return { ...partial, gameType };
}

/**
 * 보기 셔플 · 길이 편향 완화 유틸
 */

/** 결정적 셔플 (id 시드) — 빌드마다 동일, 항상 정답이 0번이 되지 않게 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function shuffleChoices(
  choices: string[],
  answerIndex: number,
  seed: string,
): { choices: string[]; answerIndex: number } {
  const indexed = choices.map((c, i) => ({ c, i }));
  const shuffled = seededShuffle(indexed, seed);
  return {
    choices: shuffled.map((x) => x.c),
    answerIndex: shuffled.findIndex((x) => x.i === answerIndex),
  };
}

export function shuffleBlankOptions(
  options: string[],
  answerIndex: number,
  seed: string,
): { options: string[]; answerIndex: number } {
  const r = shuffleChoices(options, answerIndex, seed);
  return { options: r.choices, answerIndex: r.answerIndex };
}

/** 정답이 유독 긴지 검사 (테스트용) */
export function isLongestCorrect(choices: string[], answerIndex: number): boolean {
  const lens = choices.map((c) => c.length);
  const max = Math.max(...lens);
  return lens[answerIndex] === max && lens.filter((l) => l === max).length === 1;
}

const DIGIT_RE = /\d/;

/** 숫자·수치 단서가 정답에만 있는지 (패턴 맞히기 방지) */
export function hasDigitCueOnlyOnAnswer(
  choices: string[],
  answerIndex: number,
): boolean {
  const withDigit = choices.map((c) => DIGIT_RE.test(c));
  return withDigit[answerIndex] && withDigit.filter(Boolean).length === 1;
}

/** 보기 길이 편차(최장-최단) — SJT는 짧게 유지 */
export function choiceLengthSpread(choices: string[]): number {
  const lens = choices.map((c) => c.length);
  return Math.max(...lens) - Math.min(...lens);
}

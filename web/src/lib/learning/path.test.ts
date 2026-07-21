import { describe, expect, it } from "vitest";
import { blendMastery, bumpStreak, nextUnlockedStage } from "./path";

describe("nextUnlockedStage", () => {
  it("starts at stage 0 and unlocks 1 after passing concept quiz", () => {
    expect(
      nextUnlockedStage({
        currentUnlocked: 0,
        lessonStage: 0,
        kind: "CONCEPT",
        quizScore: 1,
      }),
    ).toBe(1);
  });

  it("does not unlock next stage when concept quiz fails", () => {
    expect(
      nextUnlockedStage({
        currentUnlocked: 0,
        lessonStage: 0,
        kind: "CONCEPT",
        quizScore: 0.4,
      }),
    ).toBe(0);
  });

  it("treats missing quiz score as fail for concept/framework", () => {
    expect(
      nextUnlockedStage({
        currentUnlocked: 1,
        lessonStage: 1,
        kind: "FRAMEWORK",
        quizScore: null,
      }),
    ).toBe(1);
  });

  it("unlocks next stage for swipe/weakness/mock without quiz", () => {
    expect(
      nextUnlockedStage({
        currentUnlocked: 2,
        lessonStage: 2,
        kind: "SWIPE_DRILL",
        quizScore: null,
      }),
    ).toBe(3);
    expect(
      nextUnlockedStage({
        currentUnlocked: 3,
        lessonStage: 3,
        kind: "WEAKNESS_DRILL",
        quizScore: null,
      }),
    ).toBe(4);
  });

  it("never exceeds stage 5", () => {
    expect(
      nextUnlockedStage({
        currentUnlocked: 5,
        lessonStage: 5,
        kind: "CERTIFY",
        quizScore: null,
      }),
    ).toBe(5);
  });
});

describe("bumpStreak", () => {
  it("starts at 1 with no prior drill", () => {
    expect(bumpStreak(null, 0)).toBe(1);
  });

  it("keeps streak on same UTC day", () => {
    const now = new Date();
    expect(bumpStreak(now, 4)).toBe(4);
  });

  it("increments when last drill was yesterday UTC", () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    expect(bumpStreak(yesterday, 2)).toBe(3);
  });

  it("resets when gap is more than one day", () => {
    const older = new Date();
    older.setUTCDate(older.getUTCDate() - 3);
    expect(bumpStreak(older, 7)).toBe(1);
  });
});

describe("blendMastery", () => {
  it("blends toward the new sample", () => {
    expect(blendMastery(0, 1)).toBe(0.3);
    expect(blendMastery(1, 0)).toBe(0.7);
  });
});

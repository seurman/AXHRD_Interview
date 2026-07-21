import { describe, expect, it } from "vitest";
import { findGameLevel, getGameCourse, listGameCourses } from "./catalog";
import { gradeItem, gradeLevel, isLevelUnlocked } from "./engine";

describe("competency-game catalog", () => {
  it("ships communication unit 1 with five levels and three items each", () => {
    const course = getGameCourse("COMMUNICATION");
    expect(course.units[0].levels).toHaveLength(5);
    const types = course.units[0].levels.map((l) => l.gameType);
    expect(types).toEqual([
      "choice",
      "order",
      "fill_blank",
      "swipe_judge",
      "speak_along",
    ]);
    for (const level of course.units[0].levels) {
      expect(level.items).toHaveLength(3);
    }
  });

  it("keeps play titles free of technique spoilers", () => {
    const course = getGameCourse("COMMUNICATION");
    const unit = course.units[0];
    const blob = [
      unit.titleKo,
      unit.subtitleKo,
      ...unit.levels.map((l) => l.titleKo),
      ...unit.levels.flatMap((l) =>
        l.items.map((item) => ("prompt" in item ? item.prompt : "")),
      ),
    ].join("\n");
    expect(blob).not.toMatch(/STAR|결론이 먼저|결론 고르기|따라 말하기/);
  });

  it("lists six courses", () => {
    expect(listGameCourses()).toHaveLength(6);
  });
});

describe("competency-game engine", () => {
  it("grades choice and order correctly", () => {
    const found = findGameLevel("communication-u1-l1");
    expect(found).toBeTruthy();
    const item = found!.level.items[0];
    const ok = gradeItem(item, {
      gameType: "choice",
      itemId: item.id,
      answerIndex: item.gameType === "choice" ? item.answerIndex : 0,
    });
    expect(ok.correct).toBe(true);

    const orderLevel = findGameLevel("communication-u1-l2")!.level;
    const orderItem = orderLevel.items[0];
    if (orderItem.gameType !== "order") throw new Error("expected order");
    const bad = gradeItem(orderItem, {
      gameType: "order",
      itemId: orderItem.id,
      order: [...orderItem.answerOrder].reverse(),
    });
    expect(bad.correct).toBe(false);
  });

  it("unlocks levels linearly", () => {
    const ids = ["a", "b", "c"];
    expect(isLevelUnlocked(0, ids, new Set())).toBe(true);
    expect(isLevelUnlocked(1, ids, new Set())).toBe(false);
    expect(isLevelUnlocked(1, ids, new Set(["a"]))).toBe(true);
  });

  it("awards level bonus when all items correct", () => {
    const level = findGameLevel("communication-u1-l5")!.level;
    const answers = level.items.map((item) => ({
      gameType: "speak_along" as const,
      itemId: item.id,
      completed: true as const,
    }));
    const graded = gradeLevel(level, answers);
    expect(graded.allCorrect).toBe(true);
    expect(graded.xpTotal).toBeGreaterThanOrEqual(level.xpReward);
  });
});

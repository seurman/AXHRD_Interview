import { describe, expect, it } from "vitest";
import { findGameLevel, getGameCourse, listGameCourses } from "./catalog";
import { gradeItem, gradeLevel, isLevelUnlocked } from "./engine";

describe("competency-game catalog", () => {
  it("ships communication unit 1 with five game types", () => {
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
    const item = level.items[0];
    const graded = gradeLevel(level, [
      { gameType: "speak_along", itemId: item.id, completed: true },
    ]);
    expect(graded.allCorrect).toBe(true);
    expect(graded.xpTotal).toBeGreaterThanOrEqual(level.xpReward);
  });
});

import { describe, expect, it } from "vitest";
import { findGameLevel, getGameCourse, listGameCourses } from "./catalog";
import {
  flattenCourseLevels,
  gradeItem,
  gradeLevel,
  isCourseLevelUnlocked,
  isLevelUnlocked,
} from "./engine";
import { COMPETENCY_CODES } from "@/types";

describe("competency-game catalog", () => {
  it("ships all six competencies with duo-style 8-level paths", () => {
    expect(listGameCourses()).toHaveLength(6);
    for (const code of COMPETENCY_CODES) {
      const course = getGameCourse(code);
      const flat = flattenCourseLevels(course);
      expect(flat.length).toBeGreaterThanOrEqual(8);
      expect(flat[0].difficulty).toBe(1);
      expect(flat[flat.length - 1].difficulty).toBe(5);
      expect(flat[flat.length - 1].gameType).toBe("mixed");
    }
  });

  it("keeps communication titles free of technique spoilers", () => {
    const course = getGameCourse("COMMUNICATION");
    const blob = course.units
      .flatMap((u) => [
        u.titleKo,
        ...u.levels.map((l) => l.titleKo),
        ...u.levels.flatMap((l) => l.items.map((item) => item.prompt)),
      ])
      .join("\n");
    expect(blob).not.toMatch(/STAR|결론이 먼저|결론 고르기/);
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

    const orderLevel = findGameLevel("communication-u1-l4")!.level;
    const orderItem = orderLevel.items[0];
    if (orderItem.gameType !== "order") throw new Error("expected order");
    const bad = gradeItem(orderItem, {
      gameType: "order",
      itemId: orderItem.id,
      order: [...orderItem.answerOrder].reverse(),
    });
    expect(bad.correct).toBe(false);
  });

  it("unlocks across the whole course, not per unit", () => {
    const course = getGameCourse("PROBLEM_SOLVING");
    const u2First = course.units[1].levels[0].id;
    expect(isCourseLevelUnlocked(course, u2First, new Set())).toBe(false);
    const u1Ids = course.units[0].levels.map((l) => l.id);
    expect(isCourseLevelUnlocked(course, u2First, new Set(u1Ids))).toBe(true);
  });

  it("keeps legacy unit unlock helper", () => {
    const ids = ["a", "b", "c"];
    expect(isLevelUnlocked(0, ids, new Set())).toBe(true);
    expect(isLevelUnlocked(1, ids, new Set())).toBe(false);
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

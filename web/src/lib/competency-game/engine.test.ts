import { describe, expect, it } from "vitest";
import { findGameLevel, getGameCourse, listGameCourses } from "./catalog";
import {
  flattenCourseLevels,
  gradeItem,
  gradeLevel,
  isCourseLevelUnlocked,
} from "./engine";
import {
  gameItemParams,
  selectAdaptiveItems,
  updateThetaEap,
} from "./irt-game";
import { COMPETENCY_CODES } from "@/types";
import { GAME_TYPES } from "./types";

describe("competency-game catalog", () => {
  it("ships all six competencies with level-locked game progression", () => {
    expect(listGameCourses()).toHaveLength(6);
    for (const code of COMPETENCY_CODES) {
      const course = getGameCourse(code);
      const flat = flattenCourseLevels(course);
      expect(flat.length).toBeGreaterThanOrEqual(12);
      expect(flat[0].difficulty).toBe(1);
      expect(flat[flat.length - 1].difficulty).toBe(5);
      expect(flat[flat.length - 1].gameType).toBe("mixed");
      // early levels are single-type (not free pick)
      for (const lv of flat.slice(0, 9)) {
        expect(lv.gameType).not.toBe("mixed");
      }
    }
  });

  it("covers all mini-game types across a communication path", () => {
    const types = new Set(
      flattenCourseLevels(getGameCourse("COMMUNICATION")).flatMap((l) =>
        l.items.map((i) => i.gameType),
      ),
    );
    for (const t of GAME_TYPES) {
      expect(types.has(t)).toBe(true);
    }
  });
});

describe("competency-game engine + IRT", () => {
  it("grades choice and new true_false", () => {
    const found = findGameLevel("communication-u1-l1");
    const item = found!.level.items[0];
    expect(
      gradeItem(item, {
        gameType: "choice",
        itemId: item.id,
        answerIndex: item.gameType === "choice" ? item.answerIndex : 0,
      }).correct,
    ).toBe(true);

    const tfLevel = findGameLevel("communication-u1-l2")!.level;
    const tf = tfLevel.items[0];
    if (tf.gameType !== "true_false") throw new Error("expected true_false");
    expect(
      gradeItem(tf, {
        gameType: "true_false",
        itemId: tf.id,
        judgedTrue: tf.isTrue,
      }).correct,
    ).toBe(true);
  });

  it("updates theta via 2PL EAP after responses", () => {
    const level = findGameLevel("communication-u1-l1")!.level;
    const responses = level.items.map((item, i) => ({
      item: gameItemParams(item, "COMMUNICATION", level.difficulty, i),
      u: 1 as const,
    }));
    const after = updateThetaEap(responses, 0, 1);
    expect(after.theta).toBeGreaterThan(0);
    expect(after.se).toBeLessThan(1);
  });

  it("selects adaptive subset from bank", () => {
    const level = findGameLevel("communication-u1-l1")!.level;
    const picked = selectAdaptiveItems(level, "COMMUNICATION", 0, 2);
    expect(picked).toHaveLength(2);
  });

  it("unlocks across the whole course", () => {
    const course = getGameCourse("PROBLEM_SOLVING");
    const u2First = course.units[1].levels[0].id;
    expect(isCourseLevelUnlocked(course, u2First, new Set())).toBe(false);
    const u1Ids = course.units[0].levels.map((l) => l.id);
    expect(isCourseLevelUnlocked(course, u2First, new Set(u1Ids))).toBe(true);
  });

  it("awards level bonus when speak items complete", () => {
    const level = findGameLevel("communication-u1-l9")!.level;
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

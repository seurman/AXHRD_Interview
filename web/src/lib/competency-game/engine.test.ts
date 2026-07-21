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
import { isLongestCorrect } from "./catalog/content-shuffle";

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

describe("competency-game content quality", () => {
  it("does not make the uniquely longest choice the correct answer", () => {
    let total = 0;
    let uniquelyLong = 0;
    for (const course of listGameCourses()) {
      for (const unit of course.units) {
        for (const level of unit.levels) {
          for (const item of level.items) {
            if (item.gameType !== "choice") continue;
            total++;
            if (isLongestCorrect(item.choices, item.answerIndex)) uniquelyLong++;
          }
        }
      }
    }
    expect(total).toBeGreaterThan(20);
    expect(uniquelyLong / total).toBeLessThanOrEqual(0.15);
  });
  it("keeps true_false/match/spot/chip banks from reusing swipe_judge copy", () => {
    const texts = new Map<string, Set<string>>();
    const add = (text: string, tag: string) => {
      const n = text.replace(/\s+/g, " ").trim();
      if (n.length < 14) return;
      if (!texts.has(n)) texts.set(n, new Set());
      texts.get(n)!.add(tag);
    };
    for (const course of listGameCourses()) {
      for (const unit of course.units) {
        for (const level of unit.levels) {
          for (const item of level.items) {
            const tag = item.gameType;
            if (item.gameType === "swipe_judge") add(item.answerText, tag);
            if (item.gameType === "spot_weak") item.sentences.forEach((s) => add(s, tag));
            if (item.gameType === "true_false") add(item.statement, tag);
            if (item.gameType === "speak_along") add(item.script, tag);
            if (item.gameType === "order") item.cards.forEach((c) => add(c, tag));
          }
        }
      }
    }
    const cross = [...texts.entries()].filter(([, tags]) => tags.size > 1);
    expect(cross).toEqual([]);
  });
});

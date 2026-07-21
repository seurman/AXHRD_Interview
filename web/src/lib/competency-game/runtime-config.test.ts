import { describe, expect, it } from "vitest";
import { getGameCourse } from "./catalog";
import {
  filterCourseByRuntimeConfig,
  isLevelEnabledByConfig,
} from "./runtime-config";

describe("competency-game runtime config filter", () => {
  it("keeps intent_read and best_worst when nothing disabled", () => {
    const course = getGameCourse("COMMUNICATION");
    const filtered = filterCourseByRuntimeConfig(course, {
      disabledGameTypes: [],
      disabledLevelIds: [],
    });
    const types = filtered.units.flatMap((u) => u.levels.map((l) => l.gameType));
    expect(types).toContain("intent_read");
    expect(types).toContain("best_worst");
    expect(types).toContain("choice");
  });

  it("hides all levels of a disabled game type", () => {
    const course = getGameCourse("COMMUNICATION");
    const filtered = filterCourseByRuntimeConfig(course, {
      disabledGameTypes: ["intent_read"],
      disabledLevelIds: [],
    });
    const ids = filtered.units.flatMap((u) => u.levels.map((l) => l.id));
    expect(ids).not.toContain("communication-u1-intent");
    expect(ids).toContain("communication-u1-bestworst");
  });

  it("hides a specific level id", () => {
    const course = getGameCourse("COMMUNICATION");
    const level = course.units[0].levels.find((l) => l.id.endsWith("-bestworst"))!;
    expect(
      isLevelEnabledByConfig(level, {
        disabledGameTypes: [],
        disabledLevelIds: [level.id],
      }),
    ).toBe(false);
  });

  it("does not drop mixed boss via type switch alone", () => {
    const course = getGameCourse("COMMUNICATION");
    const boss = course.units.flatMap((u) => u.levels).find((l) => l.gameType === "mixed");
    expect(boss).toBeTruthy();
    expect(
      isLevelEnabledByConfig(boss!, {
        disabledGameTypes: ["choice", "order", "fill_blank"],
        disabledLevelIds: [],
      }),
    ).toBe(true);
  });
});

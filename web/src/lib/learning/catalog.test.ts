import { describe, expect, it } from "vitest";
import { COMPETENCY_CODES } from "@/types";
import { buildLessonCatalog, STAGE_LABELS_KO } from "./catalog";

describe("learning catalog", () => {
  it("seeds concept→framework→swipe→weakness→mock for each competency", () => {
    const catalog = buildLessonCatalog();
    expect(catalog.length).toBe(COMPETENCY_CODES.length * 6);

    for (const code of COMPETENCY_CODES) {
      const rows = catalog.filter((l) => l.competency === code);
      expect(rows.map((r) => r.stage).sort((a, b) => a - b)).toEqual([
        0, 1, 2, 3, 4, 4,
      ]);
      expect(rows.filter((r) => r.kind === "CONCEPT")).toHaveLength(1);
      expect(rows.filter((r) => r.kind === "FRAMEWORK")).toHaveLength(1);
      expect(rows.filter((r) => r.kind === "SWIPE_DRILL")).toHaveLength(1);
      expect(rows.filter((r) => r.kind === "WEAKNESS_DRILL")).toHaveLength(1);
      expect(rows.filter((r) => r.kind === "MOCK")).toHaveLength(2);
      expect(rows.filter((r) => r.track === "NEW_GRAD")).toHaveLength(1);
      expect(rows.filter((r) => r.track === "EXPERIENCED")).toHaveLength(1);
    }
  });

  it("attaches quizzes only to concept/framework lessons", () => {
    const catalog = buildLessonCatalog();
    for (const lesson of catalog) {
      if (lesson.kind === "CONCEPT" || lesson.kind === "FRAMEWORK") {
        expect(lesson.quizJson?.questions.length).toBeGreaterThan(0);
      } else {
        expect(lesson.quizJson).toBeUndefined();
      }
    }
  });

  it("exposes stage labels for UI", () => {
    expect(STAGE_LABELS_KO[0]).toBe("개념");
    expect(STAGE_LABELS_KO[2]).toBe("카드 연습");
    expect(STAGE_LABELS_KO[4]).toBe("실전");
  });
});

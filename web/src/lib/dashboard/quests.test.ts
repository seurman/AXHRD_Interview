import { describe, expect, it } from "vitest";
import { buildCareerQuests } from "./quests";

describe("buildCareerQuests", () => {
  it("marks certificate quest done when path is certified", () => {
    const { quests, totalXp } = buildCareerQuests({
      sessionCount: 0,
      hasDiscover: false,
      pathCertifiedCount: 2,
    });
    const cert = quests.find((q) => q.id === "certificate");
    expect(cert?.done).toBe(true);
    expect(cert?.description).toContain("학습 패스 인증 2개");
    expect(totalXp).toBe(100 + 40);
  });
});

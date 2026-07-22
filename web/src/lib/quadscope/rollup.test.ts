import { describe, expect, it } from "vitest";
import { rollupQuadScope } from "./rollup";

describe("rollupQuadScope", () => {
  it("averages percentiles into Judgment Delivery Relations Anchor", () => {
    const rows = rollupQuadScope({
      PROBLEM_SOLVING: { assessed: true, percentile: 80 },
      JOB_FIT: { assessed: true, percentile: 60 },
      COMMUNICATION: { assessed: true, percentile: 40 },
      ORG_FIT: { assessed: true, percentile: 50 },
      LEADERSHIP: { assessed: false, percentile: 0 },
      GROWTH: { assessed: true, percentile: 70 },
    });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.judgment.percentile).toBe(80);
    expect(byId.delivery.percentile).toBe(60);
    expect(byId.relations.percentile).toBe(45);
    expect(byId.anchor.percentile).toBe(70);
  });
});

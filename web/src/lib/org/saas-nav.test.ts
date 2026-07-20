import { describe, expect, it } from "vitest";
import { buildSaasNavConfig } from "@/lib/org/saas-nav";
import type { CapabilityId } from "@/lib/platform/capabilities";

describe("saas nav consolidated ops console", () => {
  it("exposes a single org dashboard link instead of people/members splits", () => {
    const caps = new Set<CapabilityId>(["tenant.cohort"]);
    const nav = buildSaasNavConfig(caps, {
      interview: true,
      competency: false,
      diagnostic: false,
      assessment: false,
    });
    expect(nav?.links).toEqual([{ href: "/org/dashboard", labelKey: "cohortDashboard" }]);
    expect(nav?.links.some((l) => l.href === "/org/people")).toBe(false);
    expect(nav?.links.some((l) => l.href === "/org/members")).toBe(false);
  });
});

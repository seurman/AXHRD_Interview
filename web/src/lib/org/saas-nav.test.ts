import { describe, expect, it } from "vitest";
import { buildSaasNavConfig } from "@/lib/org/saas-nav";
import type { CapabilityId } from "@/lib/platform/capabilities";

describe("saas nav people dashboard", () => {
  it("includes people dashboard when tenant.cohort is present", () => {
    const caps = new Set<CapabilityId>(["tenant.cohort"]);
    const nav = buildSaasNavConfig(caps, {
      interview: true,
      competency: false,
      diagnostic: false,
      assessment: false,
    });
    expect(nav?.links.some((l) => l.href === "/org/people")).toBe(true);
    expect(nav?.links.some((l) => l.labelKey === "peopleDashboard")).toBe(true);
  });
});

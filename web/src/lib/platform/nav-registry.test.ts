import { describe, expect, it } from "vitest";
import { GUEST_PRODUCT_HREFS } from "./nav-registry";

describe("GUEST_PRODUCT_HREFS", () => {
  it("includes competency learning path entry aligned with homepage wedge", () => {
    const keys = GUEST_PRODUCT_HREFS.map((i) => i.labelKey);
    expect(keys).toContain("practice");
    expect(keys).toContain("resume");
    expect(keys).toContain("growth");
    expect(keys).toContain("interview");

    const practice = GUEST_PRODUCT_HREFS.find((i) => i.labelKey === "practice");
    expect(practice?.href).toContain("/practice/path");
  });

  it("keeps learning path before org modules", () => {
    const practiceIdx = GUEST_PRODUCT_HREFS.findIndex((i) => i.labelKey === "practice");
    const orgIdx = GUEST_PRODUCT_HREFS.findIndex((i) => i.labelKey === "forOrganizations");
    expect(practiceIdx).toBeGreaterThanOrEqual(0);
    expect(practiceIdx).toBeLessThan(orgIdx);
  });
});

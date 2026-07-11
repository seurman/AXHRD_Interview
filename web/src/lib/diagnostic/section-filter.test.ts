import { describe, expect, it } from "vitest";
import { filterSectionsByEnabled, parseEnabledSectionCodes } from "./section-filter";

describe("section-filter", () => {
  const sections = [
    { code: "DM", nameKo: "기본 정보" },
    { code: "OHI", nameKo: "조직 건강" },
    { code: "ORI", nameKo: "조직 역량" },
    { code: "OVI", nameKo: "조직 속도" },
    { code: "OAI", nameKo: "조직 정렬" },
  ];

  it("returns all sections when enabled is null", () => {
    expect(filterSectionsByEnabled(sections, null)).toHaveLength(5);
  });

  it("always keeps DM when filtering by axis", () => {
    const filtered = filterSectionsByEnabled(sections, ["OHI", "ORI"]);
    expect(filtered.map((s) => s.code)).toEqual(["DM", "OHI", "ORI"]);
  });

  it("parses enabled section codes", () => {
    expect(parseEnabledSectionCodes(["OHI", "  "])).toEqual(["OHI"]);
    expect(parseEnabledSectionCodes(null)).toBeNull();
    expect(parseEnabledSectionCodes([])).toBeNull();
  });
});

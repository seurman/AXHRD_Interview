import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEMOGRAPHIC_CODES,
  filterDemographicItems,
  filterSectionsByEnabled,
  mapAgeBandToGeneration,
  parseEnabledDemographicItemCodes,
  parseEnabledSectionCodes,
} from "./section-filter";

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

describe("demographic item filter", () => {
  const items = [
    { itemCode: "DM01", isDemographic: true },
    { itemCode: "DM02", isDemographic: true },
    { itemCode: "DM03", isDemographic: true },
    { itemCode: "DM04", isDemographic: true },
    { itemCode: "DM05", isDemographic: true },
    { itemCode: "DM06", isDemographic: true },
    { itemCode: "DM12", isDemographic: true },
    { itemCode: "E01", isDemographic: false },
  ];

  it("defaults to DM01~DM05 when enabled is null (backward compatible)", () => {
    const filtered = filterDemographicItems(items, null);
    expect(filtered.map((i) => i.itemCode)).toEqual([
      ...DEFAULT_DEMOGRAPHIC_CODES,
      "E01",
    ]);
  });

  it("defaults to DM01~DM05 when enabled is empty", () => {
    const filtered = filterDemographicItems(items, []);
    expect(filtered.map((i) => i.itemCode)).toEqual([
      ...DEFAULT_DEMOGRAPHIC_CODES,
      "E01",
    ]);
  });

  it("keeps selected demographic codes including sensitive DM12", () => {
    const filtered = filterDemographicItems(items, ["DM01", "DM06", "DM12"]);
    expect(filtered.map((i) => i.itemCode)).toEqual(["DM01", "DM06", "DM12", "E01"]);
  });

  it("parses demographic codes like section codes", () => {
    expect(parseEnabledDemographicItemCodes(["DM01", "  "])).toEqual(["DM01"]);
    expect(parseEnabledDemographicItemCodes(null)).toBeNull();
  });

  it("maps DM04 age band to generation without new items", () => {
    expect(mapAgeBandToGeneration("20대")).toBe("Z");
    expect(mapAgeBandToGeneration("30대")).toBe("M");
    expect(mapAgeBandToGeneration("40대")).toBe("X");
    expect(mapAgeBandToGeneration("50대이상")).toBe("BB+");
    expect(mapAgeBandToGeneration(null)).toBeNull();
  });
});

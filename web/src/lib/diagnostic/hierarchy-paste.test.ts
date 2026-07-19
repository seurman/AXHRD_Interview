import { describe, expect, it } from "vitest";
import { parseHierarchyPaste } from "@/lib/diagnostic/hierarchy-paste";

describe("parseHierarchyPaste", () => {
  it("parses 1/2/3 column CSV lines", () => {
    const rows = parseHierarchyPaste(
      ["지원팀", "영업본부,서울팀", "본사,영업본부,부산팀", ""].join("\n"),
    );
    expect(rows).toEqual([
      { name: "지원팀" },
      { unitName: "영업본부", name: "서울팀" },
      { divisionName: "본사", unitName: "영업본부", name: "부산팀" },
    ]);
  });

  it("accepts tab-separated excel paste", () => {
    expect(parseHierarchyPaste("본사\t영업\tA팀")).toEqual([
      { divisionName: "본사", unitName: "영업", name: "A팀" },
    ]);
  });
});

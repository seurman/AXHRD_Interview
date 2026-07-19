import { describe, expect, it } from "vitest";
import {
  buildDraftHierarchyPreview,
  buildOrderedTree,
  levelDepth,
} from "@/lib/diagnostic/hierarchy-tree";

describe("buildOrderedTree", () => {
  it("orders parent before children", () => {
    const nodes = [
      { id: "t1", name: "콘텐츠팀", level: "TEAM" as const, parentId: "u1" },
      { id: "d1", name: "그로스본부", level: "DIVISION" as const, parentId: null },
      { id: "u1", name: "마케팅사업부", level: "UNIT" as const, parentId: "d1" },
    ];
    expect(buildOrderedTree(nodes).map((n) => n.id)).toEqual(["d1", "u1", "t1"]);
  });
});

describe("buildDraftHierarchyPreview", () => {
  it("dedupes shared parents", () => {
    const preview = buildDraftHierarchyPreview([
      { divisionName: "그로스본부", unitName: "마케팅사업부", name: "콘텐츠팀" },
      { divisionName: "그로스본부", unitName: "마케팅사업부", name: "퍼포먼스팀" },
    ]);
    expect(preview.map((n) => `${n.level}:${n.name}`)).toEqual([
      "DIVISION:그로스본부",
      "UNIT:마케팅사업부",
      "TEAM:콘텐츠팀",
      "TEAM:퍼포먼스팀",
    ]);
    expect(preview.map((n) => n.depth)).toEqual([0, 1, 2, 2]);
  });
});

describe("levelDepth", () => {
  it("maps levels", () => {
    expect(levelDepth("DIVISION")).toBe(0);
    expect(levelDepth("UNIT")).toBe(1);
    expect(levelDepth("TEAM")).toBe(2);
  });
});

/**
 * ARC_Index_통합설문지_260626.docx 기준으로 arc-index-data.ts 에서
 * 통합 설문에 없는 문항을 제거하고 instrument 메타를 갱신한다.
 *
 * Usage: npx tsx scripts/prune-to-integrated-survey.ts
 */
import fs from "fs";
import path from "path";
import { ARC_INDEX_SEED, type SeedItem, type SeedSection, type SeedSubscale } from "../prisma/seed/arc-index-data";

const REMOVE_CODES = new Set([
  "D01",
  "D02",
  "PS03",
  "EM03",
  "PM03",
  "LG03",
  "WE03",
  "CD04",
  "LA04",
  "AXC05",
  "HV04",
  "SA04",
  "EA03",
  "EA04",
  "EA06",
  "OA02",
  "OA05",
]);

function filterItems(items: SeedItem[]): SeedItem[] {
  return items.filter((i) => !REMOVE_CODES.has(i.itemCode));
}

function filterSubscales(subscales: SeedSubscale[]): SeedSubscale[] {
  return subscales
    .filter((s) => s.code !== "D")
    .map((s) => ({ ...s, items: filterItems(s.items) }))
    .filter((s) => s.items.length > 0 || s.code === "SE");
}

const pruned = {
  instrument: {
    ...ARC_INDEX_SEED.instrument,
    nameKo: "ARC Index — 통합 조직진단",
    version: "260626",
    estimatedMinutes: 22,
  },
  sections: ARC_INDEX_SEED.sections.map((sec: SeedSection) => ({
    ...sec,
    directItems: sec.directItems ? filterItems(sec.directItems) : undefined,
    subscales: filterSubscales(sec.subscales),
  })),
};

const outPath = path.join(process.cwd(), "prisma/seed/arc-index-integrated.snapshot.json");
fs.writeFileSync(outPath, JSON.stringify(pruned, null, 2), "utf8");

let likert = 0;
let openText = 0;
let importance = 0;
for (const sec of pruned.sections) {
  for (const item of sec.directItems ?? []) {
    if (item.scaleType === "OPEN_TEXT") openText++;
    else if (!item.isDemographic) likert++;
    if (item.hasImportanceAxis) importance++;
  }
  for (const sub of sec.subscales) {
    for (const item of sub.items) {
      if (item.scaleType === "OPEN_TEXT") openText++;
      else likert++;
      if (item.hasImportanceAxis) importance++;
    }
  }
}

console.log("[prune] snapshot:", outPath);
console.log("[prune] likert:", likert, "openText:", openText, "importance-axis items:", importance);
console.log("[prune] removed codes:", [...REMOVE_CODES].join(", "));

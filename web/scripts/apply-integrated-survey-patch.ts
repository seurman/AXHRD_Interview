/**
 * arc-index-data.ts 를 ARC_Index_통합설문지_260626 기준으로 패치한다.
 * Usage: npx tsx scripts/apply-integrated-survey-patch.ts
 */
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "prisma/seed/arc-index-data.ts");

const REMOVE_CODES = [
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
  "D_OE",
];

function removeItemBlock(src: string, code: string): string {
  const re = new RegExp(
    `\\n\\s*\\{\\n\\s*itemCode: '${code}',[\\s\\S]*?\\n\\s*\\},`,
    "g",
  );
  return src.replace(re, "");
}

function removeDSubscale(src: string): string {
  const re = /\n\s*\{\n\s*code: 'D',[\s\S]*?\n\s*\},\n(?=\s*\{\n\s*code: 'SL')/;
  return src.replace(re, "\n");
}

let src = fs.readFileSync(DATA_PATH, "utf8");

for (const code of REMOVE_CODES) {
  const next = removeItemBlock(src, code);
  if (next === src) console.warn("[patch] not found:", code);
  src = next;
}
src = removeDSubscale(src);

src = src.replace(
  /nameKo: 'ARC Index — 통합 조직진단',\n\s*version: 'v1\.0',\n\s*estimatedMinutes: 22,/,
  "nameKo: 'ARC Index — 통합 조직진단',\n    version: '260626',\n    estimatedMinutes: 22,",
);

src = src.replace(
  /Item text sourced verbatim from docs\/arc-index\/source\/ \(OHI\/ORI\/OVI\/OAI 최종 확정본\)\./,
  "Item text aligned with docs/arc-index/source/ARC_Index_통합설문지_260626.docx (경량 통합본).",
);

fs.writeFileSync(DATA_PATH, src, "utf8");
console.log("[patch] updated", DATA_PATH);

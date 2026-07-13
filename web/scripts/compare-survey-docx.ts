import fs from "fs";
import { ARC_INDEX_SEED } from "../prisma/seed/arc-index-data";

const xml = fs.readFileSync(
  "D:/HR_IN_Solution/docs/arc-index/_survey_extract/unzipped/word/document.xml",
  "utf8",
);
const paras = xml
  .split(/<w:p[\s>]/)
  .slice(1)
  .map((ch) => [...ch.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""))
  .filter((p) => p.trim());

const surveyCodes = new Set<string>();
const surveyTexts = new Map<string, string>();
for (const p of paras) {
  const m = p.match(/^([A-Z]{1,4}\d{2})\b/);
  if (m) {
    surveyCodes.add(m[1]);
    const next = paras[paras.indexOf(p) + 1];
    if (next && !next.match(/^[①②③④⑤○]/)) surveyTexts.set(m[1], next.slice(0, 60));
  }
}

const seedItems: Array<{
  code: string;
  scaleType: string;
  importance: boolean;
  reversed: boolean;
}> = [];
type SeedItemLike = { itemCode: string; scaleType: string; hasImportanceAxis?: boolean; isReversed?: boolean };
for (const sec of ARC_INDEX_SEED.sections) {
  for (const item of sec.directItems ?? []) {
    const it = item as SeedItemLike;
    seedItems.push({
      code: it.itemCode,
      scaleType: it.scaleType,
      importance: !!it.hasImportanceAxis,
      reversed: !!it.isReversed,
    });
  }
  for (const sub of sec.subscales) {
    for (const item of sub.items) {
      const it = item as SeedItemLike;
      seedItems.push({
        code: it.itemCode,
        scaleType: it.scaleType,
        importance: !!it.hasImportanceAxis,
        reversed: !!it.isReversed,
      });
    }
  }
}

const seedLikert = seedItems.filter((i) => i.scaleType !== "OPEN_TEXT" && !i.code.startsWith("DM"));
const seedOpen = seedItems.filter((i) => i.scaleType === "OPEN_TEXT");
const surveyLikert = [...surveyCodes].filter((c) => !c.startsWith("DM"));

const inSeedNotSurvey = seedLikert.map((i) => i.code).filter((c) => !surveyCodes.has(c));
const inSurveyNotSeed = surveyLikert.filter((c) => !seedItems.some((i) => i.code === c));

console.log("SEED likert (ex DM):", seedLikert.length);
console.log("SEED open text:", seedOpen.length);
console.log("SURVEY likert codes:", surveyLikert.length);
console.log("\nIn SEED but NOT in survey docx (" + inSeedNotSurvey.length + "):");
console.log(inSeedNotSurvey.join(", ") || "(none)");
console.log("\nIn survey but NOT in seed (" + inSurveyNotSeed.length + "):");
console.log(inSurveyNotSeed.join(", ") || "(none)");

const reversedInFormula = ["PS03", "EM03", "CD04", "SA04", "EA03", "EA06", "OA02"];
for (const code of reversedInFormula) {
  const inSurvey = surveyCodes.has(code);
  const inSeed = seedItems.some((i) => i.code === code);
  console.log(`reversed ${code}: survey=${inSurvey} seed=${inSeed}`);
}

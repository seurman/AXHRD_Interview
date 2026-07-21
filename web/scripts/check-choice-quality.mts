import { listGameCourses } from "../src/lib/competency-game/catalog";
import {
  choiceLengthSpread,
  hasDigitCueOnlyOnAnswer,
  isLongestCorrect,
} from "../src/lib/competency-game/catalog/content-shuffle";

const offenders: string[] = [];
let total = 0;
let uniq = 0;
let dig = 0;
let noScenario = 0;
let spreadHi = 0;

for (const course of listGameCourses()) {
  for (const unit of course.units) {
    for (const level of unit.levels) {
      for (const item of level.items) {
        if (item.gameType !== "choice") continue;
        total++;
        if (!item.scenario) noScenario++;
        if (choiceLengthSpread(item.choices) > 18) spreadHi++;
        if (isLongestCorrect(item.choices, item.answerIndex)) {
          uniq++;
          offenders.push(
            `${course.competency} ${item.id} lens=${item.choices.map((c) => c.length).join(",")} | ${item.choices.join(" / ")}`,
          );
        }
        if (hasDigitCueOnlyOnAnswer(item.choices, item.answerIndex)) dig++;
      }
    }
  }
}

console.log(JSON.stringify({ total, uniq, dig, noScenario, spreadHi, offenders }, null, 2));

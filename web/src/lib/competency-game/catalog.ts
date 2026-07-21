/**
 * 역량게임 카탈로그 — 6역량 × 레벨별 게임타입 고정 + IRT 뱅크
 */

import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";
import type { GameCourse } from "./types";
import { buildDuoCourse } from "./catalog/build-duo-course";
import { COMMUNICATION_PACK } from "./catalog/packs/communication";
import { PROBLEM_SOLVING_PACK } from "./catalog/packs/problem-solving";
import { JOB_FIT_PACK } from "./catalog/packs/job-fit";
import { ORG_FIT_PACK } from "./catalog/packs/org-fit";
import { LEADERSHIP_PACK } from "./catalog/packs/leadership";
import { GROWTH_PACK } from "./catalog/packs/growth";

export const COMPETENCY_GAME_COURSES: Record<CompetencyCode, GameCourse> = {
  COMMUNICATION: buildDuoCourse(COMMUNICATION_PACK),
  PROBLEM_SOLVING: buildDuoCourse(PROBLEM_SOLVING_PACK),
  JOB_FIT: buildDuoCourse(JOB_FIT_PACK),
  ORG_FIT: buildDuoCourse(ORG_FIT_PACK),
  LEADERSHIP: buildDuoCourse(LEADERSHIP_PACK),
  GROWTH: buildDuoCourse(GROWTH_PACK),
};

export function listGameCourses(): GameCourse[] {
  return COMPETENCY_CODES.map((c) => COMPETENCY_GAME_COURSES[c]);
}

export function getGameCourse(competency: CompetencyCode): GameCourse {
  return COMPETENCY_GAME_COURSES[competency];
}

export function findGameLevel(levelId: string) {
  for (const course of listGameCourses()) {
    for (const unit of course.units) {
      const level = unit.levels.find((l) => l.id === levelId);
      if (level) return { course, unit, level };
    }
  }
  return null;
}

export function findGameItem(levelId: string, itemId: string) {
  const found = findGameLevel(levelId);
  if (!found) return null;
  const item = found.level.items.find((i) => i.id === itemId);
  if (!item) return null;
  return { ...found, item };
}

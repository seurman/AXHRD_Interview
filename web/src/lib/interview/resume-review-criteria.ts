/**
 * 자소서 첨삭 평가 기준 — DB 로드/시드 (서버 전용).
 */

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_RESUME_REVIEW_CRITERIA,
  REVIEW_CATEGORIES,
  type LoadedCriterion,
  type ReviewCategory,
} from "@/lib/interview/resume-review-criteria-data";

export {
  DEFAULT_RESUME_REVIEW_CRITERIA,
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_LABELS,
  type CriterionSeed,
  type LoadedCriterion,
  type ReviewCategory,
} from "@/lib/interview/resume-review-criteria-data";

function asCategory(raw: string): ReviewCategory {
  if ((REVIEW_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as ReviewCategory;
  }
  return "FORMAT_LOGIC";
}

/** DB에 기준이 없으면 기본 시드를 upsert합니다. */
export async function ensureResumeReviewCriteriaSeeded(): Promise<number> {
  const count = await prisma.resumeReviewCriterion.count();
  if (count > 0) return count;

  await prisma.resumeReviewCriterion.createMany({
    data: DEFAULT_RESUME_REVIEW_CRITERIA.map((c) => ({
      code: c.code,
      category: c.category,
      title: c.title,
      description: c.description,
      howToCheck: c.howToCheck,
      weight: c.weight,
      sortOrder: c.sortOrder,
      isActive: true,
      sourceNote: c.sourceNote,
    })),
    skipDuplicates: true,
  });

  return prisma.resumeReviewCriterion.count();
}

/** 첨삭·관리 UI용 — 활성 기준 (없으면 시드 후 반환) */
export async function loadActiveReviewCriteria(): Promise<LoadedCriterion[]> {
  await ensureResumeReviewCriteriaSeeded();
  const rows = await prisma.resumeReviewCriterion.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    category: asCategory(r.category),
    title: r.title,
    description: r.description,
    howToCheck: r.howToCheck,
    weight: r.weight,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    sourceNote: r.sourceNote,
  }));
}

/** 관리용 전체 목록 */
export async function loadAllReviewCriteria(): Promise<LoadedCriterion[]> {
  await ensureResumeReviewCriteriaSeeded();
  const rows = await prisma.resumeReviewCriterion.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    category: asCategory(r.category),
    title: r.title,
    description: r.description,
    howToCheck: r.howToCheck,
    weight: r.weight,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    sourceNote: r.sourceNote,
  }));
}

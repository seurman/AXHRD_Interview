/**
 * 약점 드릴 자동 추천 — 최근 답변 6축 + 학습 패스 숙련도
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ANSWER_DIMENSION_KEYS,
  averageDimensions,
  findWeakestDimension,
  normalizeAnswerDimensions,
  type AnswerDimensionKey,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import { COMPETENCY_LEARNING_META } from "./catalog";

/** 6축 → 우선 연습 역량 */
const DIMENSION_TO_COMPETENCY: Record<AnswerDimensionKey, CompetencyCode> = {
  delivery: "COMMUNICATION",
  questionIntent: "COMMUNICATION",
  logic: "PROBLEM_SOLVING",
  outcomeQuantification: "PROBLEM_SOLVING",
  situationSpecificity: "JOB_FIT",
  individualOwnership: "LEADERSHIP",
};

export type WeaknessRecommendation = {
  competency: CompetencyCode;
  titleKo: string;
  dimension: AnswerDimensionKey | null;
  dimensionLabelKo: string | null;
  tip: string;
  prompt: string;
  sampleQuestion: string;
  source: "dimensions" | "mastery" | "default";
  href: string;
};

export async function recommendWeaknessDrill(
  userId: string,
): Promise<WeaknessRecommendation> {
  const [dimRec, masteryRec] = await Promise.all([
    recommendFromDimensions(userId),
    recommendFromMastery(userId),
  ]);

  if (dimRec) return dimRec;
  if (masteryRec) return masteryRec;
  return defaultRecommendation();
}

async function recommendFromDimensions(
  userId: string,
): Promise<WeaknessRecommendation | null> {
  const rows = await prisma.responseRecord.findMany({
    where: {
      session: { userId },
      dimensions: { not: Prisma.DbNull },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { dimensions: true },
  });

  const parsed: AnswerDimensions[] = [];
  for (const row of rows) {
    const d = normalizeAnswerDimensions(row.dimensions);
    if (d) parsed.push(d);
  }
  const avg = averageDimensions(parsed);
  if (!avg) return null;

  const dimension = findWeakestDimension(avg);
  if (avg[dimension] >= 0.75) return null; // 전반적으로 양호하면 숙련도 로직으로

  const competency = DIMENSION_TO_COMPETENCY[dimension];
  const meta = COMPETENCY_LEARNING_META[competency];
  const tip =
    meta.dimensionTips[dimension] ??
    `${dimensionLabel(dimension)} 축을 보강하세요.`;

  return {
    competency,
    titleKo: meta.title,
    dimension,
    dimensionLabelKo: dimensionLabel(dimension),
    tip,
    prompt: meta.weaknessPrompt,
    sampleQuestion: meta.sampleQuestion,
    source: "dimensions",
    href: `/practice/path/${competency.toLowerCase()}`,
  };
}

async function recommendFromMastery(
  userId: string,
): Promise<WeaknessRecommendation | null> {
  const rows = await prisma.learningPathProgress.findMany({
    where: { userId },
    orderBy: [{ masteryScore: "asc" }, { unlockedStage: "asc" }],
    take: 12,
  });
  if (rows.length === 0) return null;

  const weakest = rows[0];
  if (!COMPETENCY_CODES.includes(weakest.competency as CompetencyCode)) {
    return null;
  }
  const competency = weakest.competency as CompetencyCode;
  const meta = COMPETENCY_LEARNING_META[competency];
  return {
    competency,
    titleKo: meta.title,
    dimension: null,
    dimensionLabelKo: null,
    tip: `숙련 ${Math.round(weakest.masteryScore * 100)}% · stage ${weakest.unlockedStage} — 약점 드릴로 한 바퀴 더.`,
    prompt: meta.weaknessPrompt,
    sampleQuestion: meta.sampleQuestion,
    source: "mastery",
    href: `/practice/path/${competency.toLowerCase()}`,
  };
}

function defaultRecommendation(): WeaknessRecommendation {
  const competency: CompetencyCode = "COMMUNICATION";
  const meta = COMPETENCY_LEARNING_META[competency];
  return {
    competency,
    titleKo: meta.title,
    dimension: "delivery",
    dimensionLabelKo: dimensionLabel("delivery"),
    tip: meta.dimensionTips.delivery ?? meta.principle,
    prompt: meta.weaknessPrompt,
    sampleQuestion: meta.sampleQuestion,
    source: "default",
    href: `/practice/path/${competency.toLowerCase()}`,
  };
}

export function listDimensionKeys(): AnswerDimensionKey[] {
  return [...ANSWER_DIMENSION_KEYS];
}

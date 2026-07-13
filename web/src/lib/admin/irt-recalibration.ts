import { prisma } from "@/lib/prisma";
import { logAdminAudit, snapshotQuestion } from "@/lib/admin/audit";
import type { PlatformRole } from "@prisma/client";

export const IRT_RECAL_MIN_SAMPLE = 25;
export const IRT_BINARY_THRESHOLD = 0.55;

const MAX_ITER = 500;
const CONVERGENCE_TOL = 1e-5;
const LR_A = 0.01;
const LR_B = 0.05;

const A_MIN = 0.3;
const A_MAX = 3.0;
const B_MIN = -3.5;
const B_MAX = 3.5;

export type RecalibrationItemResult = {
  questionId: string;
  externalId: string;
  competencyCode: string;
  sampleSize: number;
  oldDifficulty: number;
  newDifficulty: number;
  oldDiscrimination: number;
  newDiscrimination: number;
  avgRubricScore: number;
  skipped: boolean;
  skipReason?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function probability2PL(a: number, b: number, theta: number): number {
  const z = a * (theta - b);
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

function fit2PL(
  points: Array<{ theta: number; u: number }>,
  initA: number,
  initB: number,
): { a: number; b: number } {
  let a = initA;
  let b = initB;
  const n = points.length;
  if (n === 0) return { a, b };

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let gradA = 0;
    let gradB = 0;

    for (const { theta, u } of points) {
      const p = probability2PL(a, b, theta);
      const diff = u - p;
      gradA += diff * (theta - b);
      gradB += diff * -a;
    }

    gradA /= n;
    gradB /= n;

    a += LR_A * gradA;
    b += LR_B * gradB;

    a = clamp(a, A_MIN, A_MAX);
    b = clamp(b, B_MIN, B_MAX);

    if (Math.abs(gradA) < CONVERGENCE_TOL && Math.abs(gradB) < CONVERGENCE_TOL) {
      break;
    }
  }

  return { a, b };
}

function applyChangeGuards(
  oldA: number,
  oldB: number,
  rawA: number,
  rawB: number,
): { a: number; b: number } {
  const a = clamp(clamp(rawA, oldA * 0.7, oldA * 1.4), A_MIN, A_MAX);
  const b = clamp(clamp(rawB, oldB - 0.5, oldB + 0.5), B_MIN, B_MAX);
  return { a, b };
}

function thetaKey(sessionId: string, competency: string): string {
  return `${sessionId}:${competency}`;
}

export async function computeIrtRecalibration(): Promise<RecalibrationItemResult[]> {
  const [responses, snapshots, questions] = await Promise.all([
    prisma.responseRecord.findMany({
      where: { isBonusQuestion: false, questionId: { not: null } },
      select: {
        questionId: true,
        sessionId: true,
        competency: true,
        rubricScore: true,
      },
    }),
    prisma.competencySnapshot.findMany({
      select: { sessionId: true, competency: true, theta: true },
    }),
    prisma.question.findMany({
      where: { isActive: true },
      select: {
        id: true,
        externalId: true,
        difficulty: true,
        discrimination: true,
        competency: { select: { code: true } },
      },
    }),
  ]);

  const thetaBySessionCompetency = new Map(
    snapshots.map((s) => [thetaKey(s.sessionId, s.competency), s.theta]),
  );

  const pointsByQuestion = new Map<string, Array<{ theta: number; u: number; rubricScore: number }>>();

  for (const r of responses) {
    if (!r.questionId) continue;
    const theta = thetaBySessionCompetency.get(thetaKey(r.sessionId, r.competency));
    if (theta == null) continue;

    const u = r.rubricScore >= IRT_BINARY_THRESHOLD ? 1 : 0;
    const list = pointsByQuestion.get(r.questionId) ?? [];
    list.push({ theta, u, rubricScore: r.rubricScore });
    pointsByQuestion.set(r.questionId, list);
  }

  return questions.map((q) => {
    const points = pointsByQuestion.get(q.id) ?? [];
    const sampleSize = points.length;
    const avgRubricScore =
      sampleSize > 0
        ? points.reduce((sum, p) => sum + p.rubricScore, 0) / sampleSize
        : 0;

    if (sampleSize < IRT_RECAL_MIN_SAMPLE) {
      return {
        questionId: q.id,
        externalId: q.externalId,
        competencyCode: q.competency.code,
        sampleSize,
        oldDifficulty: q.difficulty,
        newDifficulty: q.difficulty,
        oldDiscrimination: q.discrimination,
        newDiscrimination: q.discrimination,
        avgRubricScore,
        skipped: true,
        skipReason: `표본 부족(n=${sampleSize})`,
      };
    }

    const fitted = fit2PL(
      points.map((p) => ({ theta: p.theta, u: p.u })),
      q.discrimination,
      q.difficulty,
    );
    const guarded = applyChangeGuards(
      q.discrimination,
      q.difficulty,
      fitted.a,
      fitted.b,
    );

    return {
      questionId: q.id,
      externalId: q.externalId,
      competencyCode: q.competency.code,
      sampleSize,
      oldDifficulty: q.difficulty,
      newDifficulty: guarded.b,
      oldDiscrimination: q.discrimination,
      newDiscrimination: guarded.a,
      avgRubricScore,
      skipped: false,
    };
  });
}

export async function applyIrtRecalibration(
  results: RecalibrationItemResult[],
  actor: { id: string; email: string; platformRole: PlatformRole },
): Promise<{ appliedCount: number }> {
  let appliedCount = 0;

  for (const item of results) {
    if (item.skipped) continue;

    const existing = await prisma.question.findUnique({ where: { id: item.questionId } });
    if (!existing) continue;

    const before = snapshotQuestion(existing);
    const updated = await prisma.question.update({
      where: { id: item.questionId },
      data: {
        difficulty: item.newDifficulty,
        discrimination: item.newDiscrimination,
      },
    });

    await logAdminAudit({
      actor,
      action: "UPDATE",
      entityType: "question",
      entityId: item.questionId,
      summary: `IRT 재보정(자동): 응답 ${item.sampleSize}건 기반`,
      beforeState: before,
      afterState: snapshotQuestion(updated),
    });

    appliedCount += 1;
  }

  return { appliedCount };
}

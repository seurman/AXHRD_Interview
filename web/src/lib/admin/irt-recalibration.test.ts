import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  IRT_BINARY_THRESHOLD,
  IRT_RECAL_MIN_SAMPLE,
  computeIrtRecalibration,
  type RecalibrationItemResult,
} from "./irt-recalibration";

const prismaMock = vi.hoisted(() => ({
  responseRecord: { findMany: vi.fn() },
  competencySnapshot: { findMany: vi.fn() },
  question: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/admin/audit", () => ({
  logAdminAudit: vi.fn(),
  snapshotQuestion: vi.fn((q: { id: string }) => q),
}));

function makeQuestion(
  id: string,
  difficulty = 0,
  discrimination = 1,
) {
  return {
    id,
    externalId: `Q-${id}`,
    difficulty,
    discrimination,
    competency: { code: "TEST" },
  };
}

describe("irt-recalibration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses spec constants for binary threshold and minimum sample", () => {
    expect(IRT_BINARY_THRESHOLD).toBe(0.55);
    expect(IRT_RECAL_MIN_SAMPLE).toBe(25);
  });

  it("skips questions below MIN_SAMPLE_SIZE and keeps old parameters", async () => {
    const question = makeQuestion("q1", 0.5, 1.2);
    prismaMock.question.findMany.mockResolvedValue([question]);
    prismaMock.competencySnapshot.findMany.mockResolvedValue([
      { sessionId: "s1", competency: "TEST", theta: 0.2 },
    ]);
    prismaMock.responseRecord.findMany.mockResolvedValue(
      Array.from({ length: IRT_RECAL_MIN_SAMPLE - 1 }, (_, i) => ({
        questionId: "q1",
        sessionId: "s1",
        competency: "TEST",
        rubricScore: 0.8,
      })),
    );

    const results = await computeIrtRecalibration();
    expect(results).toHaveLength(1);
    expect(results[0].skipped).toBe(true);
    expect(results[0].skipReason).toBe(`표본 부족(n=${IRT_RECAL_MIN_SAMPLE - 1})`);
    expect(results[0].newDifficulty).toBe(results[0].oldDifficulty);
    expect(results[0].newDiscrimination).toBe(results[0].oldDiscrimination);
  });

  it("computes new parameters for sufficient sample and respects guardrails", async () => {
    const oldDifficulty = 0.5;
    const oldDiscrimination = 1.0;
    const question = makeQuestion("q2", oldDifficulty, oldDiscrimination);
    prismaMock.question.findMany.mockResolvedValue([question]);
    prismaMock.competencySnapshot.findMany.mockResolvedValue([
      { sessionId: "s1", competency: "TEST", theta: -1 },
      { sessionId: "s2", competency: "TEST", theta: 1 },
    ]);

    const responses = [];
    for (let i = 0; i < 30; i++) {
      responses.push({
        questionId: "q2",
        sessionId: i < 15 ? "s1" : "s2",
        competency: "TEST",
        rubricScore: i < 15 ? 0.2 : 0.9,
      });
    }
    prismaMock.responseRecord.findMany.mockResolvedValue(responses);

    const results = await computeIrtRecalibration();
    const item = results[0];
    expect(item.skipped).toBe(false);
    expect(item.sampleSize).toBe(30);

    expect(item.newDiscrimination).toBeGreaterThanOrEqual(0.3);
    expect(item.newDiscrimination).toBeLessThanOrEqual(3.0);
    expect(item.newDifficulty).toBeGreaterThanOrEqual(-3.5);
    expect(item.newDifficulty).toBeLessThanOrEqual(3.5);

    expect(item.newDifficulty).toBeGreaterThanOrEqual(oldDifficulty - 0.5);
    expect(item.newDifficulty).toBeLessThanOrEqual(oldDifficulty + 0.5);
    expect(item.newDiscrimination).toBeGreaterThanOrEqual(oldDiscrimination * 0.7);
    expect(item.newDiscrimination).toBeLessThanOrEqual(oldDiscrimination * 1.4);
  });

  it("dry-run path does not write to the database", async () => {
    prismaMock.question.findMany.mockResolvedValue([makeQuestion("q3")]);
    prismaMock.competencySnapshot.findMany.mockResolvedValue([]);
    prismaMock.responseRecord.findMany.mockResolvedValue([]);

    await computeIrtRecalibration();

    expect(prismaMock.question.update).not.toHaveBeenCalled();
  });
});

describe("irt-recalibration apply path", () => {
  it("applyIrtRecalibration updates only non-skipped items", async () => {
    const { applyIrtRecalibration } = await import("./irt-recalibration");
    const { logAdminAudit } = await import("@/lib/admin/audit");

    const results: RecalibrationItemResult[] = [
      {
        questionId: "skip",
        externalId: "S1",
        competencyCode: "TEST",
        sampleSize: 5,
        oldDifficulty: 0,
        newDifficulty: 0,
        oldDiscrimination: 1,
        newDiscrimination: 1,
        avgRubricScore: 0.5,
        skipped: true,
        skipReason: "표본 부족(n=5)",
      },
      {
        questionId: "apply",
        externalId: "A1",
        competencyCode: "TEST",
        sampleSize: 30,
        oldDifficulty: 0.5,
        newDifficulty: 0.2,
        oldDiscrimination: 1,
        newDiscrimination: 1.1,
        avgRubricScore: 0.7,
        skipped: false,
      },
    ];

    prismaMock.question.findUnique.mockResolvedValue({
      id: "apply",
      difficulty: 0.5,
      discrimination: 1,
    });
    prismaMock.question.update.mockResolvedValue({
      id: "apply",
      difficulty: 0.2,
      discrimination: 1.1,
    });

    const { appliedCount } = await applyIrtRecalibration(results, {
      id: "admin-1",
      email: "admin@test.com",
      platformRole: "SUPERADMIN",
    });

    expect(appliedCount).toBe(1);
    expect(prismaMock.question.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.question.update).toHaveBeenCalledWith({
      where: { id: "apply" },
      data: { difficulty: 0.2, discrimination: 1.1 },
    });
    expect(logAdminAudit).toHaveBeenCalledTimes(1);
    expect(logAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entityType: "question",
        entityId: "apply",
        summary: "IRT 재보정(자동): 응답 30건 기반",
      }),
    );
  });
});

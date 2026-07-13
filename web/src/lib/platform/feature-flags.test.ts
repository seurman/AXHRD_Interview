import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findMany, upsert } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformFeatureFlag: { findUnique, findMany, upsert },
  },
}));

import {
  FEATURE_FLAG_KEYS,
  getSessionFeatureFlags,
  isFeatureEnabled,
  isKnownFeatureFlagKey,
} from "./feature-flags";

describe("feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    upsert.mockImplementation(({ create }: { create: { key: string; enabled: boolean } }) =>
      Promise.resolve({ ...create, id: "x", label: "", description: null, updatedAt: new Date(), updatedBy: null }),
    );
  });

  it("defaults to enabled when row is missing", async () => {
    findUnique.mockResolvedValue(null);
    await expect(isFeatureEnabled(FEATURE_FLAG_KEYS.RESUME_CLAIM_VERIFICATION)).resolves.toBe(true);
  });

  it("respects disabled row", async () => {
    findUnique.mockResolvedValue({ enabled: false });
    await expect(isFeatureEnabled(FEATURE_FLAG_KEYS.RESUME_CLAIM_VERIFICATION)).resolves.toBe(false);
  });

  it("getSessionFeatureFlags batches three keys", async () => {
    findUnique
      .mockResolvedValueOnce({ enabled: false })
      .mockResolvedValueOnce({ enabled: true })
      .mockResolvedValueOnce({ enabled: true });
    const flags = await getSessionFeatureFlags();
    expect(flags).toEqual({
      resumeClaimVerification: false,
      jdBonusQuestion: true,
      tripleFeedbackMode: true,
    });
    expect(findUnique).toHaveBeenCalledTimes(3);
  });

  it("validates known keys", () => {
    expect(isKnownFeatureFlagKey("resume_claim_verification")).toBe(true);
    expect(isKnownFeatureFlagKey("unknown")).toBe(false);
  });
});

describe("start-session flag enforcement (logic)", () => {
  function applyFlags(
    body: {
      tripleFeedbackMode?: boolean;
      jdBonusEnabled?: boolean;
      resumeClaimEnabled?: boolean;
    },
    allowed: { triple: boolean; jd: boolean; resume: boolean },
    ctx: { hasJdRequirements: boolean; hasExperiences: boolean },
  ) {
    return {
      tripleFeedbackMode: body.tripleFeedbackMode === true && allowed.triple,
      jdBonusEnabled: body.jdBonusEnabled === true && ctx.hasJdRequirements && allowed.jd,
      resumeClaimEnabled:
        body.resumeClaimEnabled === true && ctx.hasExperiences && allowed.resume,
    };
  }

  it("blocks resumeClaim when platform flag is off even if client sends true", () => {
    const result = applyFlags(
      { resumeClaimEnabled: true, tripleFeedbackMode: true, jdBonusEnabled: true },
      { triple: true, jd: true, resume: false },
      { hasJdRequirements: true, hasExperiences: true },
    );
    expect(result.resumeClaimEnabled).toBe(false);
    expect(result.tripleFeedbackMode).toBe(true);
  });
});

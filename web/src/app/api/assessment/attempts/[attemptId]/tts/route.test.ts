import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentAttempt: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/gemini/tts", () => ({
  synthesizeSpeechWithMeta: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
}));

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { synthesizeSpeechWithMeta } from "@/lib/gemini/tts";
import { POST } from "./route";

describe("assessment TTS API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 204 without blocking when synthesis fails", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(prisma.assessmentAttempt.findUnique).mockResolvedValue({
      id: "a1",
      userId: "u1",
      status: "IN_PROGRESS",
      scenario: { kind: "ROLE_PLAY" },
    } as never);
    vi.mocked(synthesizeSpeechWithMeta).mockResolvedValue({
      audio: null,
      cacheHit: false,
    } as never);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ text: "안녕하세요" }),
      }),
      { params: Promise.resolve({ attemptId: "a1" }) },
    );

    expect(res.status).toBe(204);
  });

  it("rejects non-owners", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(prisma.assessmentAttempt.findUnique).mockResolvedValue({
      id: "a1",
      userId: "other",
      status: "IN_PROGRESS",
      scenario: { kind: "ROLE_PLAY" },
    } as never);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ text: "hi" }),
      }),
      { params: Promise.resolve({ attemptId: "a1" }) },
    );

    expect(res.status).toBe(404);
  });
});

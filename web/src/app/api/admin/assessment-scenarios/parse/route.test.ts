import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({
  requireProductionContentApi: vi.fn(),
  isAdminResponse: (v: unknown) => v instanceof Response,
  auditActor: () => ({ id: "admin1", email: "a@x.com" }),
}));

vi.mock("@/lib/admin/audit", () => ({
  logAdminAudit: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, retryAfterSec: 0 })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentTaskSource: {
      create: vi.fn(),
    },
  },
}));

import { requireProductionContentApi } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

describe("admin assessment-scenarios parse API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireProductionContentApi).mockResolvedValue({
      id: "admin1",
    } as never);
  });

  it("rejects empty sample text", async () => {
    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "   " }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("stores extracted text source for valid sample", async () => {
    vi.mocked(prisma.assessmentTaskSource.create).mockResolvedValue({
      id: "src1",
      fileName: "sample-task.txt",
      mimeType: "text/plain",
      extractedText: "역할연기 과제 원문입니다. 상대역과 대화하며 갈등 상황을 조율하는 평가를 진행합니다.",
      checksumSha256: "abc",
      byteSize: 80,
      createdAt: new Date("2026-07-20T00:00:00Z"),
    } as never);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "역할연기 과제 원문입니다. 상대역과 대화하며 갈등 상황을 조율하는 평가를 진행합니다.",
          fileName: "sample-task.txt",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { source?: { id: string } };
    expect(body.source?.id).toBe("src1");
    expect(prisma.assessmentTaskSource.create).toHaveBeenCalled();
  });
});

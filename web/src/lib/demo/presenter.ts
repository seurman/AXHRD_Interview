import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export {
  DEMO_PRESENTER_COOKIE,
  createDemoPresenterToken,
  verifyDemoPresenterToken,
} from "@/lib/demo/presenter-tokens";

const DEMO_PRESENTER_EMAIL = "demo-presenter@internal.axhrd";

export function generatePresenterKey(): string {
  return randomBytes(18).toString("base64url");
}

export async function ensureWorkspacePresenterKey(workspaceId: string): Promise<string> {
  const ws = await prisma.demoWorkspace.findUnique({
    where: { id: workspaceId },
    select: { presenterKey: true },
  });
  if (!ws) throw new Error("데모를 찾을 수 없습니다.");
  if (ws.presenterKey) return ws.presenterKey;

  for (let i = 0; i < 8; i++) {
    const presenterKey = generatePresenterKey();
    try {
      const updated = await prisma.demoWorkspace.update({
        where: { id: workspaceId },
        data: { presenterKey },
        select: { presenterKey: true },
      });
      return updated.presenterKey!;
    } catch {
      /* unique clash */
    }
  }
  throw new Error("시연 키를 생성하지 못했습니다.");
}

export async function validatePresenterKey(
  slug: string,
  key: string | null | undefined,
): Promise<{ workspaceId: string } | null> {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (!trimmed) return null;

  const ws = await prisma.demoWorkspace.findFirst({
    where: { slug, presenterKey: trimmed },
    select: { id: true },
  });
  return ws ? { workspaceId: ws.id } : null;
}

export async function getOrCreateDemoPresenterUser(): Promise<{
  id: string;
  organizationId: null;
}> {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_PRESENTER_EMAIL },
    select: { id: true },
  });
  if (existing) return { id: existing.id, organizationId: null };

  const created = await prisma.user.create({
    data: {
      email: DEMO_PRESENTER_EMAIL,
      name: "데모 시연",
      platformRole: "NONE",
    },
    select: { id: true },
  });
  return { id: created.id, organizationId: null };
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireSuperadminApi } from "@/lib/admin/auth";

export async function GET(req: Request) {
  const auth = await requireSuperadminApi();
  if (isAdminResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const actorOnly = searchParams.get("actorRole") === "ADMIN";

  const logs = await prisma.adminAuditLog.findMany({
    where: actorOnly
      ? { actorRole: { in: ["ADMIN", "CONTENT_ADMIN"] } }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}

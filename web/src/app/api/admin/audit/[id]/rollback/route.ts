import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireSuperadminApi } from "@/lib/admin/auth";
import { rollbackAdminAudit } from "@/lib/admin/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperadminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;

  try {
    const log = await rollbackAdminAudit(id, auth.id);
    return NextResponse.json({
      ok: true,
      rolledBackAt: log.rolledBackAt,
      message: "변경을 롤백했습니다.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "롤백 실패";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

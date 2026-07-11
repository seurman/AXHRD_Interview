import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadminApi } from "@/lib/admin/auth";

/** 권한 편집용 승인 기관 id·name만 반환 (가벼운 피커) */
export async function GET() {
  const user = await requireSuperadminApi();
  if (user instanceof NextResponse) return user;

  const organizations = await prisma.organization.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    { organizations },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}

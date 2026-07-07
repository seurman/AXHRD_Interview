import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireContentAdminApi } from "@/lib/admin/auth";

export async function POST(req: Request) {
  const auth = await requireContentAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { competencyId, level, rubricCriteria } = await req.json();
  if (!competencyId || !level || !Array.isArray(rubricCriteria)) {
    return NextResponse.json({ error: "competencyId, level, rubricCriteria 필요" }, { status: 400 });
  }

  const criteria = rubricCriteria.filter((c: unknown) => typeof c === "string" && c.trim());
  const result = await prisma.question.updateMany({
    where: { competencyId, level: Number(level) },
    data: { rubricCriteria: criteria as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, count: result.count });
}

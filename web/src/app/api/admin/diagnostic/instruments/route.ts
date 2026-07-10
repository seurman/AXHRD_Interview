import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticSuperadmin } from "@/lib/diagnostic/admin-access";

export async function GET() {
  const auth = await requireDiagnosticSuperadmin();
  if ("error" in auth && auth.error) return auth.error;

  const instruments = await prisma.diagnosticInstrument.findMany({
    include: {
      sections: { orderBy: { order: "asc" }, select: { id: true, code: true, nameKo: true, order: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json({
    instruments: instruments.map((i) => ({
      id: i.id,
      code: i.code,
      nameKo: i.nameKo,
      version: i.version,
      estimatedMinutes: i.estimatedMinutes,
      sections: i.sections,
    })),
  });
}

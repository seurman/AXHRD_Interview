import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireProductionContentApi } from "@/lib/admin/auth";
import { serializeCompetencyRow } from "@/lib/content/promote";

export async function GET(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "ORG";
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (scope !== "ORG") {
    return NextResponse.json({ error: "scope=ORG 만 지원합니다." }, { status: 400 });
  }

  const rows = await prisma.competency.findMany({
    where: {
      ownerScope: "ORG",
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { nameKo: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ organization: { name: "asc" } }, { code: "asc" }],
    include: {
      organization: { select: { name: true } },
      forkedFrom: { select: { code: true, nameKo: true, rubricByLevel: true } },
      _count: { select: { questions: true } },
    },
  });

  const grouped = new Map<string, ReturnType<typeof serializeCompetencyRow>[]>();
  for (const row of rows) {
    const key = row.organization?.name ?? row.organizationId ?? "unknown";
    const list = grouped.get(key) ?? [];
    list.push(serializeCompetencyRow(row));
    grouped.set(key, list);
  }

  return NextResponse.json({
    total: rows.length,
    groups: [...grouped.entries()].map(([organizationName, competencies]) => ({
      organizationName,
      competencies,
    })),
  });
}

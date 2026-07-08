import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const clusters = await prisma.globalCompetencyCluster.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      competencies: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          rubricLevels: { orderBy: { level: "asc" } },
          questions: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
          benchmarks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return NextResponse.json({ clusters });
}

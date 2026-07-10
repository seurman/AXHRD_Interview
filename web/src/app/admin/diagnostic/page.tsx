import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminDiagnosticCmsPanel } from "@/components/admin/AdminDiagnosticCmsPanel";

export const dynamic = "force-dynamic";

export default async function AdminDiagnosticPage() {
  await requireSuperadmin("/admin/diagnostic");

  let dbError: string | null = null;
  let instruments: Parameters<typeof AdminDiagnosticCmsPanel>[0]["instruments"] = [];
  let waveRows: Parameters<typeof AdminDiagnosticCmsPanel>[0]["waves"] = [];

  try {
    const [rawInstruments, waves] = await Promise.all([
      prisma.diagnosticInstrument.findMany({
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: {
              items: { select: { id: true } },
              subscales: {
                orderBy: { order: "asc" },
                include: { items: { select: { id: true } } },
              },
            },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.diagnosticWave.findMany({
        include: {
          organization: { select: { name: true } },
          _count: {
            select: {
              responses: { where: { submittedAt: { not: null } } },
              teams: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    instruments = rawInstruments.map((i) => ({
      id: i.id,
      code: i.code,
      nameKo: i.nameKo,
      version: i.version,
      estimatedMinutes: i.estimatedMinutes,
      sections: i.sections.map((sec) => ({
        code: sec.code,
        nameKo: sec.nameKo,
        itemCount: sec.items.length,
        subscales: sec.subscales.map((sub) => ({
          code: sub.code,
          nameKo: sub.nameKo,
          itemCount: sub.items.length,
        })),
      })),
    }));

    waveRows = waves.map((w) => ({
      id: w.id,
      waveNumber: w.waveNumber,
      label: w.label,
      status: w.status,
      organizationName: w.organization.name,
      teamCount: w._count.teams,
      responseCount: w._count.responses,
    }));
  } catch (e) {
    console.error("[admin/diagnostic]", e);
    dbError =
      e instanceof Error
        ? e.message
        : "진단 테이블을 읽지 못했습니다. 운영 DB에 migrate deploy가 필요할 수 있습니다.";
  }

  return (
    <AdminDiagnosticCmsPanel instruments={instruments} waves={waveRows} dbError={dbError} />
  );
}

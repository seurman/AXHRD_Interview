import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminDiagnosticCmsPanel } from "@/components/admin/AdminDiagnosticCmsPanel";

export const dynamic = "force-dynamic";

export default async function AdminDiagnosticPage() {
  await requireSuperadmin("/admin/diagnostic");

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

  const instruments = rawInstruments.map((i) => ({
    id: i.id,
    code: i.code,
    nameKo: i.nameKo,
    version: i.version,
    estimatedMinutes: i.estimatedMinutes,
    sections: i.sections.map((sec) => {
      const subItemIds = new Set(
        sec.subscales.flatMap((sub) => sub.items.map((it) => it.id)),
      );
      const directOnly = sec.items.filter((it) => !subItemIds.has(it.id));
      return {
        code: sec.code,
        nameKo: sec.nameKo,
        itemCount: sec.items.length,
        subscales: sec.subscales.map((sub) => ({
          code: sub.code,
          nameKo: sub.nameKo,
          itemCount: sub.items.length,
        })),
        directItemCount: directOnly.length,
      };
    }),
  }));

  const waveRows = waves.map((w) => ({
    id: w.id,
    waveNumber: w.waveNumber,
    label: w.label,
    status: w.status,
    organizationName: w.organization.name,
    teamCount: w._count.teams,
    responseCount: w._count.responses,
  }));

  return <AdminDiagnosticCmsPanel instruments={instruments} waves={waveRows} />;
}

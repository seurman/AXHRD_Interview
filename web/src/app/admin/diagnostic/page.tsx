import { requireDiagnosticConsoleViewer } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AdminDiagnosticCmsPanel } from "@/components/admin/AdminDiagnosticCmsPanel";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { parseEnabledSectionCodes, sectionBadgeLabel } from "@/lib/diagnostic/section-filter";
import { waveStatusLabel } from "@/lib/diagnostic/wave-status";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminDiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireDiagnosticConsoleViewer("/admin/diagnostic");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let dbError: string | null = null;
  let instruments: Parameters<typeof AdminDiagnosticCmsPanel>[0]["instruments"] = [];
  let waveRows: Parameters<typeof AdminDiagnosticCmsPanel>[0]["waves"] = [];
  let waveTotal = 0;

  try {
    const [rawInstruments, waves, count] = await Promise.all([
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
          instrument: { select: { nameKo: true } },
          _count: {
            select: {
              responses: { where: { submittedAt: { not: null } } },
              teams: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.diagnosticWave.count(),
    ]);

    waveTotal = count;

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

    waveRows = waves.map((w) => {
      const enabled = parseEnabledSectionCodes(w.enabledSectionCodes);
      return {
        id: w.id,
        waveNumber: w.waveNumber,
        label: w.label,
        statusLabel: waveStatusLabel(w.status),
        sectionBadge: sectionBadgeLabel(enabled),
        instrumentName: w.instrument.nameKo,
        organizationName: w.organization.name,
        opensAt: w.opensAt?.toISOString() ?? null,
        closesAt: w.closesAt?.toISOString() ?? null,
        teamCount: w._count.teams,
        responseCount: w._count.responses,
      };
    });
  } catch (e) {
    console.error("[admin/diagnostic]", e);
    dbError =
      e instanceof Error
        ? e.message
        : "진단 테이블을 읽지 못했습니다. 운영 DB에 migrate deploy가 필요할 수 있습니다.";
  }

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminDiagnosticCmsPanel
        instruments={instruments}
        waves={waveRows}
        dbError={dbError}
        wavePage={page}
        wavePageSize={PAGE_SIZE}
        waveTotal={waveTotal}
      />
    </div>
  );
}

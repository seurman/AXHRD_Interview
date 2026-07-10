import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDiagnosticPage() {
  await requireSuperadmin("/admin/diagnostic");

  const [instruments, waves] = await Promise.all([
    prisma.diagnosticInstrument.findMany({
      include: { _count: { select: { sections: true, waves: true } } },
      orderBy: { code: "asc" },
    }),
    prisma.diagnosticWave.findMany({
      include: {
        organization: { select: { name: true } },
        _count: { select: { responses: { where: { submittedAt: { not: null } } }, teams: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">조직진단 CMS</h1>
        <p className="mt-1 text-sm text-muted">ARC Index 문항뱅크·전 기관 웨이브 현황</p>
      </div>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold">진단 도구</h2>
        <ul className="space-y-2 text-sm">
          {instruments.map((i) => (
            <li key={i.id} className="flex justify-between border-b border-card-border py-2 last:border-0">
              <span>
                {i.nameKo} <span className="text-muted">({i.code} {i.version})</span>
              </span>
              <span className="text-muted">
                섹션 {i._count.sections} · 웨이브 {i._count.waves}
              </span>
            </li>
          ))}
        </ul>
        {instruments.length === 0 && (
          <p className="text-sm text-muted">
            시드 미실행 — <code>npx tsx prisma/seed/arc-index.ts</code>
          </p>
        )}
      </section>

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold">최근 웨이브 (50건)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-card-border text-xs text-muted">
                <th className="py-2 pr-4">기관</th>
                <th className="py-2 pr-4">Wave</th>
                <th className="py-2 pr-4">상태</th>
                <th className="py-2 pr-4">팀/제출</th>
                <th className="py-2">리포트</th>
              </tr>
            </thead>
            <tbody>
              {waves.map((w) => (
                <tr key={w.id} className="border-b border-card-border last:border-0">
                  <td className="py-2 pr-4">{w.organization.name}</td>
                  <td className="py-2 pr-4">
                    {w.waveNumber}
                    {w.label ? ` — ${w.label}` : ""}
                  </td>
                  <td className="py-2 pr-4 text-muted">{w.status}</td>
                  <td className="py-2 pr-4 text-muted">
                    {w._count.teams}팀 / {w._count.responses}건
                  </td>
                  <td className="py-2">
                    <Link href={`/org/diagnosis/waves/${w.id}`} className="text-accent hover:underline">
                      보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

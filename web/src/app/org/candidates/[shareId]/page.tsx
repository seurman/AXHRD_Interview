import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgCandidateScreening } from "@/lib/org/candidate-screening";
import { competencyLabel, jobRoleLabel } from "@/lib/labels";
import type { SessionReportData } from "@/types";

export const dynamic = "force-dynamic";

export default async function OrgCandidateListPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const orgUser = await requireOrgCandidateScreening("/org/candidates");
  const { shareId } = await params;

  const share = await prisma.orgInterviewKitShare.findUnique({
    where: { id: shareId },
  });

  if (!share || share.organizationId !== orgUser.organizationId) notFound();

  const sessions = await prisma.interviewSession.findMany({
    where: { orgKitShareId: shareId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      report: { select: { summaryJson: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/org/candidates" className="text-sm text-accent hover:underline">
          ← 지원자 결과
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{share.label}</h1>
        <p className="mt-1 text-sm text-muted">
          공유 링크 <span className="font-mono">/kit/{share.slug}</span>로 완료한 지원자입니다.
        </p>
      </div>

      <div className="card-luxe p-6">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">아직 완료된 지원자 면접이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">지원자</th>
                  <th className="py-2 pr-4 font-medium">이메일</th>
                  <th className="py-2 pr-4 font-medium">완료일</th>
                  <th className="py-2 pr-4 font-medium">역량</th>
                  <th className="py-2 pr-4 font-medium">종합 점수</th>
                  <th className="py-2 font-medium">리포트</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const report = s.report?.summaryJson as SessionReportData | undefined;
                  const avgScore = report
                    ? Math.round(
                        report.sections.reduce((sum, sec) => sum + (sec.score ?? 0), 0) /
                          Math.max(report.sections.length, 1),
                      )
                    : null;

                  return (
                    <tr key={s.id} className="border-b border-card-border last:border-0">
                      <td className="py-2 pr-4 text-foreground">{s.user.name}</td>
                      <td className="py-2 pr-4 text-muted">{s.user.email}</td>
                      <td className="py-2 pr-4 text-muted">
                        {s.completedAt
                          ? s.completedAt.toLocaleDateString("ko-KR")
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {s.focusCompetency ? competencyLabel(s.focusCompetency) : "—"}
                        {s.jobRole ? ` · ${jobRoleLabel(s.jobRole)}` : ""}
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {avgScore != null ? `${avgScore}점` : "—"}
                      </td>
                      <td className="py-2">
                        <Link
                          href={`/org/candidates/session/${s.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          리포트 보기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

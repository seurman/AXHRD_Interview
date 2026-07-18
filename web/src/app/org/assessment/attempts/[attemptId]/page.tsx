import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { resolveAssessmentShareAccess } from "@/lib/org/assessment-share";
import { parseEvidenceAssessmentReport } from "@/lib/assessment/evidence-report";
import { EvidenceReportView } from "@/components/assessment/EvidenceReportView";
import { PrintButton } from "@/components/ui/PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ attemptId: string }> };

/** 기관 담당자용 지원자 역량평가 리포트 — 우리 기관 배포 링크로 응시한 시도만 */
export default async function OrgAssessmentAttemptPage({ params }: Props) {
  const { attemptId } = await params;
  const user = await requirePageUser(`/org/assessment/attempts/${attemptId}`);
  const access = await resolveAssessmentShareAccess(user);
  if (!access.allowed) notFound();

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      orgShare: { select: { organizationId: true, label: true } },
      scenario: { select: { titleKo: true, kind: true } },
      user: { select: { name: true, email: true } },
      report: true,
    },
  });
  // 우리 기관 배포로 생성된 시도가 아니면 존재 자체를 숨긴다
  if (!attempt || attempt.orgShare?.organizationId !== access.organizationId) {
    notFound();
  }

  const report = attempt.report
    ? parseEvidenceAssessmentReport(attempt.report.reportJson)
    : null;
  const kindLabel = attempt.scenario.kind === "IN_BASKET" ? "서류함" : "역할연기";

  return (
    <div className="report-print-wrap print-root mx-auto max-w-3xl space-y-6 pb-16">
      <div className="print-hide flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/org/settings/assessment"
            className="text-sm text-accent hover:underline"
          >
            ← 배포 관리
          </Link>
          <p className="mt-3 text-sm font-medium text-accent">
            지원자 역량평가 리포트 · {attempt.orgShare?.label}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {attempt.user.name}
            <span className="ml-2 text-sm font-normal text-muted">
              {attempt.user.email}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            [{kindLabel}] {attempt.scenario.titleKo}
          </p>
        </div>
        <PrintButton />
      </div>

      <p className="print-hide rounded-xl bg-card px-4 py-3 text-xs leading-relaxed text-muted">
        이 리포트는 관찰된 행동 근거 기반의 AI 평정 결과입니다. 단일 과제 결과이므로
        채용·승진 판단의 유일한 근거가 아닌 참고 자료로 활용하시기 바랍니다.
      </p>

      {report ? (
        <EvidenceReportView report={report} />
      ) : (
        <p className="card-luxe p-6 text-sm text-muted">
          아직 리포트가 생성되지 않았습니다. (지원자 제출 후 자동 채점됩니다)
        </p>
      )}

      {attempt.transcript ? (
        <section className="card-luxe p-6">
          <h2 className="text-lg font-semibold text-foreground">수행 기록</h2>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {attempt.transcript}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

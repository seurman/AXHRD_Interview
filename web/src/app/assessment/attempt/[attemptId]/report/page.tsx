import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { parseEvidenceAssessmentReport } from "@/lib/assessment/evidence-report";
import { EvidenceReportView } from "@/components/assessment/EvidenceReportView";
import { RegradeButton } from "@/components/assessment/RegradeButton";
import { PrintButton } from "@/components/ui/PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ attemptId: string }> };

export default async function AssessmentReportPage({ params }: Props) {
  const { attemptId } = await params;
  const user = await requirePageUser(`/assessment/attempt/${attemptId}/report`);

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      scenario: {
        select: { titleKo: true, kind: true, roleContext: true, personaName: true },
      },
      report: true,
      itemResponses: {
        select: { itemId: true, actionType: true, responseText: true },
      },
    },
  });
  if (!attempt || attempt.userId !== user.id) notFound();

  const report = attempt.report
    ? parseEvidenceAssessmentReport(attempt.report.reportJson)
    : null;

  const kindLabel = attempt.scenario.kind === "IN_BASKET" ? "서류함" : "역할연기";

  return (
    <div className="report-print-wrap print-root mx-auto max-w-3xl space-y-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:pb-16">
      <div className="print-hide flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Link href="/assessment" className="text-sm text-accent hover:underline">
            ← 역량평가 홈
          </Link>
          <p className="mt-3 text-sm font-medium text-accent">{kindLabel} 과제 리포트</p>
          <h1 className="mt-1 text-xl font-bold leading-snug text-foreground sm:text-2xl">
            {attempt.scenario.titleKo}
          </h1>
        </div>
        <PrintButton />
      </div>

      {report ? (
        <>
          <EvidenceReportView report={report} />
          {attempt.status === "SUBMITTED" ? (
            <div className="card-luxe flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted">
                자동 채점이 완료되지 않아 임시 리포트가 표시되고 있습니다.
              </p>
              <RegradeButton attemptId={attempt.id} />
            </div>
          ) : null}
        </>
      ) : (
        <div className="card-luxe flex flex-wrap items-center justify-between gap-3 p-6">
          <p className="text-sm text-muted">
            아직 리포트가 생성되지 않았습니다. 채점을 다시 시도해 주세요.
          </p>
          <RegradeButton attemptId={attempt.id} />
        </div>
      )}

      {/* 수행 기록 원문 */}
      {attempt.scenario.kind === "ROLE_PLAY" && attempt.transcript ? (
        <section className="card-luxe p-6">
          <h2 className="text-lg font-semibold text-foreground">대화 기록</h2>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {attempt.transcript}
          </pre>
        </section>
      ) : null}

      {attempt.scenario.kind === "IN_BASKET" && attempt.itemResponses.length > 0 ? (
        <section className="card-luxe p-6">
          <h2 className="text-lg font-semibold text-foreground">내 처리 내용</h2>
          <MyInBasketResponses attemptId={attempt.id} />
        </section>
      ) : null}
    </div>
  );
}

async function MyInBasketResponses({ attemptId }: { attemptId: string }) {
  const responses = await prisma.assessmentItemResponse.findMany({
    where: { attemptId },
    include: {
      item: { select: { sortOrder: true, fromLabel: true, subject: true } },
    },
    orderBy: { item: { sortOrder: "asc" } },
  });

  const actionLabel: Record<string, string> = {
    REPLY: "직접 회신",
    DELEGATE: "위임",
    ESCALATE: "상부 보고",
    DEFER: "보류",
    FILE: "보관",
  };

  return (
    <ul className="mt-4 space-y-4">
      {responses.map((r) => (
        <li key={r.itemId} className="rounded-xl bg-card p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-foreground">
              {r.item.sortOrder}. {r.item.subject}
            </p>
            {r.actionType ? (
              <span className="rounded-full border border-card-border px-2.5 py-0.5 text-xs text-accent">
                {actionLabel[r.actionType] ?? r.actionType}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">보낸 사람: {r.item.fromLabel}</p>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-muted">
            {r.responseText}
          </p>
        </li>
      ))}
    </ul>
  );
}

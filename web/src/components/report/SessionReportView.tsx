import type { ReactNode } from "react";
import Link from "next/link";
import { CornerDownLeft } from "lucide-react";
import { competencyLabel } from "@/lib/utils";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { ReportCompetencyAnalysis } from "@/components/report/ReportCompetencyAnalysis";
import { BonusQuestionSection } from "@/components/report/BonusQuestionSection";
import { ClaimVerificationSection } from "@/components/report/ClaimVerificationSection";
import { Logo } from "@/components/brand/Logo";
import { PrintButton } from "@/components/ui/PrintButton";
import { SessionIntegrityNotice } from "@/components/interview/SessionIntegrityNotice";
import { NarrativeLead } from "@/components/dashboard/NarrativeLead";
import { buildSessionReportNarrative } from "@/lib/dashboard/career-narrative";
import { computeDeliveryStats } from "@/lib/interview/feedback-helpers";
import { parseEvidenceAssessmentReport } from "@/lib/assessment/evidence-report";
import { EvidenceReportView } from "@/components/assessment/EvidenceReportView";
import type { SessionReportData } from "@/types";
import type { Prisma } from "@prisma/client";

export type SessionReportInclude = Prisma.InterviewSessionGetPayload<{
  include: {
    report: true;
    targetCompany: true;
    resume: true;
    chipEvents: true;
    responses: { include: { question: true } };
  };
}>;

function formatReportDate(iso: Date | string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function SessionReportView({
  session,
  variant = "applicant",
  backHref,
  backLabel,
  afterTimeline,
}: {
  session: SessionReportInclude;
  variant?: "applicant" | "org";
  backHref?: string;
  backLabel?: string;
  afterTimeline?: ReactNode;
}) {
  const report = session.report?.summaryJson as SessionReportData | undefined;
  const evidence = parseEvidenceAssessmentReport(session.report?.evidenceJson);
  const avgScore = report
    ? Math.round(
        report.sections.reduce((s, sec) => s + (sec.score ?? 0), 0) /
          Math.max(report.sections.length, 1),
      )
    : 0;
  const bonusResponse = session.responses.find((r) => r.isBonusQuestion) ?? null;
  const claimResponse = session.responses.find((r) => r.isClaimVerification) ?? null;
  const delivery = computeDeliveryStats(
    session.responses
      .filter((r) => !r.isBonusQuestion && !r.isClaimVerification)
      .map((r) => ({
        answer: r.correctedTranscript ?? r.transcript,
        durationSec: r.durationSec,
      })),
  );

  const reportNarrative = report
    ? buildSessionReportNarrative({
        competency: session.focusCompetency,
        summary: report.summary,
        improvements: report.improvements,
        avgScore,
      })
    : null;

  return (
    <div className="report-print-wrap print-root mx-auto max-w-3xl space-y-8 pb-16">
      <div
        className="report-print-letterhead hidden print:mb-6 print:block"
        aria-hidden
      >
        <div className="flex items-center justify-between border-b-2 border-double border-gold/50 pb-4">
          <Logo size={28} color="var(--color-foreground)" variant="mono" />
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
              AXHRD Interview Report
            </p>
            <p className="mt-1 text-sm text-muted">
              발급일 {formatReportDate(session.completedAt ?? session.startedAt)}
            </p>
          </div>
        </div>
      </div>

      {variant === "org" && backHref && (
        <Link href={backHref} className="print-hide text-sm text-accent hover:underline">
          {backLabel ?? "← 지원자 목록"}
        </Link>
      )}

      <div className="print-hide flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">
            {variant === "org" ? "지원자 스크리닝 리포트" : `${session.sessionNumber}차 면접 리포트`}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {session.targetCompany?.name ?? "모의 면접"} 피드백
          </h1>
        </div>
        <PrintButton />
      </div>

      <SessionIntegrityNotice
        pasteDetected={session.pasteDetected}
        tabSwitchCount={session.tabSwitchCount}
      />

      {reportNarrative ? <NarrativeLead text={reportNarrative} label="리포트 한 줄" /> : null}

      {report ? (
        <>
          <section className="card-luxe flex flex-col items-center gap-6 border-double border-gold/40 p-6 sm:flex-row">
            <div className="flex w-full flex-col items-center gap-4 sm:w-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
                AXHRD Interview Report
              </p>
              <ScoreGauge value={avgScore} label="종합 점수" variant="gold" />
            </div>
            <p className="flex-1 text-center leading-relaxed text-foreground report-prose sm:text-left">
              {report.summary}
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <ListCard title="강점" items={report.strengths} color="text-success" />
            <ListCard title="개선점" items={report.improvements} color="text-warning" />
          </div>

          {(delivery.avgWpm !== null || delivery.fillerPer100Words !== null) && (
            <section className="card-luxe p-6">
              <h2 className="mb-4 font-semibold text-foreground">전달력</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs text-muted">평균 속도</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {delivery.avgWpm !== null ? `${delivery.avgWpm} 어절/분` : "데이터 부족"}
                  </p>
                </div>
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs text-muted">습관어 사용</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {delivery.fillerPer100Words !== null
                      ? `100어절당 ${delivery.fillerPer100Words}회`
                      : "데이터 부족"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted report-prose">{delivery.note}</p>
            </section>
          )}

          <ReportCompetencyAnalysis sections={report.sections} />

          {evidence ? <EvidenceReportView report={evidence} /> : null}

          <BonusQuestionSection response={bonusResponse} />

          <ClaimVerificationSection response={claimResponse} />

          <section className="rounded-2xl border border-gold-light/60 bg-gold-light/10 p-6">
            <h2 className="mb-3 font-semibold text-foreground">다음 단계</h2>
            <ul className="space-y-2">
              {report.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground report-prose">
                  <span className="font-medium text-accent">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-muted">리포트 생성 중이거나 세션이 미완료입니다.</p>
      )}

      <section className="card-luxe p-6">
        <h2 className="mb-4 font-semibold text-foreground">세션 타임라인</h2>
        <div className="flex flex-wrap gap-2">
          {session.chipEvents.map((e, i) => (
            <span
              key={i}
              className="relative inline-flex items-center rounded-full border border-card-border bg-card px-3 py-1 text-xs text-muted"
            >
              {e.chipType === "PASS" ? "♩" : e.chipType === "DOWNGRADE" ? "♭" : "♪"}{" "}
              L{e.level} {competencyLabel(e.competency)}
              {e.hadFollowUp ? (
                <CornerDownLeft
                  className="ml-1 inline h-3 w-3 text-accent"
                  aria-label="꼬리질문 포함"
                />
              ) : null}
            </span>
          ))}
        </div>
      </section>

      {afterTimeline}

      {variant === "applicant" && (
        <div className="print-hide flex gap-4">
          <Link href="/dashboard" className="btn-primary">
            역량 트래킹
          </Link>
          <Link href="/interview/setup" className="btn-secondary">
            다음 차수 면접
          </Link>
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="card-luxe p-5">
      <h3 className={`mb-3 font-medium ${color}`}>{title}</h3>
      <ul className="space-y-2 text-sm text-muted report-prose">
        {items.map((item, i) => (
          <li key={i}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}

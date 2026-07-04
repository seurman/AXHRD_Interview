import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { competencyLabel } from "@/lib/utils";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { computeDeliveryStats } from "@/lib/interview/feedback-helpers";
import type { SessionReportData } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  const user = await requirePageUser(`/interview/${sessionId}/report`);

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      report: true,
      targetCompany: true,
      chipEvents: { orderBy: { sequence: "asc" } },
      responses: { include: { question: true } },
    },
  });

  if (!session) notFound();
  assertResourceOwner(session.userId, user.id);

  const report = session.report?.summaryJson as SessionReportData | undefined;
  const avgScore = report
    ? Math.round(
        report.sections.reduce((s, sec) => s + (sec.score ?? 0), 0) /
          Math.max(report.sections.length, 1)
      )
    : 0;
  const delivery = computeDeliveryStats(
    session.responses.map((r) => ({
      answer: r.correctedTranscript ?? r.transcript,
      durationSec: r.durationSec,
    }))
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div>
        <p className="text-sm font-medium text-accent">{session.sessionNumber}차 면접 리포트</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {session.targetCompany?.name ?? "모의 면접"} 피드백
        </h1>
      </div>

      {report ? (
        <>
          <section className="card-luxe flex flex-col items-center gap-6 p-6 sm:flex-row">
            <ScoreGauge value={avgScore} label="종합 점수" />
            <p className="flex-1 text-center leading-relaxed text-foreground sm:text-left">
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
              <p className="mt-3 text-sm text-muted">{delivery.note}</p>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-semibold text-foreground">역량별 분석</h2>
            {report.sections.map((s) => (
              <div key={s.title} className="card-luxe p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-foreground">
                    {competencyLabel(s.title) !== s.title
                      ? competencyLabel(s.title)
                      : s.title}
                  </h3>
                  {s.score != null && (
                    <span className="text-sm font-medium text-accent">{s.score}%</span>
                  )}
                </div>
                <p className="text-sm text-muted">{s.content}</p>
                {s.highlight && (
                  <p className="mt-3 border-l-2 border-gold pl-3 text-sm italic text-foreground">
                    “{s.highlight}”
                  </p>
                )}
                {s.suggestions && (
                  <ul className="mt-3 list-inside list-disc text-xs text-muted">
                    {s.suggestions.map((sg, i) => (
                      <li key={i}>{sg}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-gold-light/60 bg-gold-light/10 p-6">
            <h2 className="mb-3 font-semibold text-foreground">다음 단계</h2>
            <ul className="space-y-2">
              {report.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground">
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

      {/* Chip timeline */}
      <section>
        <h2 className="mb-4 font-semibold text-foreground">세션 타임라인</h2>
        <div className="flex flex-wrap gap-2">
          {session.chipEvents.map((e, i) => (
            <span
              key={i}
              className="rounded-full border border-card-border bg-card px-3 py-1 text-xs text-muted"
            >
              {e.chipType === "PASS" ? "♩" : e.chipType === "DOWNGRADE" ? "♭" : "♪"}{" "}
              L{e.level} {competencyLabel(e.competency)}
            </span>
          ))}
        </div>
      </section>

      <div className="flex gap-4">
        <Link href="/dashboard" className="btn-primary">
          역량 트래킹
        </Link>
        <Link href="/interview/setup" className="btn-secondary">
          다음 차수 면접
        </Link>
      </div>
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
      <ul className="space-y-2 text-sm text-muted">
        {items.map((item, i) => (
          <li key={i}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}

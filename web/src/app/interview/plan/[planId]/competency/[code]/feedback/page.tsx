import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { competencyLabel, dimensionLabel, formatPercentile } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { computeDeliveryStats } from "@/lib/interview/feedback-helpers";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ planId: string; code: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function CompetencyFeedbackPage({
  params,
  searchParams,
}: PageProps) {
  const { planId, code } = await params;
  const { sessionId } = await searchParams;
  const user = await requirePageUser(
    `/interview/plan/${planId}/competency/${code}/feedback`
  );

  const progress = await prisma.competencyProgress.findUnique({
    where: { planId_competency: { planId, competency: code } },
    include: {
      feedback: true,
      plan: {
        include: {
          competencyProgress: true,
          user: true,
        },
      },
    },
  });

  if (!progress?.feedback) notFound();
  assertResourceOwner(progress.plan.userId, user.id);

  const fb = progress.feedback;
  const dimensions = fb.dimensions as Record<string, number> | null;
  const strengths = fb.strengths as string[];
  const improvements = fb.improvements as string[];
  const suggestions = fb.suggestions as string[];
  const highlights = (fb.highlights as Array<{ quote: string; note: string }> | null) ?? [];
  const rewriteExample = fb.rewriteExample;

  const session = await prisma.interviewSession.findUnique({
    where: { id: fb.sessionId },
    include: { responses: true },
  });
  const delivery = computeDeliveryStats(
    (session?.responses ?? []).map((r) => ({
      answer: r.correctedTranscript ?? r.transcript,
      durationSec: r.durationSec,
    }))
  );

  const next = COMPETENCY_CODES.find((c) => {
    const row = progress.plan.competencyProgress.find((p) => p.competency === c);
    return row && row.status !== "COMPLETED";
  });

  const doneCount = progress.plan.competencyProgress.filter(
    (p) => p.status === "COMPLETED"
  ).length;

  const heroScore = Math.round(progress.percentile ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <div>
        <p className="text-sm font-medium text-accent">
          {user.name} · {doneCount}/{COMPETENCY_CODES.length} 역량 완료
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {competencyLabel(code)} 피드백
        </h1>
      </div>

      <section className="card-luxe flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center">
        <ScoreGauge value={heroScore} />
        <div className="flex-1 text-center sm:text-left">
          {progress.percentile != null && (
            <p className="text-sm text-muted">
              추정 레벨 <span className="font-semibold text-foreground">L{progress.levelEst}</span>
              {" · "}
              {formatPercentile(progress.percentile)}
            </p>
          )}
          <p className="mt-2 leading-relaxed text-foreground">{fb.summary}</p>
        </div>
      </section>

      {dimensions && (
        <section className="card-luxe p-6">
          <h2 className="mb-4 font-semibold text-foreground">세부 역량</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(dimensions).map(([key, val]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{dimensionLabel(key)}</span>
                  <span className="font-medium text-foreground">{val}</span>
                </div>
                <div className="h-2 rounded-full bg-background">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {highlights.length > 0 && (
        <section className="card-luxe p-6">
          <h2 className="mb-4 font-semibold text-foreground">답변 하이라이트</h2>
          <div className="space-y-4">
            {highlights.map((h, i) => (
              <div key={i} className="border-l-2 border-gold pl-4">
                <p className="italic leading-relaxed text-foreground">“{h.quote}”</p>
                <p className="mt-1 text-sm text-muted">{h.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {rewriteExample && (
        <section className="rounded-2xl border border-gold-light/60 bg-gold-light/10 p-6">
          <h2 className="mb-2 font-semibold text-foreground">이렇게 답변해보면 어떨까요?</h2>
          <p className="leading-relaxed text-foreground">{rewriteExample}</p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <h3 className="mb-2 font-medium text-success">강점</h3>
          <ul className="space-y-1 text-sm text-foreground">
            {strengths.map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
          <h3 className="mb-2 font-medium text-warning">개선점</h3>
          <ul className="space-y-1 text-sm text-foreground">
            {improvements.map((s) => (
              <li key={s}>↑ {s}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card-luxe p-5">
        <h3 className="mb-2 font-medium text-foreground">다음 연습</h3>
        <ul className="space-y-1 text-sm text-muted">
          {suggestions.map((s) => (
            <li key={s}>→ {s}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        {next ? (
          <Link
            href={`/interview/setup?planId=${planId}&competency=${next}`}
            className="btn-primary"
          >
            다음 역량: {competencyLabel(next)} →
          </Link>
        ) : (
          <Link href={`/interview/plan/${planId}`} className="btn-primary">
            전체 결과 보기
          </Link>
        )}
        {sessionId && (
          <Link href={`/interview/${sessionId}`} className="btn-secondary">
            세션 상세
          </Link>
        )}
        <Link href="/dashboard" className="btn-secondary">
          대시보드
        </Link>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { competencyLabel, dimensionLabel, formatPercentile } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { BonusQuestionSection } from "@/components/report/BonusQuestionSection";
import { ClaimVerificationSection } from "@/components/report/ClaimVerificationSection";
import { computeDeliveryStats } from "@/lib/interview/feedback-helpers";
import { NextCompetencyButton } from "@/components/interview/NextCompetencyButton";
import { RoundBriefPanel } from "@/components/interview/RoundBriefPanel";
import { FeedbackShareControls } from "@/components/interview/FeedbackShareControls";
import {
  findWeakestDimension,
  normalizeAnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import {
  filterQueueByProgress,
  parseCompetencyQueue,
  type RoundBrief,
} from "@/lib/interview/competency-round";

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
  const asStringList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : typeof value === "string" && value.trim()
        ? [value.trim()]
        : [];
  const strengths = asStringList(fb.strengths);
  const improvements = asStringList(fb.improvements);
  const suggestions = asStringList(fb.suggestions);
  const highlights = Array.isArray(fb.highlights)
    ? (fb.highlights as Array<{ quote: string; note: string; type?: "strength" | "growth" }>).filter(
        (h) => h && typeof h.quote === "string" && typeof h.note === "string",
      )
    : [];
  const rewriteExample = fb.rewriteExample;
  const personaAlignmentNote = fb.personaAlignmentNote;

  const session = await prisma.interviewSession.findUnique({
    where: { id: fb.sessionId },
    include: {
      responses: true,
      targetCompany: true,
      resume: true,
    },
  });
  const bonusResponse = session?.responses.find((r) => r.isBonusQuestion) ?? null;
  const claimResponse = session?.responses.find((r) => r.isClaimVerification) ?? null;
  const delivery = computeDeliveryStats(
    (session?.responses ?? [])
      .filter((r) => !r.isBonusQuestion && !r.isClaimVerification)
      .map((r) => ({
      answer: r.correctedTranscript ?? r.transcript,
      durationSec: r.durationSec,
    }))
  );

  const roundCodes = parseCompetencyQueue(progress.plan.roundCompetencyCodes);
  const queue = filterQueueByProgress(
    parseCompetencyQueue(progress.plan.queuedCompetencyCodes),
    progress.plan.competencyProgress,
  );
  const roundDone =
    roundCodes.length > 0 &&
    roundCodes.every((c) => {
      const row = progress.plan.competencyProgress.find((p) => p.competency === c);
      return row?.status === "COMPLETED";
    });
  const roundBrief = progress.plan.roundBrief as RoundBrief | null;
  const roundDoneCount =
    roundCodes.length > 0
      ? roundCodes.filter((c) => {
          const row = progress.plan.competencyProgress.find((p) => p.competency === c);
          return row?.status === "COMPLETED";
        }).length
      : 0;

  const doneCount = progress.plan.competencyProgress.filter(
    (p) => p.status === "COMPLETED"
  ).length;

  const heroScore = Math.round(progress.percentile ?? 0);

  const dimsForWeak =
    dimensions && Object.values(dimensions).some((v) => typeof v === "number" && v > 1)
      ? Object.fromEntries(
          Object.entries(dimensions).map(([k, v]) => [k, (v as number) / 100]),
        )
      : dimensions;
  const normalizedDims = normalizeAnswerDimensions(dimsForWeak);
  const weakestAxis = normalizedDims ? findWeakestDimension(normalizedDims) : null;
  const groundingBits: string[] = [];
  if (session?.resume?.rawText) groundingBits.push("자소서 맞춤 질문이 반영되었습니다");
  if (bonusResponse) groundingBits.push("공고 맞춤 보너스 질문까지 확인했습니다");
  if (claimResponse) groundingBits.push("자소서 경험 확인 질문을 마쳤습니다");
  if (session?.targetCompany?.name) {
    groundingBits.push(`${session.targetCompany.name} 맥락으로 진행했습니다`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">
            {user.name} ·{" "}
            {roundCodes.length > 0
              ? `이번 차수 ${roundDoneCount}/${roundCodes.length} 역량`
              : `${doneCount}/${COMPETENCY_CODES.length} 역량 완료`}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {competencyLabel(code)} 피드백
          </h1>
        </div>
        <FeedbackShareControls />
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
          {groundingBits.length > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-accent">
              {groundingBits.join(" · ")}
            </p>
          ) : null}
        </div>
      </section>

      {weakestAxis ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-sm text-foreground">
            약한 답변 축: <strong>{dimensionLabel(weakestAxis)}</strong>
          </p>
          <Link
            href={`/interview/setup?planId=${planId}&competency=${code}`}
            className="btn-primary px-3 py-1.5 text-sm"
          >
            이 역량 다시 연습
          </Link>
        </div>
      ) : null}

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
              <div
                key={i}
                className={`border-l-2 pl-4 ${h.type === "growth" ? "border-rose-400" : "border-gold"}`}
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                  {h.type === "growth" ? "개선 근거" : "강점 근거"}
                </p>
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

      {personaAlignmentNote && (
        <section className="band-periwinkle rounded-2xl p-6">
          <h2 className="mb-2 font-semibold">🎭 페르소나답게 답변했나요?</h2>
          <p className="leading-relaxed">{personaAlignmentNote}</p>
          <p className="mt-2 text-xs opacity-80">참고용 코칭이며 점수에는 반영되지 않아요.</p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <h3 className="mb-2 font-medium text-success">강점</h3>
          <ul className="space-y-1 text-sm text-foreground">
            {(strengths.length > 0 ? strengths : ["이번 세션에서 확인된 강점을 더 쌓아 보세요."]).map(
              (s) => (
              <li key={s}>✓ {s}</li>
              ),
            )}
          </ul>
        </section>
        <section className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
          <h3 className="mb-2 font-medium text-warning">개선점</h3>
          <ul className="space-y-1 text-sm text-foreground">
            {(improvements.length > 0
              ? improvements
              : ["다음 답변에서 수치·본인 행동·결과를 한 문장씩 더 넣어 보세요."]
            ).map((s) => (
              <li key={s}>↑ {s}</li>
            ))}
          </ul>
        </section>
      </div>

      <BonusQuestionSection response={bonusResponse} />

      <ClaimVerificationSection response={claimResponse} />

      <section className="card-luxe p-5">
        <h3 className="mb-2 font-medium text-foreground">다음 연습</h3>
        <ul className="space-y-1 text-sm text-muted">
          {(suggestions.length > 0
            ? suggestions
            : ["같은 역량을 한 번 더 연습하며 STAR로 90초 안에 말해 보세요."]
          ).map((s) => (
            <li key={s}>→ {s}</li>
          ))}
        </ul>
      </section>

      {roundDone && roundBrief && <RoundBriefPanel brief={roundBrief} />}

      <div className="flex flex-wrap gap-3 print-hide">
        {queue.length > 0 ? (
          <NextCompetencyButton
            planId={planId}
            queue={queue}
            industry={session?.targetCompany?.industryCode ?? undefined}
            companySize={session?.targetCompany?.size ?? undefined}
            companyName={session?.targetCompany?.name ?? undefined}
            jobRole={session?.jobRole}
            resumeText={session?.resume?.rawText}
            resumeFileName={session?.resume?.fileName}
            timeBudgetMinutes={progress.plan.timeBudgetMinutes ?? session?.timeBudgetMinutes}
            prepMode={progress.plan.prepMode ?? undefined}
          />
        ) : roundDone ? (
          <Link href={`/interview/plan/${planId}`} className="btn-primary">
            차수 결과 보기
          </Link>
        ) : (
          <Link href={`/interview/plan/${planId}`} className="btn-primary">
            전체 결과 보기
          </Link>
        )}
        {sessionId && (
          <Link href={`/interview/${sessionId}/report?stay=1`} className="btn-secondary">
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

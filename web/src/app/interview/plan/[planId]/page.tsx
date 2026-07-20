import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { competencyLabel, dimensionLabel, formatPercentile } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";
import { RoundBriefPanel } from "@/components/interview/RoundBriefPanel";
import { RoundCompetencyRadar } from "@/components/interview/RoundCompetencyRadar";
import { FeedbackShareControls } from "@/components/interview/FeedbackShareControls";
import {
  findWeakestDimension,
  normalizeAnswerDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import {
  parseCompetencyQueue,
  type RoundBrief,
} from "@/lib/interview/competency-round";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default async function PlanOverviewPage({ params }: PageProps) {
  const { planId } = await params;
  const user = await requirePageUser(`/interview/plan/${planId}`);

  const plan = await prisma.interviewPlan.findUnique({
    where: { id: planId },
    include: {
      targetCompany: true,
      competencyProgress: {
        include: { feedback: true },
        orderBy: { competency: "asc" },
      },
    },
  });

  if (!plan) notFound();
  assertResourceOwner(plan.userId, user.id);

  const done = plan.competencyProgress.filter((p) => p.status === "COMPLETED");
  const roundCodes = parseCompetencyQueue(plan.roundCompetencyCodes);
  const roundBrief = plan.roundBrief as RoundBrief | null;
  const roundDone =
    roundCodes.length > 0 &&
    roundCodes.every((c) => {
      const row = plan.competencyProgress.find((p) => p.competency === c);
      return row?.status === "COMPLETED";
    });

  const radarPoints = (roundCodes.length > 0 ? roundCodes : done.map((d) => d.competency))
    .map((code) => {
      const row = plan.competencyProgress.find((p) => p.competency === code);
      if (!row || row.status !== "COMPLETED" || row.percentile == null) return null;
      return {
        competency: code,
        label: competencyLabel(code),
        percentile: row.percentile,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // 최근 완료 피드백들의 6축 평균 → 약한 축 CTA
  const dimHistory: AnswerDimensions[] = [];
  for (const row of done) {
    const raw = row.feedback?.dimensions as Record<string, number> | null;
    const scaled =
      raw && Object.values(raw).some((v) => typeof v === "number" && v > 1)
        ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / 100]))
        : raw;
    const dims = normalizeAnswerDimensions(scaled);
    if (dims) dimHistory.push(dims);
  }
  let weakAxis: string | null = null;
  if (dimHistory.length > 0) {
    const avg = Object.fromEntries(
      (Object.keys(dimHistory[0]) as (keyof AnswerDimensions)[]).map((k) => [
        k,
        dimHistory.reduce((s, d) => s + d[k], 0) / dimHistory.length,
      ]),
    ) as AnswerDimensions;
    weakAxis = dimensionLabel(findWeakestDimension(avg));
  }

  const weakestCompetency = [...done]
    .filter((d) => d.percentile != null)
    .sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100))[0]?.competency;

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">면접 플랜 진행 현황</h1>
          <p className="mt-2 text-muted">
            {user.name} · {plan.targetCompany?.name ?? "회사 미지정"} ·{" "}
            {done.length}/{COMPETENCY_CODES.length} 역량 완료
            {roundCodes.length > 0
              ? ` · 이번 차수 ${roundCodes.filter((c) => done.some((d) => d.competency === c)).length}/${roundCodes.length}`
              : ""}
          </p>
        </div>
        {(roundDone || radarPoints.length >= 2) && <FeedbackShareControls label="차수 요약 링크 복사" />}
      </div>

      {(roundDone || radarPoints.length >= 2) && (
        <section className="card-luxe space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              차수 종합
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-outfit)] text-lg font-bold text-foreground">
              역량 분포
            </h2>
          </div>
          <RoundCompetencyRadar points={radarPoints} />
          {weakAxis || weakestCompetency ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5">
              <p className="text-xs text-foreground">
                {weakAxis ? (
                  <>
                    약한 답변 축: <strong>{weakAxis}</strong>
                  </>
                ) : null}
                {weakestCompetency ? (
                  <>
                    {weakAxis ? " · " : null}
                    낮은 역량: <strong>{competencyLabel(weakestCompetency)}</strong>
                  </>
                ) : null}
              </p>
              {weakestCompetency ? (
                <Link
                  href={`/interview/setup?planId=${planId}&competency=${weakestCompetency}`}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  이 역량 다시 연습
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      {roundDone && roundBrief ? <RoundBriefPanel brief={roundBrief} /> : null}

      <div className="space-y-3">
        {COMPETENCY_CODES.map((code) => {
          const row = plan.competencyProgress.find((p) => p.competency === code);
          const status = row?.status ?? "NOT_STARTED";
          return (
            <div
              key={code}
              className="card-luxe flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-foreground">{competencyLabel(code)}</p>
                <p className="text-xs text-muted">
                  {status === "COMPLETED"
                    ? `L${row?.levelEst} · ${row?.percentile != null ? formatPercentile(row.percentile) : ""}`
                    : status === "IN_PROGRESS"
                      ? "진행 중"
                      : "미시작"}
                </p>
              </div>
              {status === "COMPLETED" && row?.feedback ? (
                <Link
                  href={`/interview/plan/${planId}/competency/${code}/feedback`}
                  className="text-sm text-primary hover:underline"
                >
                  피드백 →
                </Link>
              ) : status !== "COMPLETED" ? (
                <Link
                  href={`/interview/setup?planId=${planId}&competency=${code}`}
                  className="text-sm text-accent hover:underline"
                >
                  시작 →
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <Link href="/interview/setup" className="btn-primary inline-block text-sm">
        새 역량 면접 시작
      </Link>
    </div>
  );
}

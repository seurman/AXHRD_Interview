import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import { Reveal } from "@/components/ui/Reveal";

export const dynamic = "force-dynamic";

type ParagraphFeedback = { quote: string; issue: string; suggestion: string };
type ImprovementItem = { gapLabel: string; suggestion: string };
type JdMatch = { matchScore: number | null; matched: string[]; missing: string[] };

export default async function ResumeReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProductCapability("product.resume_review", "/resume-review");
  const user = await requirePageUser();
  const { id } = await params;

  const review = await prisma.resumeReview.findUnique({
    where: { id },
    include: {
      targetCompany: { select: { name: true } },
    },
  });

  if (!review) notFound();
  assertResourceOwner(review.userId, user.id);

  const paragraphFeedback = review.paragraphFeedback as ParagraphFeedback[];
  const jdMatch = review.jdMatch as JdMatch;
  const improvementPlan = review.improvementPlan as ImprovementItem[];
  const suggested = Array.isArray(review.suggestedCompetencies)
    ? (review.suggestedCompetencies as string[])
    : [];
  const primaryCompetency = suggested[0] ?? "COMMUNICATION";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <Link href="/resume-review" className="text-sm text-accent hover:underline">
          ← 자소서 첨삭
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">자소서 첨삭 리포트</h1>
        <p className="mt-1 text-xs text-muted">
          {review.createdAt.toLocaleString("ko-KR")}
          {review.targetCompany?.name ? ` · ${review.targetCompany.name}` : ""}
        </p>
      </div>

      <Reveal>
        <section className="card-luxe p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                review.matchSource === "jd"
                  ? "bg-accent/15 text-accent"
                  : "bg-gold/15 text-gold"
              }`}
            >
              {review.matchSource === "jd" ? "공고(JD) 기준" : "산업·직무 일반 기준"}
            </span>
          </div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">총평</h2>
          <p className="leading-relaxed text-muted">{review.overallSummary}</p>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section className="card-luxe space-y-4 p-6">
          <h2 className="font-semibold text-foreground">문단별 첨삭</h2>
          {paragraphFeedback.map((p, i) => (
            <article
              key={`${p.quote.slice(0, 24)}-${i}`}
              className="rounded-xl border border-card-border bg-background/40 p-4 text-sm"
            >
              <p className="text-xs font-semibold text-gold">원문 인용</p>
              <p className="mt-1 leading-relaxed text-foreground">「{p.quote}」</p>
              <p className="mt-3 text-xs font-semibold text-warning">지적</p>
              <p className="mt-1 text-muted">{p.issue}</p>
              <p className="mt-3 text-xs font-semibold text-accent">제안</p>
              <p className="mt-1 text-muted">{p.suggestion}</p>
            </article>
          ))}
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="card-luxe space-y-4 p-6">
          <h2 className="font-semibold text-foreground">매칭표</h2>
          {jdMatch.matchScore != null ? (
            <p className="text-3xl font-bold text-foreground">{jdMatch.matchScore}%</p>
          ) : (
            <p className="text-sm text-muted">비교할 공고 키워드가 없어 매칭률을 계산하지 않았습니다.</p>
          )}
          {jdMatch.matched.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-success">매칭됨</p>
              <div className="flex flex-wrap gap-2">
                {jdMatch.matched.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs text-success"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          {jdMatch.missing.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-warning">부족</p>
              <div className="flex flex-wrap gap-2">
                {jdMatch.missing.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs text-warning"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="card-luxe space-y-3 p-6">
          <h2 className="font-semibold text-foreground">보완 방안</h2>
          <ul className="space-y-3">
            {improvementPlan.map((item) => (
              <li
                key={item.gapLabel}
                className="rounded-xl border border-card-border bg-background/40 p-4 text-sm"
              >
                <p className="font-medium text-foreground">{item.gapLabel}</p>
                <p className="mt-1 leading-relaxed text-muted">{item.suggestion}</p>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Link
        href={`/interview/setup?competency=${encodeURIComponent(primaryCompetency)}`}
        className="btn-primary flex w-full justify-center py-3.5"
      >
        {competencyLabel(primaryCompetency)} 역량으로 면접 시작하기
      </Link>
    </div>
  );
}

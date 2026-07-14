import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { prisma } from "@/lib/prisma";
import {
  ResumeReviewReport,
  type CriterionResultView,
  type DimensionScoreView,
  type ImprovementItem,
  type JdMatch,
  type ParagraphFeedback,
} from "@/components/resume-review/ResumeReviewReport";
import { Reveal } from "@/components/ui/Reveal";

export const dynamic = "force-dynamic";

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
  const dimensionScores = review.dimensionScores as DimensionScoreView[] | null;
  const criteriaResults = review.criteriaResults as CriterionResultView[] | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <Link href="/resume-review" className="text-sm text-accent hover:underline">
          ← 자소서 첨삭
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-foreground">자소서 첨삭 리포트</h1>
        <p className="mt-1 text-sm text-muted">
          형식·논리, 산업 역량, STAR·BEI 기준과 비교한 강점·부족·수정안을 확인하고, 추천
          역량으로 모의면접을 이어갈 수 있습니다.
        </p>
      </div>

      <Reveal>
        <ResumeReviewReport
          overallSummary={review.overallSummary}
          matchSource={review.matchSource}
          paragraphFeedback={paragraphFeedback}
          jdMatch={jdMatch}
          improvementPlan={improvementPlan}
          suggestedCompetencies={suggested}
          companyName={review.targetCompany?.name}
          createdAt={review.createdAt}
          dimensionScores={dimensionScores}
          criteriaResults={criteriaResults}
          narrativeSource={review.narrativeSource}
          narrativeModel={review.narrativeModel}
        />
      </Reveal>
    </div>
  );
}

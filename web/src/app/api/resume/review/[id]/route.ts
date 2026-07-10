import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertResourceOwner } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const review = await prisma.resumeReview.findUnique({
    where: { id },
    include: {
      resume: { select: { fileName: true } },
      targetCompany: { select: { name: true } },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  assertResourceOwner(review.userId, user.id);

  return NextResponse.json({
    id: review.id,
    matchSource: review.matchSource,
    overallSummary: review.overallSummary,
    paragraphFeedback: review.paragraphFeedback,
    jdMatch: review.jdMatch,
    improvementPlan: review.improvementPlan,
    suggestedCompetencies: review.suggestedCompetencies,
    createdAt: review.createdAt.toISOString(),
    resumeFileName: review.resume.fileName,
    targetCompanyName: review.targetCompany?.name ?? null,
  });
}

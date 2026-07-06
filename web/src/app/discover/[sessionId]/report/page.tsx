import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { DiscoverReportView } from "@/components/discover/DiscoverReportView";
import type { DiscoverProfileData } from "@/types/discover";

export const dynamic = "force-dynamic";

export default async function DiscoverReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requirePageUser(`/discover/${sessionId}/report`);

  const session = await prisma.selfDiscoverySession.findUnique({
    where: { id: sessionId },
    include: { profile: true },
  });

  if (!session) notFound();
  assertResourceOwner(session.userId, user.id);

  if (!session.profile) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-muted">리포트를 생성 중이거나 아직 완료되지 않았습니다.</p>
        <a href={`/discover/${sessionId}`} className="mt-4 inline-block text-primary hover:underline">
          인터뷰로 돌아가기
        </a>
      </div>
    );
  }

  const profile: DiscoverProfileData = {
    strengths: session.profile.strengths as unknown as DiscoverProfileData["strengths"],
    weaknesses: session.profile.weaknesses as unknown as DiscoverProfileData["weaknesses"],
    values: session.profile.values as unknown as DiscoverProfileData["values"],
    competencySignals: session.profile.competencySignals as unknown as DiscoverProfileData["competencySignals"],
    narrativeSummary: session.profile.narrativeSummary,
  };

  return (
    <DiscoverReportView
      profile={profile}
      completedAt={session.completedAt?.toISOString()}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { SessionReportView } from "@/components/report/SessionReportView";
import { AssessmentResultsSummary } from "@/components/assessment/AssessmentResultsSummary";
import { NextCompetencyButton } from "@/components/interview/NextCompetencyButton";
import {
  filterQueueByProgress,
  parseCompetencyQueue,
} from "@/lib/interview/competency-round";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ queue?: string }>;
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const { queue: queueParam } = await searchParams;
  const user = await requirePageUser(`/interview/${sessionId}/report`);

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      report: true,
      targetCompany: true,
      resume: true,
      chipEvents: { orderBy: { sequence: "asc" } },
      responses: { include: { question: true } },
      plan: { include: { competencyProgress: true } },
    },
  });

  if (!session) notFound();
  assertResourceOwner(session.userId, user.id);

  let queue = queueParam ? queueParam.split(",").filter(Boolean) : [];
  if (queue.length === 0 && session.plan) {
    queue = filterQueueByProgress(
      parseCompetencyQueue(session.plan.queuedCompetencyCodes),
      session.plan.competencyProgress,
    );
  }

  return (
    <>
      <SessionReportView
      session={session}
      variant="applicant"
      afterTimeline={
        queue.length > 0 && session.planId ? (
          <NextCompetencyButton
            planId={session.planId}
            queue={queue}
            industry={session.targetCompany?.industryCode ?? undefined}
            companySize={session.targetCompany?.size ?? undefined}
            companyName={session.targetCompany?.name ?? undefined}
            jobRole={session.jobRole}
            resumeText={session.resume?.rawText}
            resumeFileName={session.resume?.fileName}
            timeBudgetMinutes={session.plan?.timeBudgetMinutes ?? session.timeBudgetMinutes}
            prepMode={session.plan?.prepMode ?? undefined}
          />
        ) : undefined
      }
      />
      <div className="mx-auto mt-8 max-w-3xl pb-16">
        <AssessmentResultsSummary userId={user.id} />
      </div>
    </>
  );
}

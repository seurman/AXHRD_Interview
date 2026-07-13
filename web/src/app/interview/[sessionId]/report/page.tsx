import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { SessionReportView } from "@/components/report/SessionReportView";
import { NextCompetencyButton } from "@/components/interview/NextCompetencyButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ queue?: string }>;
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const { queue: queueParam } = await searchParams;
  const queue = queueParam ? queueParam.split(",").filter(Boolean) : [];
  const user = await requirePageUser(`/interview/${sessionId}/report`);

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      report: true,
      targetCompany: true,
      resume: true,
      chipEvents: { orderBy: { sequence: "asc" } },
      responses: { include: { question: true } },
    },
  });

  if (!session) notFound();
  assertResourceOwner(session.userId, user.id);

  return (
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
          />
        ) : undefined
      }
    />
  );
}

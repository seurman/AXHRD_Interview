import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { isOrgAdminUser, isOrgStaffUser, isSuperAdminUser } from "@/lib/auth/roles";
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

async function canOrgStaffViewSessionReport(
  viewer: {
    id: string;
    organizationId?: string | null;
    orgRole?: string;
    email: string;
    platformRole?: string;
  },
  ownerUserId: string,
): Promise<boolean> {
  if (viewer.id === ownerUserId) return true;
  if (isSuperAdminUser(viewer)) return true;
  if (!viewer.organizationId || !(isOrgAdminUser(viewer) || isOrgStaffUser(viewer))) {
    return false;
  }
  const owner = await prisma.user.findUnique({
    where: { id: ownerUserId },
    select: { organizationId: true, orgCoachingConsent: true },
  });
  return (
    !!owner &&
    owner.organizationId === viewer.organizationId &&
    owner.orgCoachingConsent === true
  );
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

  const allowed = await canOrgStaffViewSessionReport(user, session.userId);
  if (!allowed) {
    assertResourceOwner(session.userId, user.id);
  }

  const isOwner = user.id === session.userId;

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
        variant={isOwner ? "applicant" : "org"}
        afterTimeline={
          isOwner && queue.length > 0 && session.planId ? (
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
      {isOwner ? (
        <div className="mx-auto mt-8 max-w-3xl pb-16">
          <AssessmentResultsSummary userId={user.id} />
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-3xl pb-16">
          <p className="text-center text-sm text-muted">
            코칭 동의 하에 열람 중인 구성원 리포트입니다.{" "}
            <a href={`/org/people/${session.userId}`} className="text-accent hover:underline">
              구성원 프로필로 돌아가기
            </a>
          </p>
        </div>
      )}
    </>
  );
}

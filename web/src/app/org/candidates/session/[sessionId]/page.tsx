import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveOrgCandidateScreening } from "@/lib/org/candidate-screening";
import { OrgCandidateScreeningGate } from "@/components/org/OrgCandidateScreeningGate";
import { SessionReportView } from "@/components/report/SessionReportView";

export const dynamic = "force-dynamic";

const sessionReportInclude = {
  report: true,
  targetCompany: true,
  resume: true,
  chipEvents: { orderBy: { sequence: "asc" as const } },
  responses: { include: { question: true } },
} as const;

export default async function OrgCandidateReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const ctx = await resolveOrgCandidateScreening("/org/candidates");
  if (!ctx.competencyEnabled) {
    return <OrgCandidateScreeningGate organizationName={ctx.organizationName} />;
  }
  const orgUser = ctx.user;
  const { sessionId } = await params;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: sessionReportInclude,
  });

  if (!session) notFound();
  const belongsToOrg =
    session.kitOrganizationId === orgUser.organizationId ||
    (session.orgKitShareId &&
      (await prisma.orgInterviewKitShare.findFirst({
        where: { id: session.orgKitShareId, organizationId: orgUser.organizationId },
        select: { id: true },
      })));
  if (!belongsToOrg) notFound();
  if (session.status !== "COMPLETED") notFound();

  const backHref = session.orgKitShareId
    ? `/org/candidates/${session.orgKitShareId}`
    : "/org/candidates";

  return (
    <SessionReportView
      session={session}
      variant="org"
      backHref={backHref}
      backLabel="← 지원자 목록"
    />
  );
}

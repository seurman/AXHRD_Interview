import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgCandidateScreening } from "@/lib/org/candidate-screening";
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
  const orgUser = await requireOrgCandidateScreening("/org/candidates");
  const { sessionId } = await params;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: sessionReportInclude,
  });

  if (!session || session.kitOrganizationId !== orgUser.organizationId) notFound();
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

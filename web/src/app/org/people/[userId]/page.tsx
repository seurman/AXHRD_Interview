import { notFound } from "next/navigation";
import { requireOrgStaff } from "@/lib/auth/guards";
import { getOrgMemberPeopleDetail } from "@/lib/org/people-dashboard";
import { redactPeopleDetailForConsent } from "@/lib/org/people-consent";
import { OrgMemberPeopleDetailClient } from "@/components/org/OrgMemberPeopleDetailClient";

export const dynamic = "force-dynamic";

export default async function OrgPeopleMemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const staff = await requireOrgStaff("/org/people");
  const { userId } = await params;
  const detail = await getOrgMemberPeopleDetail(staff.organizationId, userId);
  if (!detail) notFound();

  const payload = redactPeopleDetailForConsent(detail);

  return (
    <OrgMemberPeopleDetailClient
      initial={payload}
      canWriteFeedback={staff.orgRole === "ADMIN" || staff.orgRole === "STAFF"}
    />
  );
}

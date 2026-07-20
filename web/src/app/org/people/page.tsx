import { requireOrgStaff } from "@/lib/auth/guards";
import { getOrgPeopleDashboard } from "@/lib/org/people-dashboard";
import { OrgPeopleDashboardClient } from "@/components/org/OrgPeopleDashboardClient";

export const dynamic = "force-dynamic";

export default async function OrgPeoplePage() {
  const user = await requireOrgStaff("/org/people");
  const data = await getOrgPeopleDashboard(user.organizationId);
  if (!data) {
    return <p className="text-muted">기관 정보를 찾을 수 없습니다.</p>;
  }
  return <OrgPeopleDashboardClient data={data} />;
}

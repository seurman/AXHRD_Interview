import { requireOrgStaff } from "@/lib/auth/guards";
import { isOrgAdminUser } from "@/lib/auth/roles";
import { OrgMembersPanel } from "@/components/org/OrgMembersPanel";

export const dynamic = "force-dynamic";

export default async function OrgMembersPage() {
  const user = await requireOrgStaff("/org/members");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Members</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">멤버 · 승인</h1>
        <p className="mt-2 text-sm text-muted">
          가입 요청을 승인하면 좌석이 배정되어 인별 과금 대상이 됩니다. 대기 요청은 좌석을
          예약합니다.
        </p>
      </div>
      <OrgMembersPanel isAdmin={isOrgAdminUser(user)} />
    </div>
  );
}

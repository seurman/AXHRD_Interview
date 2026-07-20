import { redirect } from "next/navigation";

/** 레거시 멤버·승인 → 통합 콘솔 승인·좌석 탭 */
export default function OrgMembersRedirectPage() {
  redirect("/org/dashboard?tab=members");
}

import { redirect } from "next/navigation";

/** 레거시 구성원 현황 → 통합 콘솔 구성원 탭 */
export default function OrgPeopleRedirectPage() {
  redirect("/org/dashboard?tab=people");
}

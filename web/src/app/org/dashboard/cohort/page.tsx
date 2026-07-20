import { redirect } from "next/navigation";

/** 레거시 참여 현황 → 통합 콘솔 개요 */
export default function OrgCohortRedirectPage() {
  redirect("/org/dashboard");
}

import { redirect } from "next/navigation";

/** 이전 경로 호환 */
export default function LegacyInterviewKitRedirect() {
  redirect("/org/saas/settings/interview-kit");
}

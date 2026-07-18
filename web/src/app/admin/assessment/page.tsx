import { redirect } from "next/navigation";

/** 짧은 관리자 진입점 → 평가 과제 스튜디오 */
export default function AdminAssessmentAliasPage() {
  redirect("/admin/content/assessment");
}

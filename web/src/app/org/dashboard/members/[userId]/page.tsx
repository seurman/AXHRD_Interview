import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** 레거시 코칭 뷰 → 구성원 현황 상세로 통합 */
export default async function OrgMemberDetailRedirect({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(`/org/people/${userId}`);
}

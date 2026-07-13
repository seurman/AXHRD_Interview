import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { RecentActivityPanel } from "@/components/dashboard/RecentActivityPanel";
import { getRecentActivityItems } from "@/lib/dashboard/get-recent-activity";

export const dynamic = "force-dynamic";

/** 홈 미리보기와 달리 전체 활동 이력을 보여준다 — 개수 제한은 넉넉하게. */
const ACTIVITY_PAGE_LIMIT = 60;

export default async function DashboardActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard/activity");

  const activityItems = await getRecentActivityItems(user.id, ACTIVITY_PAGE_LIMIT);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          홈으로
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">내 활동</h1>
        <p className="mt-1 text-muted">완료한 모의면접·자기발견 인터뷰·자소서 첨삭 전체 이력입니다.</p>
      </div>

      <RecentActivityPanel items={activityItems} />
    </div>
  );
}

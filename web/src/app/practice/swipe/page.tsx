import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SwipeDeck } from "@/components/practice/SwipeDeck";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/practice/swipe");

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">질문 카드</h1>
        <p className="mt-2 text-sm text-muted">
          내가 고른 직무의 실제 기출 질문을 넘겨보세요 · 왼쪽 Pass, 오른쪽 Save
        </p>
      </div>
      <SwipeDeck
        initialIndustry={user.profile?.desiredIndustry ?? null}
        initialJobRole={user.profile?.desiredJobRole ?? null}
      />
    </div>
  );
}

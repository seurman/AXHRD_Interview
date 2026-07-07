import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SwipeDeck } from "@/components/practice/SwipeDeck";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/practice/swipe");

  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-8 text-center">
        <p className="section-eyebrow">Question Deck</p>
        <h1 className="mt-3 text-3xl font-bold text-foreground">질문 카드</h1>
        <p className="mt-2 text-sm text-muted">
          스와이프로 실전 질문에 익숙해지세요 · 왼쪽 Pass · 오른쪽 Save
        </p>
      </header>
      <SwipeDeck
        initialIndustry={user.profile?.desiredIndustry ?? null}
        initialJobRole={user.profile?.desiredJobRole ?? null}
      />
    </div>
  );
}

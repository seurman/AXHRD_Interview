import { requireProductCapability } from "@/lib/platform/page-guards";
import { SwipeDeck } from "@/components/practice/SwipeDeck";
import { SwipePageHeader } from "@/components/practice/SwipePageHeader";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const user = await requireProductCapability("product.practice", "/practice/swipe");

  return (
    <div className="mx-auto max-w-lg">
      <SwipePageHeader />
      <SwipeDeck
        initialIndustry={user.profile?.desiredIndustry ?? null}
        initialJobRole={user.profile?.desiredJobRole ?? null}
      />
    </div>
  );
}

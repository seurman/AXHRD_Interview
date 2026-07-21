import { requireProductCapability } from "@/lib/platform/page-guards";
import { SwipeDeck } from "@/components/practice/SwipeDeck";
import { SwipePageHeader } from "@/components/practice/SwipePageHeader";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

export const dynamic = "force-dynamic";

type Ctx = { searchParams: Promise<{ competency?: string }> };

export default async function SwipePage({ searchParams }: Ctx) {
  const user = await requireProductCapability("product.practice", "/practice/swipe");
  const params = await searchParams;
  const raw = params.competency?.toUpperCase() ?? "";
  const focusCompetency = COMPETENCY_CODES.includes(raw as CompetencyCode)
    ? (raw as CompetencyCode)
    : null;

  return (
    <div className="mx-auto max-w-lg">
      <SwipePageHeader focusCompetency={focusCompetency} />
      <SwipeDeck
        initialIndustry={user.profile?.desiredIndustry ?? null}
        initialJobRole={user.profile?.desiredJobRole ?? null}
        focusCompetency={focusCompetency}
      />
    </div>
  );
}

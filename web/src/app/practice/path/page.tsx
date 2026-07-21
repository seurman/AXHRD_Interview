import { requireProductCapability } from "@/lib/platform/page-guards";
import { getUsageSummary } from "@/lib/billing/usage";
import {
  listPathOverview,
  resolveUserTrack,
  type PathCompetencySummary,
} from "@/lib/learning/path";
import {
  recommendWeaknessDrill,
  type WeaknessRecommendation,
} from "@/lib/learning/weakness";
import { LearningPathOverview } from "@/components/practice/LearningPathOverview";

export const dynamic = "force-dynamic";

export default async function LearningPathPage() {
  const user = await requireProductCapability("product.practice", "/practice/path");
  const track = await resolveUserTrack(user.id);
  const [competencies, usage, weakness] = await Promise.all([
    listPathOverview(user.id, track),
    getUsageSummary(user.id),
    recommendWeaknessDrill(user.id),
  ]);

  const recommendation = pickRecommendation(competencies, weakness);

  return (
    <LearningPathOverview
      initialTrack={track}
      competencies={competencies}
      recommendation={recommendation}
      weakness={weakness}
      dailyDrills={usage.dailyDrills}
      mockInterviews={usage.mockInterviews}
    />
  );
}

function pickRecommendation(
  overview: PathCompetencySummary[],
  weakness: WeaknessRecommendation,
): PathCompetencySummary | null {
  const sorted = [...overview].sort((a, b) => {
    if (a.competency === weakness.competency) return -1;
    if (b.competency === weakness.competency) return 1;
    if (Boolean(a.nextLesson) !== Boolean(b.nextLesson)) {
      return a.nextLesson ? -1 : 1;
    }
    return a.masteryScore - b.masteryScore;
  });
  return (
    sorted.find((c) => c.competency === weakness.competency) ??
    sorted.find((c) => c.nextLesson) ??
    sorted[0] ??
    null
  );
}

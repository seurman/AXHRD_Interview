import { requireProductCapability } from "@/lib/platform/page-guards";
import { getUsageSummary } from "@/lib/billing/usage";
import {
  listPathOverview,
  resolveUserTrack,
  type PathCompetencySummary,
} from "@/lib/learning/path";
import { LearningPathOverview } from "@/components/practice/LearningPathOverview";

export const dynamic = "force-dynamic";

export default async function LearningPathPage() {
  const user = await requireProductCapability("product.practice", "/practice/path");
  const track = await resolveUserTrack(user.id);
  const [competencies, usage] = await Promise.all([
    listPathOverview(user.id, track),
    getUsageSummary(user.id),
  ]);

  const recommendation = pickRecommendation(competencies);

  return (
    <LearningPathOverview
      initialTrack={track}
      competencies={competencies}
      recommendation={recommendation}
      dailyDrills={usage.dailyDrills}
      mockInterviews={usage.mockInterviews}
    />
  );
}

function pickRecommendation(
  overview: PathCompetencySummary[],
): PathCompetencySummary | null {
  const sorted = [...overview].sort((a, b) => {
    if (Boolean(a.nextLesson) !== Boolean(b.nextLesson)) {
      return a.nextLesson ? -1 : 1;
    }
    return a.masteryScore - b.masteryScore;
  });
  return sorted.find((c) => c.nextLesson) ?? sorted[0] ?? null;
}

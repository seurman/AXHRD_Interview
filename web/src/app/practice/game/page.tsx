import { requireProductCapability } from "@/lib/platform/page-guards";
import { GameCourseList } from "@/components/competency-game/GameCourseList";
import { listCourseSummaries } from "@/lib/competency-game/progress";

export const dynamic = "force-dynamic";

export default async function CompetencyGameHomePage() {
  const user = await requireProductCapability(
    "product.practice",
    "/practice/game",
  );
  const courses = await listCourseSummaries(user.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <GameCourseList courses={courses} />
    </main>
  );
}

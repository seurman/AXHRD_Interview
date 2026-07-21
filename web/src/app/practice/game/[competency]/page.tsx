import { notFound } from "next/navigation";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { GamePathMap } from "@/components/competency-game/GamePathMap";
import { getGameCourse } from "@/lib/competency-game/catalog";
import { getCourseProgressView } from "@/lib/competency-game/progress";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

export const dynamic = "force-dynamic";

const COMPETENCY_SET = new Set<string>(COMPETENCY_CODES);

type Props = { params: Promise<{ competency: string }> };

export default async function CompetencyGamePathPage({ params }: Props) {
  const { competency: raw } = await params;
  const competency = raw?.toUpperCase();

  if (!competency || !COMPETENCY_SET.has(competency)) notFound();

  const user = await requireProductCapability(
    "product.practice",
    `/practice/game/${competency.toLowerCase()}`,
  );

  const course = getGameCourse(competency as CompetencyCode);
  if (!course) notFound();

  const view = await getCourseProgressView(user.id, competency as CompetencyCode);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <GamePathMap view={view} />
    </main>
  );
}

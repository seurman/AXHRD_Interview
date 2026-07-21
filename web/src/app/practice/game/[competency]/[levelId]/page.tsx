import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { GameLevelRunner } from "@/components/competency-game/GameLevelRunner";
import { findGameLevel } from "@/lib/competency-game/catalog";
import { isCourseLevelUnlocked } from "@/lib/competency-game/engine";
import { selectAdaptiveItems } from "@/lib/competency-game/irt-game";
import { getOrCreateGameProgress } from "@/lib/competency-game/progress";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

export const dynamic = "force-dynamic";

const COMPETENCY_SET = new Set<string>(COMPETENCY_CODES);

type Props = {
  params: Promise<{ competency: string; levelId: string }>;
};

export default async function CompetencyGameLevelPage({ params }: Props) {
  const { competency: raw, levelId } = await params;
  const competency = raw?.toUpperCase();

  if (!competency || !COMPETENCY_SET.has(competency) || !levelId) notFound();

  const user = await requireProductCapability(
    "product.practice",
    `/practice/game/${competency.toLowerCase()}/${encodeURIComponent(levelId)}`,
  );

  const found = findGameLevel(levelId);
  if (!found || found.course.competency !== competency) notFound();

  const progress = await getOrCreateGameProgress(
    user.id,
    competency as CompetencyCode,
  );
  const cleared = new Set(
    Array.isArray(progress.clearedLevelIds)
      ? (progress.clearedLevelIds as string[])
      : [],
  );
  const unlocked = isCourseLevelUnlocked(found.course, levelId, cleared);

  if (!unlocked) {
    redirect(`/practice/game/${competency.toLowerCase()}`);
  }

  const theta = progress.theta ?? 0;
  const adaptiveItems = selectAdaptiveItems(
    found.level,
    competency,
    theta,
    Math.min(3, found.level.items.length),
  );
  const playLevel = { ...found.level, items: adaptiveItems };

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={`/practice/game/${competency.toLowerCase()}`}
          className="text-sm font-medium text-accent hover:underline"
        >
          ← 패스 맵
        </Link>
      </div>

      <GameLevelRunner
        competency={competency}
        level={playLevel}
        hearts={progress.hearts}
        theta={theta}
      />
    </main>
  );
}

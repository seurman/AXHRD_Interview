import { notFound } from "next/navigation";
import { requireProductCapability } from "@/lib/platform/page-guards";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import { competencyLabel } from "@/lib/labels";
import {
  getCompetencyPathDetail,
  resolveUserTrack,
} from "@/lib/learning/path";
import { CompetencyPathDetail } from "@/components/practice/CompetencyPathDetail";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ competency: string }> };

export default async function CompetencyPathPage({ params }: Ctx) {
  const user = await requireProductCapability(
    "product.practice",
    "/practice/path",
  );
  const { competency: raw } = await params;
  const competency = raw?.toUpperCase() as CompetencyCode;
  if (!COMPETENCY_CODES.includes(competency)) notFound();

  const track = await resolveUserTrack(user.id);
  const detail = await getCompetencyPathDetail(user.id, competency, track);

  return (
    <CompetencyPathDetail
      detail={{
        ...detail,
        titleKo: competencyLabel(competency),
      }}
    />
  );
}

import { prisma } from "@/lib/prisma";
import { ratingScaleFromAnchors } from "@/lib/assessment/evidence-report";
import type { RatingScaleRow } from "@/types/evidence-assessment";

export type EvidenceFrameworkIndicator = {
  code: string;
  polarity: "POSITIVE" | "NEGATIVE_OR_MISSING";
  textKo: string;
};

export type EvidenceFrameworkSubskill = {
  code: string;
  nameKo: string;
  definition: string;
  indicators: EvidenceFrameworkIndicator[];
};

export type EvidenceFramework = {
  code: string;
  nameKo: string;
  definition: string;
  subskills: EvidenceFrameworkSubskill[];
};

export type InterviewEvidenceContext = {
  ratingScale: RatingScaleRow[];
  frameworks: EvidenceFramework[];
};

/**
 * INTERVIEW 도메인 평정척도 + 지정 역량들의 하위역량/행동지표(look-for)를 로드.
 * 프롬프트 주입과 UI 참조표에 함께 사용.
 */
export async function loadInterviewEvidenceContext(
  competencyCodes: string[],
): Promise<InterviewEvidenceContext> {
  const uniqueCodes = Array.from(new Set(competencyCodes.filter(Boolean)));

  const [anchors, competencies] = await Promise.all([
    prisma.ratingScaleAnchor.findMany({
      where: { domain: "INTERVIEW" },
      orderBy: { score: "desc" },
    }),
    uniqueCodes.length
      ? prisma.competency.findMany({
          where: {
            code: { in: uniqueCodes },
            organizationId: null,
            subskills: { some: { isActive: true } },
          },
          include: {
            subskills: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              include: {
                indicators: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const frameworks: EvidenceFramework[] = competencies.map((c) => ({
    code: c.code,
    nameKo: c.nameKo,
    definition: c.description ?? "",
    subskills: c.subskills.map((s) => ({
      code: s.code,
      nameKo: s.nameKo,
      definition: s.definition,
      indicators: s.indicators.map((i) => ({
        code: i.code,
        polarity: i.polarity as "POSITIVE" | "NEGATIVE_OR_MISSING",
        textKo: i.textKo,
      })),
    })),
  }));

  return {
    ratingScale: ratingScaleFromAnchors(anchors),
    frameworks,
  };
}

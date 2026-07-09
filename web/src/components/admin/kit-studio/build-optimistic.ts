import type { RubricByLevel } from "@/lib/competency/rubric";
import type { CatalogComp, CatalogQuestion, KitCompetency, KitQuestion } from "./types";

export function buildOptimisticFromCatalog(
  item: CatalogComp,
  sortOrder: number,
  extraQuestionFields?: (q: CatalogQuestion, index: number) => Partial<KitQuestion>,
): { comp: KitCompetency; questions: KitQuestion[] } {
  const compId = `pending-${item.source}-${item.code}`;
  const comp: KitCompetency = {
    id: compId,
    code: item.code,
    nameKo: item.nameKo,
    description: item.description,
    sortOrder,
    isActive: true,
    questionCount: item.questions?.length ?? item.questionCount,
    rubricByLevel: item.rubricByLevel ?? {},
  };
  const questions: KitQuestion[] = (item.questions ?? []).map((q, i) => ({
    id: `pending-q-${item.code}-${i}`,
    externalId: q.externalId,
    competencyId: compId,
    competencyCode: item.code,
    level: q.level,
    template: q.template,
    sortOrder: q.sortOrder,
    isActive: true,
    rubricCriteria: q.rubricCriteria ?? [],
    ...(extraQuestionFields?.(q, i) ?? {}),
  }));
  return { comp, questions };
}

export type { RubricByLevel };

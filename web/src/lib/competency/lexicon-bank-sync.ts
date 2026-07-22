/**
 * 역량사전(JSON) → Framework Studio 통합 뱅크(Competency + rubricByLevel + RubricSet)
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES } from "@/types";
import {
  getLexiconDoc,
  listLexiconClusters,
  type LexiconCompetency,
} from "@/lib/competency/lexicon";
import {
  findPlatformCompetencyByCode,
  platformCompetencyUniqueWhere,
} from "@/lib/content/ownership";
import { syncDefaultRubricSetFromLegacy } from "@/lib/competency/rubric-sync";
import { difficultyForLevel } from "@/lib/competency/unified-bank-sync";

export type LexiconSyncResult = {
  clusters: number;
  competencies: number;
  rubricSets: number;
  questions: number;
  coreUpdated: number;
};

function asRubricJson(levels: Record<string, string[]>): Prisma.InputJsonValue {
  return levels as unknown as Prisma.InputJsonValue;
}

function buildDescription(entry: LexiconCompetency): string {
  const terms = entry.terms
    .slice(0, 6)
    .map((t) => t.termKo)
    .join(" · ");
  const lenses = (["LARGE", "PUBLIC", "STARTUP"] as const)
    .map((l) => `${l}: ${(entry.lensSignals[l] ?? []).slice(0, 3).join(", ")}`)
    .join(" / ");
  const scope = entry.scorecardScope
    ? `QuadScope: ${entry.scorecardScope}`
    : null;
  return [
    scope,
    entry.definition,
    "",
    `NCS·앵커: ${entry.ncsAnchor}`,
    terms ? `신호어·숙어: ${terms}` : null,
    `조직 렌즈: ${lenses}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 사전 문항 — 신호어 goodExample 기반 짧은 면접 프롬프트 */
function questionTextFromTerm(
  competencyName: string,
  termKo: string,
  meaningKo: string,
): string {
  return `${competencyName} 관점에서 ‘${termKo}’(${meaningKo})을(를) 보여 준 구체 경험을 STAR로 말씀해 주세요.`;
}

/**
 * 역량사전 → CompetencyCluster / Competency / RubricSet / Question
 * - 런타임 6역량(NCS IRT): 정의·루브릭을 보강하되 source는 NCS 유지
 * - 확장 역량: CUSTOM 클러스터로 생성
 */
export async function syncLexiconToUnifiedBank(): Promise<LexiconSyncResult> {
  const doc = getLexiconDoc();
  const clusterMetas = listLexiconClusters();

  // NCS IRT 클러스터 보장 (6코어 소속)
  const ncsCluster = await prisma.competencyCluster.upsert({
    where: { code: "NCS_IRT" },
    create: {
      code: "NCS_IRT",
      nameKo: "NCS · IRT 면접",
      nameEn: "NCS IRT Interview",
      description: "국가직무능력표준 기반 6역량 — 모의면접 IRT",
      source: "NCS",
      sortOrder: 0,
      isActive: true,
    },
    update: { isActive: true, nameKo: "NCS · IRT 면접" },
  });

  const clusterIdByCode = new Map<string, string>();
  clusterIdByCode.set("LEX_IRT_CORE", ncsCluster.id);
  clusterIdByCode.set("NCS_IRT", ncsCluster.id);

  let clusters = 1;
  for (const meta of clusterMetas) {
    if (meta.code === "LEX_IRT_CORE") continue;
    const row = await prisma.competencyCluster.upsert({
      where: { code: meta.code },
      create: {
        code: meta.code,
        nameKo: meta.nameKo,
        nameEn: meta.nameEn ?? null,
        description: meta.description ?? null,
        source: "CUSTOM",
        sortOrder: (meta.sortOrder ?? 0) + 40,
        isActive: true,
      },
      update: {
        nameKo: meta.nameKo,
        nameEn: meta.nameEn ?? null,
        description: meta.description ?? null,
        source: "CUSTOM",
        isActive: true,
      },
    });
    clusterIdByCode.set(meta.code, row.id);
    clusters += 1;
  }

  let sortBase =
    (await prisma.competency.aggregate({ _max: { sortOrder: true } }))._max
      .sortOrder ?? -1;
  sortBase += 1;

  let competencies = 0;
  let rubricSets = 0;
  let questions = 0;
  let coreUpdated = 0;

  const coreSet = new Set<string>(COMPETENCY_CODES);

  for (const [code, entry] of Object.entries(doc.competencies)) {
    const isCore = coreSet.has(code);
    const clusterId =
      clusterIdByCode.get(entry.clusterCode) ??
      (isCore ? ncsCluster.id : clusterIdByCode.get("LEX_BEHAVIORAL"));
    if (!clusterId) continue;

    const existing = await findPlatformCompetencyByCode(code);
    const sortOrder = existing?.sortOrder ?? sortBase++;
    const description = buildDescription(entry);
    const rubricByLevel = asRubricJson(entry.rubricByLevel);

    const comp = await prisma.competency.upsert({
      where: platformCompetencyUniqueWhere(code),
      create: {
        code,
        nameKo: entry.nameKo,
        nameEn: entry.nameEn ?? null,
        description,
        clusterId,
        source: isCore ? "NCS" : "CUSTOM",
        sortOrder,
        isActive: true,
        lifecycleStatus: "ACTIVE",
        ownerScope: "PLATFORM",
        organizationId: null,
        rubricByLevel,
      },
      update: {
        nameKo: entry.nameKo,
        nameEn: entry.nameEn ?? null,
        description,
        clusterId: isCore ? ncsCluster.id : clusterId,
        source: isCore ? "NCS" : "CUSTOM",
        isActive: true,
        lifecycleStatus: "ACTIVE",
        rubricByLevel,
      },
    });
    competencies += 1;
    if (isCore) coreUpdated += 1;

    const set = await syncDefaultRubricSetFromLegacy(comp.id, entry.rubricByLevel, {
      nameKo: entry.nameKo,
      code,
    });
    if (set) rubricSets += 1;

    // 벤치마크 인용
    await prisma.competencyBenchmarkRef.deleteMany({
      where: {
        competencyId: comp.id,
        frameworkName: { startsWith: "역량사전" },
      },
    });
    await prisma.competencyBenchmarkRef.create({
      data: {
        competencyId: comp.id,
        frameworkName: "역량사전 (AXHRD Lexicon)",
        refLabel: entry.ncsAnchor,
        refDefinition: entry.definition,
        sourceUrl: "",
        licenseNote: "Internal lexicon SSoT — NCS/BARS inspired",
        sortOrder: 0,
      },
    });

    // 신호어 기반 샘플 문항 (최대 3)
    for (const [i, t] of entry.terms.slice(0, 3).entries()) {
      const externalId = `LEX-${code}-T${i + 1}`;
      const level = Math.min(5, Math.max(1, i + 2)) as 1 | 2 | 3 | 4 | 5;
      const criteria = entry.rubricByLevel[String(level)] ?? entry.rubricByLevel["3"] ?? [];
      await prisma.question.upsert({
        where: { externalId },
        create: {
          externalId,
          competencyId: comp.id,
          level,
          template: questionTextFromTerm(entry.nameKo, t.termKo, t.meaningKo),
          sortOrder: 900 + i,
          isActive: true,
          difficulty: difficultyForLevel(level),
          discrimination: 1,
          rubricCriteria: criteria as unknown as Prisma.InputJsonValue,
          followUpHints: [
            `좋은 예 힌트: ${t.goodExample}`,
            `약한 예(피할 것): ${t.badExample}`,
          ] as unknown as Prisma.InputJsonValue,
        },
        update: {
          competencyId: comp.id,
          level,
          template: questionTextFromTerm(entry.nameKo, t.termKo, t.meaningKo),
          isActive: true,
          difficulty: difficultyForLevel(level),
          rubricCriteria: criteria as unknown as Prisma.InputJsonValue,
          followUpHints: [
            `좋은 예 힌트: ${t.goodExample}`,
            `약한 예(피할 것): ${t.badExample}`,
          ] as unknown as Prisma.InputJsonValue,
        },
      });
      questions += 1;
    }
  }

  return { clusters, competencies, rubricSets, questions, coreUpdated };
}

import { prisma } from "@/lib/prisma";
import {
  buildReversedSet,
  computeArcScoresFromAnswers,
  computeDriverImportance,
  computeIcc1,
  computeTeamGapMatrix,
  type DriverImportanceSummary,
  type IccResult,
  type ScoredAnswers,
} from "@/lib/diagnostic/arc-scoring";

function avgNums(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function summarizeRespondents(
  perRespondent: ReturnType<typeof computeArcScoresFromAnswers>[],
) {
  const first = perRespondent[0];
  if (!first) return null;
  return {
    ohi: {
      overall: avgNums(perRespondent.map((r) => r.ohi.overall)),
      SE: avgNums(perRespondent.map((r) => r.ohi.SE)),
      riskIndex: avgNums(perRespondent.map((r) => r.ohi.riskIndex)),
      band: first.ohi.band,
      drivers: first.ohi.drivers,
    },
    ori: {
      ORI: avgNums(perRespondent.map((r) => r.ori.ORI)),
      CD: avgNums(perRespondent.map((r) => r.ori.CD)),
      LA: avgNums(perRespondent.map((r) => r.ori.LA)),
      band: first.ori.band,
      opportunity: first.ori.opportunity,
      axMaturity: first.ori.axMaturity,
    },
    ovi: {
      OVI: avgNums(perRespondent.map((r) => r.ovi.OVI)),
      HV: avgNums(perRespondent.map((r) => r.ovi.HV)),
      CV: avgNums(perRespondent.map((r) => r.ovi.CV)),
      AV: avgNums(perRespondent.map((r) => r.ovi.AV)),
      band: first.ovi.band,
      dynamicCongruenceGap: avgNums(perRespondent.map((r) => r.ovi.dynamicCongruenceGap)),
    },
    oai: {
      OAI: avgNums(perRespondent.map((r) => r.oai.OAI)),
      SA: avgNums(perRespondent.map((r) => r.oai.SA)),
      EA: avgNums(perRespondent.map((r) => r.oai.EA)),
      OA: avgNums(perRespondent.map((r) => r.oai.OA)),
      band: first.oai.band,
    },
    oaiPattern: first.oaiPattern,
  };
}

type HierarchyNode = {
  id: string;
  name: string;
  level: "DIVISION" | "UNIT" | "TEAM";
  parentId: string | null;
  department: string | null;
};

function buildHierarchyIndex(nodes: HierarchyNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, HierarchyNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n);
    childrenOf.set(n.parentId, list);
  }
  return { byId, childrenOf };
}

/** 어떤 레벨(사업본부/사업부/팀)이 오든 실제 응답이 붙는 리프(TEAM) id 목록으로 롤업한다. */
function resolveLeafTeamIds(
  nodeId: string,
  byId: Map<string, HierarchyNode>,
  childrenOf: Map<string, HierarchyNode[]>,
): string[] {
  const node = byId.get(nodeId);
  if (!node) return [];
  if (node.level === "TEAM") return [nodeId];
  const kids = childrenOf.get(nodeId) ?? [];
  return kids.flatMap((k) => resolveLeafTeamIds(k.id, byId, childrenOf));
}

async function loadWaveAndItems(waveId: string) {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id: waveId },
    include: { instrument: true },
  });
  if (!wave) return null;

  const items = await prisma.diagnosticItem.findMany({
    where: {
      section: { instrumentId: wave.instrumentId },
      scaleType: { not: "OPEN_TEXT" },
      isDemographic: false,
    },
    select: { id: true, itemCode: true, isReversed: true },
  });
  const codeById = new Map(items.map((i) => [i.id, i.itemCode]));
  const reversed = buildReversedSet(items);
  const itemIds = items.map((i) => i.id);

  return { wave, codeById, reversed, itemIds };
}

/** leafTeamIds가 null이면 웨이브 전체(필터 없음), []면 응답 0건으로 취급(존재하지 않는 노드 등). */
async function scoreResponsesForTeamIds(
  waveId: string,
  ctx: { codeById: Map<string, string>; reversed: Set<string>; itemIds: string[] },
  leafTeamIds: string[] | null,
) {
  if (leafTeamIds != null && leafTeamIds.length === 0) {
    return { sampleSize: 0, perRespondent: [] as ReturnType<typeof computeArcScoresFromAnswers>[], summary: null };
  }

  const responses = await prisma.diagnosticResponse.findMany({
    where: {
      waveId,
      submittedAt: { not: null },
      ...(leafTeamIds ? { teamId: { in: leafTeamIds } } : {}),
    },
    include: {
      answers: { where: { itemId: { in: ctx.itemIds } } },
    },
  });

  const perRespondent = responses.map((r) => {
    const map: ScoredAnswers = {};
    for (const a of r.answers) {
      const code = ctx.codeById.get(a.itemId);
      if (!code) continue;
      if (!map[code]) map[code] = {};
      if (a.axis === "CURRENT") map[code].current = a.numericValue;
      else map[code].importance = a.numericValue;
    }
    return computeArcScoresFromAnswers(map, ctx.reversed);
  });

  return {
    sampleSize: responses.length,
    perRespondent,
    summary: summarizeRespondents(perRespondent),
  };
}

export async function computeAggregateScores(scope: {
  waveId: string;
  /** 사업본부·사업부·팀 어떤 레벨의 id든 가능 — 내부에서 리프(팀)로 롤업해 집계한다. 생략하면 전사 집계. */
  teamId?: string;
  minGroupSize?: number;
}) {
  const ctx = await loadWaveAndItems(scope.waveId);
  if (!ctx) return { hidden: true, reason: "웨이브를 찾을 수 없습니다." };

  const hierarchyRows: HierarchyNode[] = await prisma.diagnosticTeam.findMany({
    where: { waveId: scope.waveId },
    select: { id: true, name: true, level: true, parentId: true, department: true },
  });
  const { byId, childrenOf } = buildHierarchyIndex(hierarchyRows);

  const scopeLeafIds = scope.teamId ? resolveLeafTeamIds(scope.teamId, byId, childrenOf) : null;
  const scored = await scoreResponsesForTeamIds(scope.waveId, ctx, scopeLeafIds);

  const minN = scope.minGroupSize ?? ctx.wave.instrument.minGroupSize;
  if (scored.sampleSize < minN) {
    return {
      hidden: true,
      reason: "표본 부족",
      sampleSize: scored.sampleSize,
      minGroupSize: minN,
    };
  }

  // β회귀 기반 IPA — 응답자 단위 완전사례 회귀(예측변수 10개 대비 표본 부족 시 insufficientData=true)
  const driverImportance: DriverImportanceSummary = computeDriverImportance(scored.perRespondent);

  if (!scope.teamId) {
    // 전사 조회 — 하이어라키 전체 노드(사업본부·사업부·팀)마다 각자의 리프 응답으로 집계.
    // 프런트는 parentId로 그룹핑해 전사→사업본부→사업부→팀 드릴다운 트리를 한 번에 그린다.
    const nodeResults = await Promise.all(
      hierarchyRows.map(async (node) => {
        const leafIds = resolveLeafTeamIds(node.id, byId, childrenOf);
        const t = await scoreResponsesForTeamIds(scope.waveId, ctx, leafIds);
        const hidden = t.sampleSize < minN;
        const seValues = hidden
          ? null
          : t.perRespondent.map((r) => r.ohi.SE).filter((v): v is number => v != null);
        return {
          row: {
            teamId: node.id,
            teamName: node.name,
            level: node.level,
            parentId: node.parentId,
            department: node.department,
            sampleSize: t.sampleSize,
            hidden,
            ORI: hidden ? null : t.summary?.ori.ORI ?? null,
            OVI: hidden ? null : t.summary?.ovi.OVI ?? null,
            OHI_SE: hidden ? null : t.summary?.ohi.SE ?? null,
            OAI: hidden ? null : t.summary?.oai.OAI ?? null,
          },
          seValues,
        };
      }),
    );
    const teamRows = nodeResults.map((r) => r.row);

    // 갭 매트릭스·ICC는 리프(팀) 레벨 분산만 본다 — 사업본부/사업부 롤업 값을 섞으면 해석이 왜곡된다.
    const leafRows = nodeResults.filter((r) => r.row.level === "TEAM");
    const visibleLeaf = leafRows.filter((r) => !r.row.hidden);
    const gapMatrix =
      visibleLeaf.length >= 2
        ? computeTeamGapMatrix(
            visibleLeaf.map((r) => ({
              teamId: r.row.teamId,
              teamName: r.row.teamName,
              ORI: r.row.ORI,
              OVI: r.row.OVI,
              OHI_SE: r.row.OHI_SE,
              OAI: r.row.OAI,
            })),
          )
        : null;

    const iccGroups = leafRows
      .filter((r) => !r.row.hidden && r.seValues && r.seValues.length >= 2)
      .map((r) => r.seValues as number[]);
    const teamReliability: IccResult = computeIcc1(iccGroups);

    return {
      hidden: false,
      sampleSize: scored.sampleSize,
      minGroupSize: minN,
      scores: scored.summary,
      perRespondent: scored.perRespondent,
      driverImportance,
      teamReliability,
      teams: teamRows,
      gapMatrix,
    };
  }

  return {
    hidden: false,
    sampleSize: scored.sampleSize,
    minGroupSize: minN,
    scores: scored.summary,
    perRespondent: scored.perRespondent,
    driverImportance,
  };
}

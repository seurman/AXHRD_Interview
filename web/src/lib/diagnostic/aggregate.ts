import { prisma } from "@/lib/prisma";
import {
  buildReversedSet,
  computeArcScoresFromAnswers,
  computeTeamGapMatrix,
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

async function scoreResponsesForScope(waveId: string, teamId?: string) {
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

  const responses = await prisma.diagnosticResponse.findMany({
    where: {
      waveId,
      submittedAt: { not: null },
      ...(teamId ? { teamId } : {}),
    },
    include: {
      answers: { where: { itemId: { in: items.map((i) => i.id) } } },
    },
  });

  const perRespondent = responses.map((r) => {
    const map: ScoredAnswers = {};
    for (const a of r.answers) {
      const code = codeById.get(a.itemId);
      if (!code) continue;
      if (!map[code]) map[code] = {};
      if (a.axis === "CURRENT") map[code].current = a.numericValue;
      else map[code].importance = a.numericValue;
    }
    return computeArcScoresFromAnswers(map, reversed);
  });

  return {
    wave,
    sampleSize: responses.length,
    perRespondent,
    summary: summarizeRespondents(perRespondent),
  };
}

export async function computeAggregateScores(scope: {
  waveId: string;
  teamId?: string;
  minGroupSize?: number;
}) {
  const scored = await scoreResponsesForScope(scope.waveId, scope.teamId);
  if (!scored) return { hidden: true, reason: "웨이브를 찾을 수 없습니다." };

  const minN = scope.minGroupSize ?? scored.wave.instrument.minGroupSize;
  if (scored.sampleSize < minN) {
    return {
      hidden: true,
      reason: "표본 부족",
      sampleSize: scored.sampleSize,
      minGroupSize: minN,
    };
  }

  if (!scope.teamId) {
    const wave = await prisma.diagnosticWave.findUnique({
      where: { id: scope.waveId },
      include: { teams: true },
    });
    const teamRows = await Promise.all(
      (wave?.teams ?? []).map(async (team) => {
        const t = await scoreResponsesForScope(scope.waveId, team.id);
        if (!t || t.sampleSize < minN) {
          return {
            teamId: team.id,
            teamName: team.name,
            hidden: true as const,
            ORI: null,
            OVI: null,
            OHI_SE: null,
            OAI: null,
          };
        }
        return {
          teamId: team.id,
          teamName: team.name,
          hidden: false as const,
          ORI: t.summary?.ori.ORI ?? null,
          OVI: t.summary?.ovi.OVI ?? null,
          OHI_SE: t.summary?.ohi.SE ?? null,
          OAI: t.summary?.oai.OAI ?? null,
        };
      }),
    );
    const visible = teamRows.filter((t) => !t.hidden);
    const gapMatrix =
      visible.length >= 2
        ? computeTeamGapMatrix(
            visible.map((t) => ({
              teamId: t.teamId,
              teamName: t.teamName,
              ORI: t.ORI,
              OVI: t.OVI,
              OHI_SE: t.OHI_SE,
              OAI: t.OAI,
            })),
          )
        : null;

    return {
      hidden: false,
      sampleSize: scored.sampleSize,
      minGroupSize: minN,
      scores: scored.summary,
      perRespondent: scored.perRespondent,
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
  };
}

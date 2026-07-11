import { prisma } from "@/lib/prisma";
import { computeAggregateScores } from "@/lib/diagnostic/aggregate";
import { resolveReportConfigForWave } from "@/lib/diagnostic/report-profile";

export type LongitudinalDelta = {
  axis: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
};

export type LongitudinalComparison = {
  available: boolean;
  reason?: string;
  currentWave: { id: string; waveNumber: number; label: string | null };
  previousWave: { id: string; waveNumber: number; label: string | null } | null;
  deltas: LongitudinalDelta[];
};

async function axisScores(waveId: string, minGroupSize: number) {
  const result = await computeAggregateScores({ waveId, minGroupSize });
  if (result.hidden || !result.scores) return null;
  return {
    OHI: result.scores.ohi.overall,
    ORI: result.scores.ori.ORI,
    OVI: result.scores.ovi.OVI,
    OAI: result.scores.oai.OAI,
  };
}

export async function computeLongitudinalComparison(waveId: string): Promise<LongitudinalComparison> {
  const wave = await prisma.diagnosticWave.findUnique({
    where: { id: waveId },
    select: {
      id: true,
      waveNumber: true,
      label: true,
      organizationId: true,
      instrumentId: true,
    },
  });
  if (!wave) {
    return {
      available: false,
      reason: "웨이브를 찾을 수 없습니다.",
      currentWave: { id: waveId, waveNumber: 0, label: null },
      previousWave: null,
      deltas: [],
    };
  }

  const previous = await prisma.diagnosticWave.findFirst({
    where: {
      organizationId: wave.organizationId,
      instrumentId: wave.instrumentId,
      waveNumber: wave.waveNumber - 1,
    },
    select: { id: true, waveNumber: true, label: true },
  });

  if (!previous) {
    return {
      available: false,
      reason: "이전 회차 웨이브가 없습니다.",
      currentWave: { id: wave.id, waveNumber: wave.waveNumber, label: wave.label },
      previousWave: null,
      deltas: [],
    };
  }

  const config = await resolveReportConfigForWave(waveId);
  const minN = config?.minGroupSize ?? 5;

  const [currentScores, previousScores] = await Promise.all([
    axisScores(wave.id, minN),
    axisScores(previous.id, minN),
  ]);

  if (!currentScores) {
    return {
      available: false,
      reason: "현재 회차 표본이 부족합니다.",
      currentWave: { id: wave.id, waveNumber: wave.waveNumber, label: wave.label },
      previousWave: previous,
      deltas: [],
    };
  }

  const axes = ["OHI", "ORI", "OVI", "OAI"] as const;
  const deltas: LongitudinalDelta[] = axes.map((axis) => {
    const current = currentScores[axis];
    const prev = previousScores?.[axis] ?? null;
    const delta =
      current != null && prev != null ? Math.round((current - prev) * 10) / 10 : null;
    return { axis, current, previous: prev, delta };
  });

  return {
    available: true,
    currentWave: { id: wave.id, waveNumber: wave.waveNumber, label: wave.label },
    previousWave: previous,
    deltas,
  };
}

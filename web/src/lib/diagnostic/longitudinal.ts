import { prisma } from "@/lib/prisma";
import { computeAggregateScores } from "@/lib/diagnostic/aggregate";
import { resolveReportConfigForWave } from "@/lib/diagnostic/report-profile";
import { olsRegression } from "@/lib/diagnostic/arc-scoring";

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
  goldenTime?: GoldenTimeForecast | null;
};

export type GoldenTimeHorizon = 3 | 6 | 12;

export type GoldenTimeAxisProjection = {
  axis: string;
  current: number | null;
  /** 점수 / 월 (단순 선형추세) */
  slopePerMonth: number | null;
  projections: Array<{
    months: GoldenTimeHorizon;
    projected: number | null;
    deltaFromNow: number | null;
  }>;
};

export type GoldenTimeForecast = {
  available: boolean;
  reason?: string;
  waveCount: number;
  /** 웨이브 간 평균 간격(월). 날짜가 없으면 6개월 가정 */
  monthsPerWave: number;
  axes: GoldenTimeAxisProjection[];
  caveat: string;
};

const AXES = ["OHI", "ORI", "OVI", "OAI"] as const;
const HORIZONS: GoldenTimeHorizon[] = [3, 6, 12];

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

function clampScore(v: number): number {
  return Math.min(5, Math.max(1, Math.round(v * 100) / 100));
}

/**
 * Wave 시계열에 단순 선형추세를 적합해 3/6/12개월 후 점수를 투영.
 * Wave≥2면 가능(2점은 직전 변화율), Wave≥3이면 OLS로 기울기 안정화.
 * 인과·정책 개입 효과는 반영하지 않는 참고용 추세.
 */
export function projectGoldenTimeFromSeries(input: {
  points: Array<{ waveNumber: number; monthsFromStart: number; scores: Record<string, number | null> }>;
}): GoldenTimeForecast {
  const { points } = input;
  if (points.length < 2) {
    return {
      available: false,
      reason: "골든타임 추세는 Wave 2회 이상 필요합니다.",
      waveCount: points.length,
      monthsPerWave: 6,
      axes: [],
      caveat:
        "현재 추세가 유지된다는 가정입니다. 개입·외부 충격은 반영되지 않습니다.",
    };
  }

  const spanMonths =
    points[points.length - 1].monthsFromStart - points[0].monthsFromStart;
  const monthsPerWave =
    spanMonths > 0
      ? spanMonths / Math.max(1, points.length - 1)
      : 6;

  const latest = points[points.length - 1];
  const axes: GoldenTimeAxisProjection[] = AXES.map((axis) => {
    const series = points
      .map((p) => ({
        t: p.monthsFromStart,
        y: p.scores[axis],
      }))
      .filter((p): p is { t: number; y: number } => p.y != null);

    let slopePerMonth: number | null = null;
    if (series.length >= 3) {
      const X = series.map((p) => [p.t]);
      const y = series.map((p) => p.y);
      const reg = olsRegression(X, y);
      slopePerMonth = reg?.coefficients[1] ?? null;
    } else if (series.length === 2) {
      const dt = series[1].t - series[0].t;
      slopePerMonth = dt !== 0 ? (series[1].y - series[0].y) / dt : null;
    }

    const current = latest.scores[axis] ?? null;
    const projections = HORIZONS.map((months) => {
      if (current == null || slopePerMonth == null) {
        return { months, projected: null, deltaFromNow: null };
      }
      const projected = clampScore(current + slopePerMonth * months);
      return {
        months,
        projected,
        deltaFromNow: Math.round((projected - current) * 100) / 100,
      };
    });

    return { axis, current, slopePerMonth, projections };
  });

  return {
    available: axes.some((a) => a.projections.some((p) => p.projected != null)),
    reason: axes.every((a) => a.projections.every((p) => p.projected == null))
      ? "투영 가능한 축 점수가 부족합니다."
      : undefined,
    waveCount: points.length,
    monthsPerWave: Math.round(monthsPerWave * 10) / 10,
    axes,
    caveat:
      "현재 추세가 유지된다는 가정입니다. 개입·외부 충격·계절성은 반영되지 않으며 참고용입니다.",
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
      closesAt: true,
      opensAt: true,
      createdAt: true,
    },
  });
  if (!wave) {
    return {
      available: false,
      reason: "웨이브를 찾을 수 없습니다.",
      currentWave: { id: waveId, waveNumber: 0, label: null },
      previousWave: null,
      deltas: [],
      goldenTime: null,
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

  const history = await prisma.diagnosticWave.findMany({
    where: {
      organizationId: wave.organizationId,
      instrumentId: wave.instrumentId,
      waveNumber: { lte: wave.waveNumber },
    },
    orderBy: { waveNumber: "asc" },
    select: {
      id: true,
      waveNumber: true,
      label: true,
      closesAt: true,
      opensAt: true,
      createdAt: true,
    },
  });

  const config = await resolveReportConfigForWave(waveId);
  const minN = config?.minGroupSize ?? 5;

  const [currentScores, previousScores] = await Promise.all([
    axisScores(wave.id, minN),
    previous ? axisScores(previous.id, minN) : Promise.resolve(null),
  ]);

  const historyScores = await Promise.all(
    history.map(async (w) => ({
      wave: w,
      scores: await axisScores(w.id, minN),
    })),
  );

  const anchor = history[0]
    ? (history[0].closesAt ?? history[0].opensAt ?? history[0].createdAt).getTime()
    : Date.now();

  const goldenPoints = historyScores
    .filter((h) => h.scores)
    .map((h) => {
      const at = (h.wave.closesAt ?? h.wave.opensAt ?? h.wave.createdAt).getTime();
      const monthsFromStart = (at - anchor) / (1000 * 60 * 60 * 24 * 30.4375);
      return {
        waveNumber: h.wave.waveNumber,
        monthsFromStart:
          Number.isFinite(monthsFromStart) && monthsFromStart >= 0
            ? monthsFromStart
            : (h.wave.waveNumber - (history[0]?.waveNumber ?? 1)) * 6,
        scores: h.scores as Record<string, number | null>,
      };
    });

  const goldenTime = projectGoldenTimeFromSeries({ points: goldenPoints });

  if (!currentScores) {
    return {
      available: false,
      reason: "현재 회차 표본이 부족합니다.",
      currentWave: { id: wave.id, waveNumber: wave.waveNumber, label: wave.label },
      previousWave: previous,
      deltas: [],
      goldenTime,
    };
  }

  if (!previous) {
    return {
      available: false,
      reason: "이전 회차 웨이브가 없습니다.",
      currentWave: { id: wave.id, waveNumber: wave.waveNumber, label: wave.label },
      previousWave: null,
      deltas: [],
      goldenTime,
    };
  }

  const deltas: LongitudinalDelta[] = AXES.map((axis) => {
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
    goldenTime,
  };
}

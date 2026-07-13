import {
  averageDimensions,
  normalizeAnswerDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";

export type DimensionSessionPoint = {
  sessionNumber: number;
  dimensions: AnswerDimensions;
};

/** ResponseRecord.dimensions를 세션 번호별 6축 평균으로 묶는다 (buildTimeline과 동일 패턴). */
export function buildDimensionTimeline(
  records: { dimensions: unknown; sessionNumber: number }[],
): DimensionSessionPoint[] {
  const bySession = new Map<number, AnswerDimensions[]>();

  for (const record of records) {
    const normalized = normalizeAnswerDimensions(record.dimensions);
    if (!normalized) continue;
    const bucket = bySession.get(record.sessionNumber) ?? [];
    bucket.push(normalized);
    bySession.set(record.sessionNumber, bucket);
  }

  return Array.from(bySession.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([sessionNumber, history]) => ({
      sessionNumber,
      dimensions: averageDimensions(history)!,
    }));
}

export function compareDimensionHalves(timeline: DimensionSessionPoint[]): {
  recent: AnswerDimensions;
  previous: AnswerDimensions;
  recentSessionCount: number;
  previousSessionCount: number;
} | null {
  if (timeline.length < 2) return null;

  const splitAt = Math.ceil(timeline.length / 2);
  const previousSlice = timeline.slice(0, splitAt);
  const recentSlice = timeline.slice(splitAt);

  const previous = averageDimensions(previousSlice.map((p) => p.dimensions));
  const recent = averageDimensions(recentSlice.map((p) => p.dimensions));
  if (!previous || !recent) return null;

  return {
    recent,
    previous,
    recentSessionCount: recentSlice.length,
    previousSessionCount: previousSlice.length,
  };
}

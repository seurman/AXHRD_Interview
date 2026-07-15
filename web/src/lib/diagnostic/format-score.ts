/** ARC Index display helpers — Likert 1–5 scoring surfaces as 2dp. */

export const ARC_SCALE_MIN = 1;
export const ARC_SCALE_MAX = 5;
/** Radar outer ring: 0 keeps a visual hub; scores still live on 1–5. */
export const ARC_RADAR_DOMAIN: [number, number] = [0, ARC_SCALE_MAX];

export function formatScore(value: number | null | undefined, fallback = "—"): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value.toFixed(2);
}

export function formatScoreDelta(value: number | null | undefined, fallback = "—"): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

/** Map Likert score → bar width % on a 1–5 continuum. */
export function scoreBarPct(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, ((value - ARC_SCALE_MIN) / (ARC_SCALE_MAX - ARC_SCALE_MIN)) * 100));
}

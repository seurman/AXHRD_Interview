import type { DiagnosticWaveStatus } from "@prisma/client";

export function waveStatusLabel(status: DiagnosticWaveStatus): string {
  switch (status) {
    case "DRAFT":
      return "준비중";
    case "OPEN":
      return "진행중";
    case "CLOSED":
      return "마감";
    default:
      return status;
  }
}

/** 일정 필드 기준 초기 상태 — 명시적 status가 없을 때 */
export function deriveInitialWaveStatus(opensAt?: Date | null, closesAt?: Date | null): DiagnosticWaveStatus {
  const now = Date.now();
  if (closesAt && closesAt.getTime() <= now) return "CLOSED";
  if (opensAt && opensAt.getTime() > now) return "DRAFT";
  return "OPEN";
}

import type { OrgStatus } from "@prisma/client";

export function parseDateInput(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseOptionalDate(
  value: unknown,
): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: null };
  }
  const parsed = parseDateInput(value);
  if (parsed === undefined) {
    return { ok: false, error: "이용 기간 형식이 올바르지 않습니다." };
  }
  return { ok: true, value: parsed };
}

export function resolveOrgPeriodForCreate(
  input: { validFrom?: unknown; validUntil?: unknown },
  status: OrgStatus,
  now = new Date(),
): { ok: true; validFrom: Date | null; validUntil: Date | null } | { ok: false; error: string } {
  const fromResult = parseOptionalDate(input.validFrom);
  if (!fromResult.ok) return fromResult;

  const untilResult = parseOptionalDate(input.validUntil);
  if (!untilResult.ok) return untilResult;

  let validFrom = fromResult.value;
  const validUntil = untilResult.value;

  if (validFrom && validUntil && validFrom > validUntil) {
    return { ok: false, error: "이용 시작일은 종료일보다 이전이어야 합니다." };
  }

  if (!validFrom && validUntil && status === "APPROVED") {
    validFrom = now;
  }

  return { ok: true, validFrom, validUntil };
}

export function validateOrgPeriodRange(
  validFrom: Date | null | undefined,
  validUntil: Date | null | undefined,
): string | null {
  if (validFrom && validUntil && validFrom > validUntil) {
    return "이용 시작일은 종료일보다 이전이어야 합니다.";
  }
  return null;
}

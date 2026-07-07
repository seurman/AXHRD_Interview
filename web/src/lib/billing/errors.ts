/** Prisma P2021 — 테이블/뷰 없음 (마이그레이션 미적용) */
export function isMissingBillingTablesError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "P2021") return true;
  const message = (error as { message?: string }).message ?? "";
  return (
    message.includes("Subscription") &&
    (message.includes("does not exist") || message.includes("존재하지"))
  );
}

export const BILLING_MIGRATION = "20260707233000_add_billing_subscription";

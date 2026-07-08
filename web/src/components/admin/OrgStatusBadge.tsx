const STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 ring-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30",
  REJECTED: "bg-red-500/15 text-red-700 ring-red-500/30",
};

const LABELS: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "운영 중",
  REJECTED: "반려됨",
};

export function OrgStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        STYLES[status] ?? "bg-muted text-muted"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}

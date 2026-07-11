import { Badge, type BadgeTone } from "@/components/admin/Badge";

const TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const LABELS: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "운영 중",
  REJECTED: "반려됨",
};

export function OrgStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={TONE[status] ?? "neutral"}>{LABELS[status] ?? status}</Badge>
  );
}

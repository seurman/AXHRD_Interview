import type { OrgKind } from "@prisma/client";
import { orgKindLabel } from "@/lib/org/kinds";
import { Badge } from "@/components/admin/Badge";

export function OrgKindBadge({ kind }: { kind: OrgKind }) {
  const isHr = kind === "HR_ENTERPRISE";
  return (
    <Badge tone={isHr ? "gold" : "accent"} className="text-[10px]">
      {orgKindLabel(kind)}
    </Badge>
  );
}

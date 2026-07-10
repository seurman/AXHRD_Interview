import type { OrgKind } from "@prisma/client";
import { orgKindLabel } from "@/lib/org/kinds";

export function OrgKindBadge({ kind }: { kind: OrgKind }) {
  const isHr = kind === "HR_ENTERPRISE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isHr ? "bg-violet-500/10 text-violet-700" : "bg-sky-500/10 text-sky-700"
      }`}
    >
      {orgKindLabel(kind)}
    </span>
  );
}

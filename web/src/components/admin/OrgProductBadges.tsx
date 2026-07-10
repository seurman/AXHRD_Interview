import { Badge } from "@/components/admin/Badge";
import {
  ORG_PRODUCTS,
  type OrgEntitlementSnapshot,
} from "@/lib/org/entitlements";

type Props = {
  entitlements: OrgEntitlementSnapshot;
  className?: string;
};

const TONE: Record<
  (typeof ORG_PRODUCTS)[number]["key"],
  "accent" | "gold" | "neutral"
> = {
  interview: "accent",
  competency: "gold",
  diagnostic: "accent",
};

export function OrgProductBadges({ entitlements, className = "" }: Props) {
  const active = ORG_PRODUCTS.filter((p) => entitlements[p.key]);
  if (active.length === 0) {
    return (
      <Badge tone="neutral" className={`text-[10px] ${className}`}>
        제품 없음
      </Badge>
    );
  }

  return (
    <>
      {active.map((p) => (
        <Badge key={p.key} tone={TONE[p.key]} className={`text-[10px] ${className}`}>
          {p.shortLabel}
        </Badge>
      ))}
    </>
  );
}

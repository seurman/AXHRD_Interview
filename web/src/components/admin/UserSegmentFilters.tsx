import Link from "next/link";
import { USER_SEGMENT_OPTIONS, type UserIdentitySegment } from "@/lib/admin/user-identity";

export function UserSegmentFilters({
  active,
  counts,
  query,
}: {
  active: UserIdentitySegment;
  counts: Record<UserIdentitySegment, number>;
  query?: string;
}) {
  const qs = (segment: UserIdentitySegment) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (segment !== "all") params.set("segment", segment);
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="flex flex-wrap gap-2">
      {USER_SEGMENT_OPTIONS.map((opt) => {
        const selected = active === opt.key;
        const count = counts[opt.key];
        return (
          <Link
            key={opt.key}
            href={`/admin/users${qs(opt.key)}`}
            title={opt.hint}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              selected
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-card-border text-muted hover:border-gold/30 hover:text-foreground"
            }`}
          >
            {opt.label}
            <span className="ml-1.5 tabular-nums opacity-80">{count}</span>
          </Link>
        );
      })}
    </div>
  );
}

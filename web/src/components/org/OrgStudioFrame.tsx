import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width token without the max-w- prefix */
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl";
  className?: string;
};

const MAX: Record<NonNullable<Props["maxWidth"]>, string> = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

/** Org Studio 위성 페이지 공통 셸 — dashboard 금색 크롬과 정렬 */
export function OrgStudioFrame({
  eyebrow = "Org Studio",
  title,
  description,
  actions,
  children,
  maxWidth = "4xl",
  className,
}: Props) {
  return (
    <div
      className={`mx-auto ${MAX[maxWidth]} pb-[calc(2rem+env(safe-area-inset-bottom,0px))] ${className ?? ""}`}
    >
      <div className="org-ops-shell space-y-6">
        <header className="flex flex-col gap-4 border-b border-card-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-outfit)] text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              {eyebrow}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function OrgStudioSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="org-ops-shell space-y-4">
        <div className="space-y-2 border-b border-card-border pb-4">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted/40" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/30" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-card-border bg-muted/20"
          />
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 플랫폼 콘솔 패널 — card-luxe 대신 enterprise surface */
export function OverviewPanel({
  title,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={cn("platform-panel", className)}>
      {(title || action) && (
        <div className="platform-panel-header">
          {title ? <h2 className="text-sm font-bold text-[var(--platform-text)]">{title}</h2> : <span />}
          {action}
        </div>
      )}
      <div className={cn(!noPadding && "platform-panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}

export function OverviewKvRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-sm">
      <span className="shrink-0 font-semibold text-[var(--platform-text-muted)]">{label}</span>
      <div className="min-w-0 text-right font-bold text-[var(--platform-text)]">{children}</div>
    </div>
  );
}

export function OverviewStatusDot({
  tone,
  children,
}: {
  tone: "ready" | "attention" | "neutral";
  children: ReactNode;
}) {
  const dot =
    tone === "ready"
      ? "bg-emerald-500"
      : tone === "attention"
        ? "bg-amber-500"
        : "bg-[var(--platform-text-muted)]";
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
      {children}
    </span>
  );
}

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** 기관 허브·Platform 홈 등 모듈 진입 타일 */
export function AdminHubTile({
  href,
  title,
  description,
  meta,
  icon: Icon,
  className,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col rounded-xl border border-card-border bg-card p-5 transition hover:border-accent/40 hover:bg-background/60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <h3 className="mt-3 font-semibold text-foreground group-hover:text-accent">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{description}</p>
      {meta && <p className="mt-3 text-xs text-gold">{meta}</p>}
    </Link>
  );
}

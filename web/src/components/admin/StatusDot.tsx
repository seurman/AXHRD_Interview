import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DotTone = "success" | "warning" | "danger" | "neutral" | "accent" | "gold";

const DOT_COLOR: Record<DotTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted",
  accent: "bg-accent",
  gold: "bg-gold",
};

/**
 * Vercel Deployments 목록의 상태 점(●) + 라벨 패턴.
 * 로그성 목록(세션·감사·진단 웨이브)의 상태 표시를 하나로 통일한다.
 */
export function StatusDot({
  tone = "neutral",
  children,
  className,
}: {
  tone?: DotTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-foreground", className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[tone])} />
      {children}
    </span>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DotTone = "success" | "warning" | "danger" | "neutral" | "accent" | "gold";

const DOT_COLOR: Record<DotTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-[var(--platform-text-muted)]",
  accent: "bg-[var(--platform-accent)]",
  gold: "bg-violet-500",
};

/**
 * Vercel Deployments 목록의 상태 점(●) + 라벨 패턴.
 * 로그성 목록(세션·감사·진단 웨이브)의 상태 표시를 하나로 통일한다.
 * `/admin` 홈의 OverviewStatusDot과 같은 표면 언어(platform-* 토큰) 사용.
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--platform-text)]",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[tone])} />
      {children}
    </span>
  );
}

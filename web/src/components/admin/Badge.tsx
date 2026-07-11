import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "gold" | "accent" | "primary" | "success" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  gold: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  accent: "bg-[color-mix(in_srgb,var(--platform-accent)_12%,transparent)] text-[var(--platform-accent)]",
  primary: "bg-[color-mix(in_srgb,var(--platform-accent)_12%,transparent)] text-[var(--platform-accent)]",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-600 dark:text-red-300",
  neutral: "bg-[color-mix(in_srgb,var(--platform-text-muted)_12%,transparent)] text-[var(--platform-text-muted)]",
};

/**
 * 공용 상태/속성 뱃지. admin 화면 곳곳에 흩어져 있던 임의의 인라인
 * rounded-full 배경색 조합(bg-color/NN, px-N py-N, text-[10px] 등)을 하나로 통일한다.
 * 기존 OrgStatusBadge/OrgKindBadge처럼 도메인 전용 색상 매핑이 필요한
 * 경우는 그대로 별도 컴포넌트를 유지해도 되지만, 새로 뱃지를 추가할 때는
 * 우선 이 컴포넌트를 사용할 것. 색상은 플랫폼 콘솔 셸(platform-* 토큰)과
 * 맞춰서 정의한다 — 이 컴포넌트는 /admin/* 안에서만 쓰인다.
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

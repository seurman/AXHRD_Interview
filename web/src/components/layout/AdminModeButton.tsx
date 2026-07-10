"use client";

import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";

const ADMIN_HOME = "/admin";

type Props = {
  label: string;
  /** 모바일 드로어용 전체 너비 버튼 */
  variant?: "nav" | "drawer";
  className?: string;
};

/** Platform Console — 메인 헤더와 분리된 관리자 창(새 탭) */
export function AdminModeButton({ label, variant = "nav", className }: Props) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const active = pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
  const ariaNewWindow = locale === "ko" ? `${label} (새 창)` : `${label} (new window)`;

  if (variant === "drawer") {
    return (
      <a
        href={ADMIN_HOME}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "btn-primary mb-2 flex w-full items-center justify-center gap-2 text-center text-sm",
          className,
        )}
      >
        {label}
        <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={ADMIN_HOME}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaNewWindow}
      className={cn(
        "nav-pill nav-pill-gold inline-flex items-center gap-1",
        active && "nav-pill-active",
        className,
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
    </a>
  );
}

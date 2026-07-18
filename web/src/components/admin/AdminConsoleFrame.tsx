"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { PlatformConsoleSidebar, type ConsoleNavSection } from "@/components/admin/PlatformConsoleSidebar";
import { useRouteTransition } from "@/components/layout/RouteTransitionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  sections: ConsoleNavSection[];
  userName?: string | null;
  children: ReactNode;
};

/** Vercel식 플랫폼 셸 — 밝은 사이드바 + 콘텐츠 풀폭 */
export function AdminConsoleFrame({ sections, userName, children }: Props) {
  const { dict } = useI18n();
  const { pendingHref } = useRouteTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="platform-app flex min-h-screen w-full">
      {/* 모바일 헤더 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-3 pt-[env(safe-area-inset-top,0px)] shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="platform-icon-btn platform-icon-btn--touch"
          aria-label={dict.common.menu}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-bold">AX Configure</span>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/35 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-[70] w-[min(100vw-3rem,20rem)] transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <PlatformConsoleSidebar
          sections={sections}
          userName={userName}
          onNavigate={() => setMobileOpen(false)}
          headerAction={
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="platform-icon-btn platform-icon-btn--touch lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          }
        />
      </div>

      <main className="platform-content relative min-w-0 flex-1 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pt-0">
        {pendingHref ? (
          <div className="platform-route-progress" aria-hidden />
        ) : null}
        <div className="platform-content-inner">{children}</div>
      </main>
    </div>
  );
}

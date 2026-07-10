"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { PlatformConsoleSidebar, type ConsoleNavSection } from "@/components/admin/PlatformConsoleSidebar";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  sections: ConsoleNavSection[];
  userName?: string | null;
  children: ReactNode;
};

/** Vercel식 플랫폼 셸 — 밝은 사이드바 + 콘텐츠 풀폭 */
export function AdminConsoleFrame({ sections, userName, children }: Props) {
  const { dict } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="platform-app flex min-h-screen w-full">
      {/* 모바일 헤더 — Vercel은 사이드바만, 상단 탭 없음 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-3 border-b border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="platform-icon-btn"
          aria-label={dict.common.menu}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-bold">AX Configure</span>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
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
              className="platform-icon-btn lg:hidden"
              aria-label="Close menu"
            >
              ✕
            </button>
          }
        />
      </div>

      <main className="platform-content min-w-0 flex-1 pt-12 lg:pt-0">
        <div className="platform-content-inner">{children}</div>
      </main>
    </div>
  );
}

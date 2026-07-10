"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { PlatformConsoleSidebar, type ConsoleNavSection } from "@/components/admin/PlatformConsoleSidebar";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Props = {
  sections: ConsoleNavSection[];
  userName?: string | null;
  children: ReactNode;
};

/** Vercel식 풀뷰포트 관리자 셸 — 좌측 사이드바 + 우측 풀폭 콘텐츠 */
export function AdminConsoleFrame({ sections, userName, children }: Props) {
  const { dict } = useI18n();
  const c = dict.common.admin;
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
    <div className="admin-console flex min-h-screen w-full bg-background">
      {/* 모바일 상단 바 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-3 border-b border-card-border bg-card px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-primary/5"
          aria-label={dict.common.menu}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-semibold text-foreground">{c.consoleTitle}</span>
      </div>

      {/* 모바일 드로어 백드롭 */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 — 데스크톱 고정 / 모바일 슬라이드 */}
      <div
        className={`fixed inset-y-0 left-0 z-[70] w-[15.5rem] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
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
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/5 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          }
        />
      </div>

      <main className="min-w-0 flex-1 pt-12 lg:pt-0">
        <div className="admin-console-main px-5 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

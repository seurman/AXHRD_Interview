"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  FileSearch,
  Home,
  Layers,
  LogOut,
  Mic2,
  Presentation,
  Search,
  Shield,
  Users,
  Wallet,
  Activity,
} from "lucide-react";
import type { CapabilityId } from "@/lib/platform/capabilities";
import type { AdminSectionKey } from "@/lib/platform/nav-registry";
import { clearNavSessionCache } from "@/components/layout/NavSessionProvider";
import { useRouteTransition } from "@/components/layout/RouteTransitionProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const ICON_BY_HREF: Partial<Record<string, LucideIcon>> = {
  "/admin/repository": Layers,
};

const ICON_BY_CAPABILITY: Partial<Record<CapabilityId, LucideIcon>> = {
  "platform.permissions": Shield,
  "platform.users": Users,
  "platform.organizations": Building2,
  "platform.content": ClipboardList,
  "platform.diagnostic": Activity,
  "platform.demo": Presentation,
  "platform.subscriptions": Wallet,
  "platform.audit": FileSearch,
  "platform.sessions": Mic2,
};

export type ConsoleNavItem = { href: string; label: string; capability: CapabilityId };

export type ConsoleNavSection = {
  sectionKey: AdminSectionKey;
  items: ConsoleNavItem[];
};

type Props = {
  sections: ConsoleNavSection[];
  userName?: string | null;
  onNavigate?: () => void;
  headerAction?: ReactNode;
};

function PlatformNavLink({
  href,
  active,
  onNavigate,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  onNavigate?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { pendingHref, startNavigation } = useRouteTransition();
  const pending = pendingHref === href;

  return (
    <Link
      href={href}
      prefetch
      onClick={() => {
        if (href !== pathname) startNavigation(href);
        onNavigate?.();
      }}
      className={cn(
        className,
        pending && "platform-nav-item--pending",
        pending && !active && "opacity-80",
      )}
      aria-busy={pending || undefined}
    >
      {children}
    </Link>
  );
}

function PlatformLogout({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        void fetch("/api/auth/session", { method: "POST", credentials: "include" })
          .then((res) => {
            if (!res.ok) throw new Error("logout");
            clearNavSessionCache();
            window.location.assign("/");
          })
          .catch(() => setBusy(false));
      }}
      className="platform-sidebar-footer-btn"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {label}
    </button>
  );
}

export function PlatformConsoleSidebar({
  sections,
  userName,
  onNavigate,
  headerAction,
}: Props) {
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const c = dict.common;

  if (sections.length === 0) return null;

  const homeActive = pathname === "/admin";

  return (
    <aside className="platform-sidebar flex h-full min-h-screen w-[240px] shrink-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--platform-text)]">AX Configure</p>
          <p className="truncate text-xs font-medium text-[var(--platform-text-muted)]">Platform Console</p>
        </div>
        {headerAction}
      </div>

      <div className="px-3 pb-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--platform-text-muted)]" />
          <input
            type="search"
            disabled
            placeholder="Find…"
            className="platform-search w-full"
          />
        </label>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-3">
        <PlatformNavLink
          href="/admin"
          active={homeActive}
          onNavigate={onNavigate}
          className={`platform-nav-item ${homeActive ? "platform-nav-item--active" : ""}`}
        >
          <Home className="h-4 w-4 shrink-0" />
          <span className="truncate">{c.admin.overview}</span>
        </PlatformNavLink>

        {sections.map((section) => (
          <div key={section.sectionKey}>
            <p className="platform-nav-section-label">{c.admin.workspaces[section.sectionKey]}</p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = ICON_BY_HREF[item.href] ?? ICON_BY_CAPABILITY[item.capability];
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin/permissions" && pathname.startsWith(`${item.href}/`));
                return (
                  <PlatformNavLink
                    key={item.href}
                    href={item.href}
                    active={active}
                    onNavigate={onNavigate}
                    className={`platform-nav-item ${active ? "platform-nav-item--active" : ""}`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                    <span className="truncate">{item.label}</span>
                  </PlatformNavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-[var(--platform-border)] px-2 py-3">
        {userName && (
          <p className="truncate px-2.5 pb-2 text-xs font-bold text-[var(--platform-text)]">
            {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
          </p>
        )}
        <PlatformNavLink href="/" onNavigate={onNavigate} className="platform-sidebar-footer-btn">
          <ArrowLeft className="h-4 w-4 shrink-0 opacity-70" />
          {c.admin.backToService}
        </PlatformNavLink>
        <PlatformLogout label={c.auth.logout} />
      </div>
    </aside>
  );
}

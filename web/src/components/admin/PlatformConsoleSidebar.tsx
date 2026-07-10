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
  Mic2,
  Presentation,
  Shield,
  Users,
  Wallet,
  Activity,
} from "lucide-react";
import type { CapabilityId } from "@/lib/platform/capabilities";
import type { AdminSectionKey } from "@/lib/platform/nav-registry";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
    <aside className="flex h-full min-h-screen w-[15.5rem] shrink-0 flex-col border-r border-card-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-card-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{c.admin.consoleTitle}</p>
          {userName && (
            <p className="truncate text-xs text-muted">
              {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            </p>
          )}
        </div>
        {headerAction}
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
            homeActive
              ? "bg-primary/10 font-medium text-foreground"
              : "text-muted hover:bg-primary/5 hover:text-foreground"
          }`}
        >
          <Home className="h-4 w-4 shrink-0 opacity-80" />
          <span className="truncate">{c.admin.overview}</span>
        </Link>

        {sections.map((section) => (
          <div key={section.sectionKey}>
            <p className="mb-1.5 px-2.5 text-[11px] font-medium text-muted">
              {c.admin.sections[section.sectionKey]}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = ICON_BY_HREF[item.href] ?? ICON_BY_CAPABILITY[item.capability];
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin/permissions" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                      active
                        ? "bg-primary/10 font-medium text-foreground"
                        : "text-muted hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-card-border px-3 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted transition hover:bg-primary/5 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {c.admin.backToService}
        </Link>
        <LogoutButton variant="drawer" label={c.auth.logout} />
      </div>
    </aside>
  );
}

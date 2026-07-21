"use client";

import { Home, Layers, Sparkles, Building2, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavTransitionLink } from "./NavTransitionLink";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { WorkspaceMode } from "@/lib/nav/workspace";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
};

export function MobileBottomNav({
  loggedIn,
  mode,
  orgAvailable,
  onMore,
}: {
  loggedIn: boolean;
  mode: WorkspaceMode;
  orgAvailable: boolean;
  onMore: () => void;
}) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const m = dict.common.mobileNav;

  if (!loggedIn) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  const personalTabs: Tab[] = [
    {
      href: "/dashboard",
      label: m.home,
      icon: Home,
      match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
    },
    {
      href: "/discover",
      label: m.growth,
      icon: Sparkles,
      match: (p) => p === "/discover" || p.startsWith("/discover/") || p.startsWith("/resume-review"),
    },
    {
      href: "/practice/path",
      label: m.practice,
      icon: Layers,
      match: (p) =>
        p === "/practice" ||
        p.startsWith("/practice/") ||
        p === "/demo" ||
        p.startsWith("/demo/") ||
        p.startsWith("/interview/"),
    },
  ];

  const orgTabs: Tab[] = [
    {
      href: "/org/dashboard",
      label: m.cohort,
      icon: Home,
      match: (p) =>
        p === "/org/dashboard" ||
        p.startsWith("/org/dashboard/") ||
        p.startsWith("/org/people") ||
        p === "/org/members",
    },
    {
      href: "/org/diagnosis",
      label: m.diagnostic,
      icon: Sparkles,
      match: (p) => p === "/org/diagnosis" || p.startsWith("/org/diagnosis/"),
    },
    {
      href: "/org/settings",
      label: m.settings,
      icon: Building2,
      match: (p) => p === "/org/settings" || p.startsWith("/org/settings/"),
    },
  ];

  const tabs = mode === "org" && orgAvailable ? orgTabs : personalTabs;

  return (
    <nav className="mobile-bottom-nav" aria-label={dict.common.menu}>
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <NavTransitionLink
            key={tab.href}
            href={tab.href}
            className={`mobile-bottom-nav__item ${active ? "mobile-bottom-nav__item--active" : ""}`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
            <span>{tab.label}</span>
          </NavTransitionLink>
        );
      })}
      <button type="button" className="mobile-bottom-nav__item" onClick={onMore} aria-label={m.more}>
        <Menu className="h-5 w-5" />
        <span>{m.more}</span>
      </button>
    </nav>
  );
}

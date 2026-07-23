"use client";

import { Home, Layers, Sparkles, Building2, Menu, Briefcase, Gamepad2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { NavTransitionLink } from "./NavTransitionLink";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { WorkspaceMode } from "@/lib/nav/workspace";
import { useProductPersona } from "@/lib/nav/use-product-persona";
import { personaHomeHref, type ProductPersona } from "@/lib/nav/persona";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
  hard?: boolean;
};

function personalTabsFor(
  persona: ProductPersona,
  labels: Record<string, string>,
): Tab[] {
  if (persona === "worker") {
    return [
      {
        href: personaHomeHref("worker"),
        label: labels.home,
        icon: Briefcase,
        hard: true,
        match: (p) => p.startsWith("/dashboard/worker"),
      },
      {
        href: "/assessment",
        label: labels.assessment,
        icon: Sparkles,
        match: (p) => p === "/assessment" || p.startsWith("/assessment/"),
      },
    ];
  }

  if (persona === "mock") {
    return [
      {
        href: personaHomeHref("mock"),
        label: labels.home,
        icon: Gamepad2,
        hard: true,
        match: (p) => p.startsWith("/dashboard/mock"),
      },
      {
        href: "/practice/game",
        label: labels.game,
        icon: Sparkles,
        match: (p) => p.startsWith("/practice/game"),
      },
      {
        href: "/practice/path",
        label: labels.path,
        icon: Layers,
        match: (p) =>
          p.startsWith("/practice/path") ||
          p.startsWith("/practice/swipe") ||
          p === "/demo" ||
          p.startsWith("/demo/"),
      },
    ];
  }

  return [
    {
      href: personaHomeHref("jobseeker"),
      label: labels.home,
      icon: Home,
      hard: true,
      match: (p) => p.startsWith("/dashboard/jobseeker"),
    },
    {
      href: "/interview/setup",
      label: labels.interview,
      icon: Sparkles,
      match: (p) => p.startsWith("/interview/"),
    },
    {
      href: "/discover",
      label: labels.discover,
      icon: Layers,
      match: (p) =>
        p === "/discover" || p.startsWith("/discover/") || p.startsWith("/resume-review"),
    },
  ];
}

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
  const persona = useProductPersona();
  const p = dict.dashboard.personas;

  if (!loggedIn) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  const personalTabs = personalTabsFor(persona, {
    home: p[persona].short,
    interview: dict.common.nav.interview,
    assessment: dict.common.nav.assessment,
    game: dict.common.nav.game,
    path: dict.common.nav.path,
    discover: dict.common.nav.discover,
  });

  const orgTabs: Tab[] = [
    {
      href: "/org/dashboard",
      label: m.cohort,
      icon: Home,
      hard: true,
      match: (path) =>
        path === "/org/dashboard" ||
        path.startsWith("/org/dashboard/") ||
        path.startsWith("/org/people") ||
        path === "/org/members",
    },
    {
      href: "/org/diagnosis",
      label: m.diagnostic,
      icon: Sparkles,
      match: (path) => path === "/org/diagnosis" || path.startsWith("/org/diagnosis/"),
    },
    {
      href: "/org/settings",
      label: m.settings,
      icon: Building2,
      match: (path) => path === "/org/settings" || path.startsWith("/org/settings/"),
    },
  ];

  const tabs = mode === "org" && orgAvailable ? orgTabs : personalTabs;

  return (
    <nav className="mobile-bottom-nav" aria-label={dict.common.menu}>
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        const className = `mobile-bottom-nav__item ${active ? "mobile-bottom-nav__item--active" : ""}`;
        if (tab.hard) {
          return (
            <a key={tab.href} href={tab.href} className={className}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span>{tab.label}</span>
            </a>
          );
        }
        return (
          <NavTransitionLink key={tab.href} href={tab.href} className={className}>
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

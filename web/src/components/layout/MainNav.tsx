"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavDropdownMenu } from "./NavDropdownMenu";
import { NavTransitionLink } from "./NavTransitionLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { GuestProductMenu } from "./GuestProductMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { AvatarMenu } from "./AvatarMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useWorkspaceMode } from "@/lib/nav/workspace";
import type { NavLinkItem } from "@/lib/platform/nav-registry";

type SaasLinksConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" | "diagnosticDashboard" | "candidateResults" }[];
  settingsTitleKey: "settings";
  settingsLinks: {
    href: string;
    labelKey: "settingsHub" | "interviewKit";
  }[];
};

export function MainNav({
  dashboardHref,
  growthLinks,
  practiceLinks,
  activityHref,
  profileHref,
  saasLinks,
  orgWorkspaceAvailable,
  adminModeEnabled = false,
  userName,
  loggedIn,
  loading = false,
}: {
  dashboardHref: string | null;
  growthLinks: NavLinkItem[];
  practiceLinks: NavLinkItem[];
  activityHref: string | null;
  profileHref: string | null;
  saasLinks?: SaasLinksConfig | null;
  orgWorkspaceAvailable: boolean;
  adminModeEnabled?: boolean;
  userName?: string;
  loggedIn: boolean;
  loading?: boolean;
}) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const c = dict.common;
  const { mode, setMode } = useWorkspaceMode(orgWorkspaceAvailable);

  if (loading) {
    return (
      <nav className="hidden min-h-9 items-center sm:flex" aria-hidden>
        <span className="h-8 w-48 max-w-[50vw] animate-pulse rounded-full bg-primary/10" />
      </nav>
    );
  }

  if (!loggedIn) {
    return (
      <nav className="hidden items-center gap-2 sm:flex">
        <GuestProductMenu />
        <Link href="/pricing" className="nav-pill">
          {c.nav.pricing}
        </Link>
        <LanguageSwitcher />
        <ThemeSwitcher />
        <Link href="/auth/login" className="nav-pill">
          {c.auth.login}
        </Link>
        <Link href="/auth/register" className="nav-pill nav-pill-gold">
          {c.auth.register}
        </Link>
      </nav>
    );
  }

  const linkActive = (href: string) => {
    const base = href.split("#")[0];
    if (href.includes("#")) return pathname === base || pathname.startsWith(`${base}/`);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (mode === "org" && orgWorkspaceAvailable && saasLinks) {
    return (
      <nav className="hidden items-center gap-1.5 lg:gap-2 sm:flex">
        {orgWorkspaceAvailable && <WorkspaceSwitcher mode={mode} onChange={setMode} />}

        {saasLinks.links.map((l) => (
          <NavTransitionLink
            key={l.href}
            href={l.href}
            className={`nav-pill ${linkActive(l.href) ? "nav-pill-active" : ""}`}
          >
            {c.saas[l.labelKey]}
          </NavTransitionLink>
        ))}

        {saasLinks.settingsLinks.map((l) => (
          <NavTransitionLink
            key={l.href}
            href={l.href}
            className={`nav-pill ${linkActive(l.href) ? "nav-pill-active" : ""}`}
          >
            {c.saas[l.labelKey]}
          </NavTransitionLink>
        ))}

        <AvatarMenu
          userName={userName}
          profileHref={profileHref}
          adminModeEnabled={adminModeEnabled}
        />
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1.5 lg:gap-2 sm:flex">
      {orgWorkspaceAvailable && <WorkspaceSwitcher mode={mode} onChange={setMode} />}

      {dashboardHref && (
        <NavTransitionLink
          href={dashboardHref}
          className={`nav-pill ${linkActive(dashboardHref) ? "nav-pill-active" : ""}`}
        >
          {c.nav.home}
        </NavTransitionLink>
      )}

      {growthLinks.length > 0 && (
        <NavDropdownMenu
          title={c.nav.growth}
          links={growthLinks.map((l) => ({
            href: l.href,
            label: c.nav[l.labelKey],
          }))}
        />
      )}

      {practiceLinks.length > 0 && (
        <NavDropdownMenu
          title={c.nav.practice}
          links={practiceLinks.map((l) => ({
            href: l.href,
            label: c.nav[l.labelKey],
          }))}
        />
      )}

      {activityHref && (
        <NavTransitionLink href={activityHref} className="nav-pill">
          {c.nav.activity}
        </NavTransitionLink>
      )}

      <AvatarMenu
        userName={userName}
        profileHref={profileHref}
        adminModeEnabled={adminModeEnabled}
      />
    </nav>
  );
}

/** 모바일용 긴 라벨 */
export function getMobileNavLabel(
  key:
    | "dashboard"
    | "discover"
    | "interview"
    | "resumeReview"
    | "cards"
    | "trialInterview"
    | "profile"
    | "home"
    | "growth"
    | "practice"
    | "activity",
  dict: ReturnType<typeof import("@/lib/i18n/I18nProvider").useI18n>["dict"],
): string {
  if (key === "home" || key === "growth" || key === "practice" || key === "activity") {
    return dict.common.nav[key];
  }
  return dict.common.navLong[key];
}

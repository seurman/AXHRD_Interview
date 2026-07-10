"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { AdminModeButton } from "./AdminModeButton";
import { NavDropdownMenu } from "./NavDropdownMenu";
import { SaasNavMenu } from "./SaasNavMenu";
import { NavTransitionLink } from "./NavTransitionLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ClipDynamic } from "@/components/ui/ClipDynamic";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PrepareLabelKey } from "@/lib/platform/nav-registry";

type SaasLinksConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" | "diagnosticDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: {
    href: string;
    labelKey: "settingsHub" | "interviewKit";
  }[];
};

export function MainNav({
  dashboardHref,
  prepareLinks,
  profileHref,
  saasLinks,
  headerLinks = [],
  adminModeEnabled = false,
  userName,
  loggedIn,
  loading = false,
}: {
  dashboardHref: string | null;
  prepareLinks: { href: string; labelKey: PrepareLabelKey }[];
  profileHref: string | null;
  saasLinks?: SaasLinksConfig | null;
  headerLinks?: { href: string; label: string }[];
  adminModeEnabled?: boolean;
  userName?: string;
  loggedIn: boolean;
  loading?: boolean;
}) {
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const c = dict.common;

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
        <Link href="/diagnosis" className="nav-pill">
          조직진단
        </Link>
        <Link href="/pricing" className="nav-pill">
          Pricing
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

  const linkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="hidden items-center gap-1.5 lg:gap-2 sm:flex">
      {userName && (
        <ClipDynamic
          as="span"
          className="mr-1 hidden max-w-[9rem] text-xs font-medium user-greeting xl:inline xl:max-w-[11rem]"
          title={locale === "ko" ? `${userName}${c.userSuffix}` : userName}
        >
          {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
        </ClipDynamic>
      )}

      {dashboardHref && (
        <NavTransitionLink
          href={dashboardHref}
          className={`nav-pill ${linkActive(dashboardHref) ? "nav-pill-active" : ""}`}
        >
          {c.nav.dashboard}
        </NavTransitionLink>
      )}

      {headerLinks.map((link) => (
        <NavTransitionLink
          key={link.href}
          href={link.href}
          className={`nav-pill ${linkActive(link.href) ? "nav-pill-active" : ""}`}
        >
          {link.label}
        </NavTransitionLink>
      ))}

      <NavDropdownMenu
        title={c.nav.prepare}
        links={prepareLinks.map((l) => ({
          href: l.href,
          label: c.nav[l.labelKey],
        }))}
      />

      {profileHref && (
        <NavTransitionLink
          href={profileHref}
          className={`nav-pill ${linkActive(profileHref) ? "nav-pill-active" : ""}`}
        >
          {c.nav.profile}
        </NavTransitionLink>
      )}

      {saasLinks && (
        <SaasNavMenu
          title={c.saas.title}
          links={saasLinks.links.map((l) => ({
            href: l.href,
            label: c.saas[l.labelKey],
          }))}
          settingsTitle={c.saas.settings}
          settingsLinks={
            saasLinks.settingsLinks.length > 0
              ? saasLinks.settingsLinks.map((l) => ({
                  href: l.href,
                  label: c.saas[l.labelKey],
                }))
              : undefined
          }
        />
      )}

      <LanguageSwitcher />
      <ThemeSwitcher />
      {adminModeEnabled && <AdminModeButton label={c.auth.adminMode} />}
      <LogoutButton variant="nav" label={c.auth.logout} />
    </nav>
  );
}

/** 모바일용 긴 라벨 */
export function getMobileNavLabel(
  key: "dashboard" | "discover" | "interview" | "resumeReview" | "cards" | "trialInterview" | "profile",
  dict: ReturnType<typeof useI18n>["dict"]
): string {
  return dict.common.navLong[key];
}

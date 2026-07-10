"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { AdminModeButton } from "./AdminModeButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { getMobileNavLabel } from "./MainNav";
import { ClipDynamic } from "@/components/ui/ClipDynamic";
import { NavTransitionLink } from "@/components/layout/NavTransitionLink";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PrepareLabelKey } from "@/lib/platform/nav-registry";

type SaasLinksConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" | "diagnosticDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

function AccordionSection({
  title,
  defaultOpen,
  active,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen || !!active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${
          active ? "text-gold" : "text-gold"
        }`}
        aria-expanded={open}
      >
        <span className="keep-one-line">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="mt-0.5 flex flex-col gap-0.5">{children}</div> : null}
    </div>
  );
}

function MobileNavLink({
  href,
  className,
  onNavigate,
  children,
}: {
  href: string;
  className: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <NavTransitionLink href={href} onClick={onNavigate} className={className}>
      {children}
    </NavTransitionLink>
  );
}

export function MobileNav({
  dashboardHref,
  prepareLinks,
  profileHref,
  saasLinks,
  headerLinks = [],
  adminModeEnabled = false,
  userName,
  loggedIn,
  guestMenu,
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
  guestMenu: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { dict, locale } = useI18n();
  const c = dict.common;

  const closeDrawer = () => setOpen(false);

  const prefetchHrefs = useMemo(() => {
    const hrefs = new Set<string>();
    if (dashboardHref) hrefs.add(dashboardHref);
    if (profileHref) hrefs.add(profileHref);
    prepareLinks.forEach((l) => hrefs.add(l.href));
    saasLinks?.links.forEach((l) => hrefs.add(l.href));
    saasLinks?.settingsLinks.forEach((l) => hrefs.add(l.href));
    headerLinks.forEach((l) => hrefs.add(l.href));
    if (adminModeEnabled) hrefs.add("/admin");
    if (!loggedIn) {
      hrefs.add("/auth/login");
      hrefs.add("/auth/register");
    }
    return [...hrefs];
  }, [adminModeEnabled, dashboardHref, headerLinks, loggedIn, prepareLinks, profileHref, saasLinks]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const priority = [
      dashboardHref,
      profileHref,
      ...prepareLinks.map((l) => l.href),
    ].filter((h): h is string => !!h);
    for (const href of priority.slice(0, 4)) {
      router.prefetch(href);
    }
    const rest = prefetchHrefs.filter((h) => !priority.includes(h));
    const timer = window.setTimeout(() => {
      for (const href of rest) {
        router.prefetch(href);
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [dashboardHref, open, prefetchHrefs, prepareLinks, profileHref, router]);

  const linkClass = (href: string, indent = false) =>
    `keep-one-line rounded-lg py-2.5 hover:bg-primary/5 ${indent ? "pl-5 pr-3" : "px-3"} ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-primary/5 font-medium text-primary"
        : "text-foreground"
    }`;

  const prepareActive = prepareLinks.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`)
  );
  const saasActive =
    !!saasLinks &&
    [...saasLinks.links, ...saasLinks.settingsLinks].some(
      (l) => pathname === l.href || pathname.startsWith(`${l.href}/`)
    );

  const prepareLabelKey: Record<PrepareLabelKey, PrepareLabelKey> = {
    trialInterview: "trialInterview",
    interview: "interview",
    resumeReview: "resumeReview",
    discover: "discover",
    cards: "cards",
  };

  const drawer = open && (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
      <div className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col bg-card p-5 shadow-luxe">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          {userName ? (
            <ClipDynamic as="span" className="font-medium text-foreground" title={locale === "ko" ? `${userName}${c.userSuffix}` : userName}>
              {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            </ClipDynamic>
          ) : (
            <span className="font-medium text-foreground">{c.menu}</span>
          )}
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-primary/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeSwitcher compact />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
          {dashboardHref && (
            <MobileNavLink
              href={dashboardHref}
              onNavigate={closeDrawer}
              className={linkClass(dashboardHref)}
            >
              {getMobileNavLabel("dashboard", dict)}
            </MobileNavLink>
          )}

          {prepareLinks.length > 0 && (
            <AccordionSection
              title={c.nav.prepare}
              defaultOpen={prepareActive}
              active={prepareActive}
            >
              {prepareLinks.map((l) => (
                <MobileNavLink
                  key={l.href}
                  href={l.href}
                  onNavigate={closeDrawer}
                  className={linkClass(l.href, true)}
                >
                  {getMobileNavLabel(prepareLabelKey[l.labelKey], dict)}
                </MobileNavLink>
              ))}
            </AccordionSection>
          )}

          {profileHref && (
            <MobileNavLink
              href={profileHref}
              onNavigate={closeDrawer}
              className={linkClass(profileHref)}
            >
              {getMobileNavLabel("profile", dict)}
            </MobileNavLink>
          )}

          {headerLinks.map((link) => (
            <MobileNavLink
              key={link.href}
              href={link.href}
              onNavigate={closeDrawer}
              className={linkClass(link.href)}
            >
              {link.label}
            </MobileNavLink>
          ))}

          {saasLinks && (
            <AccordionSection title={c.saas.title} defaultOpen={saasActive} active={saasActive}>
              {saasLinks.links.map((l) => (
                <MobileNavLink
                  key={l.href}
                  href={l.href}
                  onNavigate={closeDrawer}
                  className={linkClass(l.href, true)}
                >
                  {c.saas[l.labelKey]}
                </MobileNavLink>
              ))}
              {saasLinks.settingsLinks.length > 0 && (
                <>
                  <p className="keep-one-line mb-0.5 mt-2 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {c.saas.settings}
                  </p>
                  {saasLinks.settingsLinks.map((l) => (
                    <MobileNavLink
                      key={l.href}
                      href={l.href}
                      onNavigate={closeDrawer}
                      className={linkClass(l.href, true)}
                    >
                      {c.saas[l.labelKey]}
                    </MobileNavLink>
                  ))}
                </>
              )}
            </AccordionSection>
          )}
        </nav>

        <div className="shrink-0 border-t border-card-border pt-4">
          {loading ? (
            <p className="px-3 py-2 text-center text-sm text-muted">{c.menuLoading}</p>
          ) : loggedIn ? (
            <>
              {adminModeEnabled && (
                <AdminModeButton label={c.auth.adminMode} variant="drawer" />
              )}
              <LogoutButton variant="drawer" label={c.auth.logout} />
            </>
          ) : guestMenu ? (
            <div className="flex flex-col gap-2">
              <MobileNavLink
                href="/auth/login"
                onNavigate={closeDrawer}
                className="btn-secondary w-full text-center"
              >
                {c.auth.login}
              </MobileNavLink>
              <MobileNavLink
                href="/auth/register"
                onNavigate={closeDrawer}
                className="btn-primary w-full text-center"
              >
                {c.auth.register}
              </MobileNavLink>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="shrink-0 sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={c.menu}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold hover:bg-gold/10"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { AdminModeButton } from "./AdminModeButton";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { getMobileNavLabel } from "./MainNav";
import { ClipDynamic } from "@/components/ui/ClipDynamic";
import { NavTransitionLink } from "@/components/layout/NavTransitionLink";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useWorkspaceMode } from "@/lib/nav/workspace";
import { useProductPersona } from "@/lib/nav/use-product-persona";
import { resolvePersonaHomeHref } from "@/lib/nav/persona-nav";
import type { NavLinkItem } from "@/lib/platform/nav-registry";

type SaasLinksConfig = {
  titleKey: "saas";
  links: {
    href: string;
    labelKey: "cohortDashboard" | "diagnosticDashboard" | "candidateResults" | "members" | "peopleDashboard";
  }[];
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
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-gold"
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
  growthLinks,
  practiceLinks,
  activityHref,
  profileHref,
  saasLinks,
  orgWorkspaceAvailable,
  adminModeEnabled = false,
  userName,
  loggedIn,
  guestMenu,
  loading = false,
  drawerOpen,
  onDrawerOpenChange,
  hideTrigger = false,
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
  guestMenu: boolean;
  loading?: boolean;
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = drawerOpen ?? internalOpen;
  const setOpen = onDrawerOpenChange ?? setInternalOpen;

  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { dict, locale } = useI18n();
  const c = dict.common;
  const { mode, setMode } = useWorkspaceMode(orgWorkspaceAvailable);
  const persona = useProductPersona();
  const personaHome = resolvePersonaHomeHref(persona);

  const closeDrawer = () => setOpen(false);

  const prefetchHrefs = useMemo(() => {
    const hrefs = new Set<string>();
    if (dashboardHref) hrefs.add(personaHome);
    if (profileHref) hrefs.add(profileHref);
    if (activityHref) hrefs.add(activityHref);
    growthLinks.forEach((l) => hrefs.add(l.href));
    practiceLinks.forEach((l) => hrefs.add(l.href));
    saasLinks?.links.forEach((l) => hrefs.add(l.href));
    saasLinks?.settingsLinks.forEach((l) => hrefs.add(l.href));
    if (adminModeEnabled) hrefs.add("/admin");
    if (!loggedIn) {
      hrefs.add("/auth/login");
      hrefs.add("/auth/register");
      hrefs.add("/pricing");
      hrefs.add("/diagnosis");
      hrefs.add("/demo");
    }
    return [...hrefs];
  }, [
    activityHref,
    adminModeEnabled,
    dashboardHref,
    growthLinks,
    loggedIn,
    personaHome,
    practiceLinks,
    profileHref,
    saasLinks,
  ]);

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
    const priority = [personaHome, profileHref, ...growthLinks.map((l) => l.href)].filter(
      (h): h is string => !!h,
    );
    for (const href of priority.slice(0, 4)) {
      router.prefetch(href);
    }
    const rest = prefetchHrefs.filter((h) => !priority.includes(h));
    const timer = window.setTimeout(() => {
      for (const href of rest) router.prefetch(href);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [growthLinks, open, personaHome, prefetchHrefs, profileHref, router]);

  const linkClass = (href: string, indent = false) =>
    `keep-one-line rounded-lg py-2.5 hover:bg-gold/10 ${indent ? "pl-5 pr-3" : "px-3"} ${
      pathname === href.split("#")[0] || pathname.startsWith(`${href.split("#")[0]}/`)
        ? "bg-gold/15 font-semibold text-foreground shadow-[inset_3px_0_0_var(--color-gold)]"
        : "text-foreground"
    }`;

  const growthActive = growthLinks.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  );
  const practiceActive = practiceLinks.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  );

  const drawer = open && (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
      <div className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col bg-card p-5 shadow-luxe">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          {userName ? (
            <ClipDynamic
              as="span"
              className="font-medium text-foreground"
              title={locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            >
              {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            </ClipDynamic>
          ) : (
            <span className="font-medium text-foreground">{c.menu}</span>
          )}
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-gold/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loggedIn && orgWorkspaceAvailable && (
          <div className="mb-4">
            <WorkspaceSwitcher mode={mode} onChange={setMode} />
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
          {!loggedIn && guestMenu ? (
            <>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {c.nav.products}
              </p>
              <MobileNavLink href="/demo" onNavigate={closeDrawer} className={linkClass("/demo")}>
                {c.guestProducts.trialInterview}
              </MobileNavLink>
              <MobileNavLink href="/discover" onNavigate={closeDrawer} className={linkClass("/discover")}>
                {c.guestProducts.discover}
              </MobileNavLink>
              <MobileNavLink
                href="/auth/register?next=/interview/setup"
                onNavigate={closeDrawer}
                className={linkClass("/auth/register")}
              >
                {c.guestProducts.interview}
              </MobileNavLink>
              <MobileNavLink href="/diagnosis" onNavigate={closeDrawer} className={linkClass("/diagnosis")}>
                {c.guestProducts.orgDiagnosis}
              </MobileNavLink>
              <MobileNavLink href="/org/setup" onNavigate={closeDrawer} className={linkClass("/org/setup")}>
                {c.guestProducts.forOrganizations}
              </MobileNavLink>
              <MobileNavLink href="/pricing" onNavigate={closeDrawer} className={linkClass("/pricing")}>
                {c.nav.pricing}
              </MobileNavLink>
            </>
          ) : mode === "org" && orgWorkspaceAvailable && saasLinks ? (
            <>
              {saasLinks.links.map((l) => (
                <MobileNavLink
                  key={l.href}
                  href={l.href}
                  onNavigate={closeDrawer}
                  className={linkClass(l.href)}
                >
                  {c.saas[l.labelKey]}
                </MobileNavLink>
              ))}
              {saasLinks.settingsLinks.map((l) => (
                <MobileNavLink
                  key={l.href}
                  href={l.href}
                  onNavigate={closeDrawer}
                  className={linkClass(l.href)}
                >
                  {c.saas[l.labelKey]}
                </MobileNavLink>
              ))}
            </>
          ) : (
            <>
              {dashboardHref && (
                <a href={personaHome} onClick={closeDrawer} className={linkClass(personaHome)}>
                  {c.nav.dashboard}
                </a>
              )}

              {activityHref && (
                <MobileNavLink
                  href={activityHref}
                  onNavigate={closeDrawer}
                  className={linkClass(activityHref)}
                >
                  {getMobileNavLabel("activity", dict)}
                </MobileNavLink>
              )}

              {growthLinks.length > 0 && (
                <AccordionSection
                  title={c.nav.growth}
                  defaultOpen={growthActive}
                  active={growthActive}
                >
                  {growthLinks.map((l) => (
                    <MobileNavLink
                      key={l.href}
                      href={l.href}
                      onNavigate={closeDrawer}
                      className={linkClass(l.href, true)}
                    >
                      {dict.common.navLong[l.labelKey]}
                    </MobileNavLink>
                  ))}
                </AccordionSection>
              )}

              {practiceLinks.length > 0 && (
                <AccordionSection
                  title={c.nav.practice}
                  defaultOpen={practiceActive}
                  active={practiceActive}
                >
                  {practiceLinks.map((l) => (
                    <MobileNavLink
                      key={l.href}
                      href={l.href}
                      onNavigate={closeDrawer}
                      className={linkClass(l.href, true)}
                    >
                      {dict.common.navLong[l.labelKey]}
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
            </>
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
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={c.menu}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold hover:bg-gold/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}

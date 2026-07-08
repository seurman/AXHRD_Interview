"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { getMobileNavLabel } from "./MainNav";
import { ClipDynamic } from "@/components/ui/ClipDynamic";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AdminNavSection, PrepareLabelKey } from "@/lib/platform/nav-registry";

type SaasLinksConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" }[];
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

export function MobileNav({
  dashboardHref,
  prepareLinks,
  profileHref,
  adminSections,
  saasLinks,
  userName,
  loggedIn,
}: {
  dashboardHref: string | null;
  prepareLinks: { href: string; labelKey: PrepareLabelKey }[];
  profileHref: string | null;
  adminSections: AdminNavSection[];
  saasLinks?: SaasLinksConfig | null;
  userName?: string;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const c = dict.common;

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
  const adminActive = adminSections.some((s) =>
    s.links.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
  );

  const prepareLabelKey: Record<PrepareLabelKey, "interview" | "discover" | "cards" | "resumeReview"> = {
    interview: "interview",
    resumeReview: "resumeReview",
    discover: "discover",
    cards: "cards",
  };

  const drawer = open && (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
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
            onClick={() => setOpen(false)}
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
            <Link
              href={dashboardHref}
              onClick={() => setOpen(false)}
              className={linkClass(dashboardHref)}
            >
              {getMobileNavLabel("dashboard", dict)}
            </Link>
          )}

          {prepareLinks.length > 0 && (
            <AccordionSection
              title={c.nav.prepare}
              defaultOpen={prepareActive}
              active={prepareActive}
            >
              {prepareLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={linkClass(l.href, true)}
                >
                  {getMobileNavLabel(prepareLabelKey[l.labelKey], dict)}
                </Link>
              ))}
            </AccordionSection>
          )}

          {profileHref && (
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className={linkClass(profileHref)}
            >
              {getMobileNavLabel("profile", dict)}
            </Link>
          )}

          {saasLinks && (
            <AccordionSection title={c.saas.title} defaultOpen={saasActive} active={saasActive}>
              {saasLinks.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={linkClass(l.href, true)}
                >
                  {c.saas[l.labelKey]}
                </Link>
              ))}
              {saasLinks.settingsLinks.length > 0 && (
                <>
                  <p className="keep-one-line mb-0.5 mt-2 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {c.saas.settings}
                  </p>
                  {saasLinks.settingsLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={linkClass(l.href, true)}
                    >
                      {c.saas[l.labelKey]}
                    </Link>
                  ))}
                </>
              )}
            </AccordionSection>
          )}

          {adminSections.length > 0 && (
            <AccordionSection title={c.admin.title} defaultOpen={adminActive} active={adminActive}>
              {adminSections.map((section) => (
                <div key={section.sectionKey} className="mb-1">
                  <p className="keep-one-line mb-0.5 mt-2 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {c.admin.sections[section.sectionKey]}
                  </p>
                  {section.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={linkClass(l.href, true)}
                    >
                      {c.admin[l.labelKey]}
                    </Link>
                  ))}
                </div>
              ))}
            </AccordionSection>
          )}
        </nav>

        <div className="shrink-0 border-t border-card-border pt-4">
          {loggedIn ? (
            <div className="flex items-center justify-between px-3">
              <span className="keep-one-line text-sm text-muted">{c.auth.logout}</span>
              <LogoutButton label={c.auth.logout} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="btn-secondary w-full"
              >
                {c.auth.login}
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                {c.auth.register}
              </Link>
            </div>
          )}
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

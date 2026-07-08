"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getMobileNavLabel } from "./MainNav";
import { useI18n } from "@/lib/i18n/I18nProvider";

type AdminLink = {
  href: string;
  labelKey: "content" | "demo" | "permissions" | "users" | "audit" | "orgApprove" | "orgBenchmark" | "subscriptions";
};

type SaasLinksConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export function MobileNav({
  mainHrefs,
  adminLinks,
  saasLinks,
  userName,
  loggedIn,
}: {
  mainHrefs: string[];
  adminLinks?: AdminLink[];
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

  const drawer = open && (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col bg-card p-5 shadow-luxe">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          {userName ? (
            <span className="truncate font-medium text-foreground">
              {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            </span>
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

        <div className="mb-4">
          <LanguageSwitcher compact />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
          {mainHrefs.map((href) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`keep-one-line rounded-lg px-3 py-2.5 hover:bg-primary/5 ${
                pathname.startsWith(href)
                  ? "bg-primary/5 font-medium text-primary"
                  : "text-foreground"
              }`}
            >
              {getMobileNavLabel(href, dict)}
            </Link>
          ))}

          {saasLinks && (
            <>
              <p className="keep-one-line mb-1 mt-4 px-3 text-xs font-semibold text-gold">
                {c.saas.title}
              </p>
              {saasLinks.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`keep-one-line rounded-lg px-3 py-2.5 hover:bg-primary/5 ${
                    pathname.startsWith(l.href)
                      ? "bg-primary/5 font-medium text-primary"
                      : "text-foreground"
                  }`}
                >
                  {c.saas[l.labelKey]}
                </Link>
              ))}
              {saasLinks.settingsLinks.length > 0 && (
                <>
                  <p className="keep-one-line mb-1 mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {c.saas.settings}
                  </p>
                  {saasLinks.settingsLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`keep-one-line rounded-lg py-2.5 pl-5 pr-3 hover:bg-primary/5 ${
                        pathname.startsWith(l.href)
                          ? "bg-primary/5 font-medium text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {c.saas[l.labelKey]}
                    </Link>
                  ))}
                </>
              )}
            </>
          )}

          {adminLinks && adminLinks.length > 0 && (
            <>
              <p className="keep-one-line mb-1 mt-4 px-3 text-xs font-semibold text-gold">
                {c.admin.title}
              </p>
              {adminLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`keep-one-line rounded-lg px-3 py-2.5 hover:bg-primary/5 ${
                    pathname.startsWith(l.href)
                      ? "bg-primary/5 font-medium text-primary"
                      : "text-foreground"
                  }`}
                >
                  {c.admin[l.labelKey]}
                </Link>
              ))}
            </>
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

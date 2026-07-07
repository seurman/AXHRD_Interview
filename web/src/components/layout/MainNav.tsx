"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { AdminNavMenu } from "./AdminNavMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";

const navKeyMap = {
  "/dashboard": "dashboard",
  "/discover": "discover",
  "/interview/setup": "interview",
  "/practice/swipe": "cards",
  "/profile": "profile",
  "/org/dashboard": "cohort",
} as const;

export function MainNav({
  mainHrefs,
  adminLinks,
  userName,
  loggedIn,
}: {
  mainHrefs: string[];
  adminLinks: { href: string; labelKey: "content" | "users" | "orgApprove" | "orgBenchmark" }[];
  userName?: string;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const c = dict.common;

  if (!loggedIn) {
    return (
      <nav className="hidden items-center gap-2 sm:flex">
        <LanguageSwitcher />
        <Link href="/auth/login" className="nav-pill">
          {c.auth.login}
        </Link>
        <Link href="/auth/register" className="nav-pill nav-pill-gold">
          {c.auth.register}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1.5 lg:gap-2 sm:flex">
      {userName && (
        <span className="mr-1 hidden text-xs font-medium text-white/50 user-greeting xl:inline">
          {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
        </span>
      )}
      {mainHrefs.map((href) => {
        const key = navKeyMap[href as keyof typeof navKeyMap];
        const label = key ? c.nav[key] : href;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-pill ${active ? "nav-pill-active" : ""}`}
          >
            {label}
          </Link>
        );
      })}
      <AdminNavMenu
        links={adminLinks.map((l) => ({
          href: l.href,
          label: c.admin[l.labelKey],
        }))}
      />
      <LanguageSwitcher />
      <LogoutButton variant="nav" label={c.auth.logout} />
    </nav>
  );
}

/** 모바일용 긴 라벨 */
export function getMobileNavLabel(
  href: string,
  dict: ReturnType<typeof useI18n>["dict"]
): string {
  const key = navKeyMap[href as keyof typeof navKeyMap];
  return key ? dict.common.navLong[key] : href;
}

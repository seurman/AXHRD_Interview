"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useNavSession } from "@/components/layout/NavSessionProvider";
import { Logo } from "@/components/brand/Logo";
import { MobileNav } from "./MobileNav";
import { MainNav } from "./MainNav";
import { BillingPastDueBanner } from "@/components/billing/BillingPastDueBanner";

export function AppHeader() {
  const { dict } = useI18n();
  const nav = useNavSession();

  const loggedIn = nav?.loggedIn ?? false;
  const dashboardHref = nav?.dashboardHref ?? null;
  const prepareLinks = nav?.prepareLinks ?? [];
  const profileHref = nav?.profileHref ?? null;
  const saasLinks = nav?.saasLinks ?? null;
  const adminSections = nav?.adminSections ?? [];
  const userName = nav?.userName ?? undefined;

  return (
    <>
      <BillingPastDueBanner />
      <header className="header-premium sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-3.5">
          <Link
            href="/"
            className="axhrd-logo axhrd-logo--md group min-w-0 shrink"
            aria-label={`${dict.common.brand} home`}
          >
            <Logo size={28} />
          </Link>

          <MainNav
            adminSections={adminSections}
            dashboardHref={dashboardHref}
            loggedIn={loggedIn}
            prepareLinks={prepareLinks}
            profileHref={profileHref}
            saasLinks={saasLinks}
            userName={userName}
          />

          <MobileNav
            adminSections={adminSections}
            dashboardHref={dashboardHref}
            loggedIn={loggedIn}
            prepareLinks={prepareLinks}
            profileHref={profileHref}
            saasLinks={saasLinks}
            userName={userName}
          />
        </div>
      </header>
    </>
  );
}

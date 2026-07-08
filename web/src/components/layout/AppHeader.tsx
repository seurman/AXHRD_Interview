"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useNavSession } from "@/components/layout/NavSessionProvider";
import { MobileNav } from "./MobileNav";
import { MainNav } from "./MainNav";
import { BillingPastDueBanner } from "@/components/billing/BillingPastDueBanner";

export function AppHeader() {
  const { dict } = useI18n();
  const nav = useNavSession();
  const brand = dict.common.brand;

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
          <Link href="/" className="group flex min-w-0 shrink items-center gap-2.5">
            <span className="brand-mark flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-[10px] font-bold text-gold">
              AX
            </span>
            <span className="brand-text keep-one-line text-sm font-semibold tracking-[0.14em] text-gold sm:text-base">
              {brand}
            </span>
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

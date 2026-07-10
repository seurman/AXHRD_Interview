"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useNavSessionContext } from "@/components/layout/NavSessionProvider";
import { Logo } from "@/components/brand/Logo";
import { MobileNav } from "./MobileNav";
import { MainNav } from "./MainNav";
import { BillingPastDueBanner } from "@/components/billing/BillingPastDueBanner";
import { deriveHeaderLinks, deriveAdminModeEnabled } from "@/lib/nav/header-links";
import { useMemo } from "react";

export function AppHeader() {
  const { dict } = useI18n();
  const { nav, loading } = useNavSessionContext();

  const navReady = nav !== null;
  const loggedIn = nav?.loggedIn === true;
  const dashboardHref = nav?.dashboardHref ?? null;
  const prepareLinks = nav?.prepareLinks ?? [];
  const profileHref = nav?.profileHref ?? null;
  const saasLinks = nav?.saasLinks ?? null;
  const headerLinks = useMemo(() => deriveHeaderLinks(nav), [nav]);
  const adminModeEnabled = useMemo(() => deriveAdminModeEnabled(nav), [nav]);
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
            dashboardHref={dashboardHref}
            loggedIn={loggedIn}
            prepareLinks={prepareLinks}
            profileHref={profileHref}
            saasLinks={saasLinks}
            headerLinks={headerLinks}
            adminModeEnabled={adminModeEnabled}
            userName={userName}
            loading={!navReady && loading}
          />

          <MobileNav
            dashboardHref={dashboardHref}
            loggedIn={loggedIn}
            guestMenu={navReady && !loggedIn}
            loading={!navReady && loading}
            prepareLinks={prepareLinks}
            profileHref={profileHref}
            saasLinks={saasLinks}
            headerLinks={headerLinks}
            adminModeEnabled={adminModeEnabled}
            userName={userName}
          />
        </div>
      </header>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavSessionContext } from "@/components/layout/NavSessionProvider";
import { deriveAdminModeEnabled } from "@/lib/nav/header-links";
import { MainNav } from "./MainNav";
import { MobileNav } from "./MobileNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { useWorkspaceMode } from "@/lib/nav/workspace";
import { Logo } from "@/components/brand/Logo";
import { BillingPastDueBanner } from "@/components/billing/BillingPastDueBanner";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function AppHeader() {
  const { dict } = useI18n();
  const { nav, loading } = useNavSessionContext();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navReady = nav !== null;
  const loggedIn = nav?.loggedIn === true;
  const orgWorkspaceAvailable = nav?.orgWorkspaceAvailable ?? false;
  const { mode } = useWorkspaceMode(orgWorkspaceAvailable);
  const adminModeEnabled = useMemo(
    () => deriveAdminModeEnabled(nav),
    [nav],
  );

  const showBottomNav = loggedIn && navReady;

  useEffect(() => {
    if (!showBottomNav) {
      document.body.classList.remove("has-mobile-bottom-nav");
      return;
    }
    document.body.classList.add("has-mobile-bottom-nav");
    return () => document.body.classList.remove("has-mobile-bottom-nav");
  }, [showBottomNav]);

  return (
    <>
      <BillingPastDueBanner />
      <header className="header-premium sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-3.5">
          <a
            href={loggedIn && nav?.dashboardHref ? nav.dashboardHref : "/"}
            className="axhrd-logo axhrd-logo--md group min-w-0 shrink"
            aria-label={`${dict.common.brand} home`}
          >
            <Logo size={28} />
          </a>

          <MainNav
            dashboardHref={nav?.dashboardHref ?? null}
            growthLinks={nav?.growthLinks ?? []}
            practiceLinks={nav?.practiceLinks ?? []}
            activityHref={nav?.activityHref ?? null}
            profileHref={nav?.profileHref ?? null}
            saasLinks={nav?.saasLinks ?? null}
            orgWorkspaceAvailable={orgWorkspaceAvailable}
            adminModeEnabled={adminModeEnabled}
            userName={nav?.userName ?? undefined}
            loggedIn={loggedIn}
            loading={!navReady && loading}
          />

          <MobileNav
            dashboardHref={nav?.dashboardHref ?? null}
            growthLinks={nav?.growthLinks ?? []}
            practiceLinks={nav?.practiceLinks ?? []}
            activityHref={nav?.activityHref ?? null}
            profileHref={nav?.profileHref ?? null}
            saasLinks={nav?.saasLinks ?? null}
            orgWorkspaceAvailable={orgWorkspaceAvailable}
            loggedIn={loggedIn}
            guestMenu={navReady && !loggedIn}
            loading={!navReady && loading}
            adminModeEnabled={adminModeEnabled}
            userName={nav?.userName ?? undefined}
            drawerOpen={mobileDrawerOpen}
            onDrawerOpenChange={setMobileDrawerOpen}
            hideTrigger={showBottomNav}
          />
        </div>
      </header>

      {showBottomNav && (
        <MobileBottomNav
          loggedIn={loggedIn}
          mode={mode}
          orgAvailable={orgWorkspaceAvailable}
          onMore={() => setMobileDrawerOpen(true)}
        />
      )}
    </>
  );
}

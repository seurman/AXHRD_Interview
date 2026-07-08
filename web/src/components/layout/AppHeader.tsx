import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin } from "@/lib/auth/guards";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { buildNavigationForUser } from "@/lib/platform/nav-registry";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import { MobileNav } from "./MobileNav";
import { MainNav } from "./MainNav";
import { BillingPastDueBanner } from "@/components/billing/BillingPastDueBanner";

export async function AppHeader() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const brand = dict.common.brand;

  const sessionUser = await getCurrentUser();
  if (sessionUser && isSuperadmin(sessionUser.email)) {
    await syncSuperadminPlatformRole(sessionUser.id, sessionUser.email);
  }
  const user =
    sessionUser && isSuperadmin(sessionUser.email)
      ? { ...sessionUser, platformRole: "SUPERADMIN" as const }
      : sessionUser;

  const nav = user
    ? await buildNavigationForUser({
        email: user.email,
        platformRole: user.platformRole,
        orgRole: user.orgRole,
        organizationId: user.organizationId,
      })
    : null;

  const mainHrefs = nav?.mainHrefs ?? [];
  const saasLinks = nav?.saasLinks ?? null;
  const adminLinks = nav?.adminLinks ?? [];

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
          adminLinks={adminLinks}
          loggedIn={!!user}
          mainHrefs={mainHrefs}
          saasLinks={saasLinks}
          userName={user?.name}
        />

        <MobileNav
          adminLinks={adminLinks}
          loggedIn={!!user}
          mainHrefs={mainHrefs}
          saasLinks={saasLinks}
          userName={user?.name}
        />
      </div>
    </header>
    </>
  );
}

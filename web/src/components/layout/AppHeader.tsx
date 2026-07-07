import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess, isPlatformAdmin, isSuperadmin } from "@/lib/auth/guards";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { MobileNav } from "./MobileNav";
import { MainNav } from "./MainNav";
import { BillingPastDueBanner } from "@/components/billing/BillingPastDueBanner";

export async function AppHeader() {
  const sessionUser = await getCurrentUser();
  if (sessionUser && isSuperadmin(sessionUser.email)) {
    await syncSuperadminPlatformRole(sessionUser.id, sessionUser.email);
  }
  const user =
    sessionUser && isSuperadmin(sessionUser.email)
      ? { ...sessionUser, platformRole: "SUPERADMIN" as const }
      : sessionUser;
  const isOrgStaff = !!user && (user.orgRole === "STAFF" || user.orgRole === "ADMIN");
  const isOrgAdmin = !!user && user.orgRole === "ADMIN";
  const isSuperAdmin = !!user && hasSuperadminAccess(user);
  const isPlatformAdminUser = !!user && isPlatformAdmin(user);

  const mainHrefs = user
    ? [
        "/dashboard",
        "/discover",
        "/interview/setup",
        "/practice/swipe",
        "/profile",
      ]
    : [];

  const saasLinks = user && isOrgStaff
    ? {
        titleKey: "saas" as const,
        links: [{ href: "/org/dashboard", labelKey: "cohortDashboard" as const }],
        settingsTitleKey: "settings" as const,
        settingsLinks: isOrgAdmin
          ? [{ href: "/org/saas/settings", labelKey: "settingsHub" as const }]
          : [],
      }
    : null;

  const adminLinks = user
    ? [
        ...(isPlatformAdminUser ? [{ href: "/admin/content", labelKey: "content" as const }] : []),
        ...(isSuperAdmin
          ? [
              { href: "/admin/users", labelKey: "users" as const },
              { href: "/admin/audit", labelKey: "audit" as const },
              { href: "/admin/organizations", labelKey: "orgApprove" as const },
              { href: "/admin/organizations/benchmark", labelKey: "orgBenchmark" as const },
              { href: "/admin/subscriptions", labelKey: "subscriptions" as const },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <BillingPastDueBanner />
      <header className="header-premium sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-3.5">
        <Link href="/" className="group flex min-w-0 shrink items-center gap-2.5">
          <span className="brand-mark flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-xs font-bold text-gold">
            H
          </span>
          <span className="brand-text keep-one-line text-sm font-semibold tracking-[0.18em] text-gold sm:text-base">
            HR_IN
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

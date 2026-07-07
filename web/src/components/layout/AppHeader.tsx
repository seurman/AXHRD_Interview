import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageContent, hasSuperadminAccess, isSuperadmin } from "@/lib/auth/guards";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { MobileNav } from "./MobileNav";
import { MainNav } from "./MainNav";

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
  const isSuperAdmin = !!user && hasSuperadminAccess(user);
  const isContentAdmin = !!user && canManageContent(user);

  const mainLinks = user
    ? [
        { href: "/dashboard", label: "역량" },
        { href: "/discover", label: "발견" },
        { href: "/interview/setup", label: "면접" },
        { href: "/practice/swipe", label: "카드" },
        { href: "/profile", label: "프로필" },
        ...(isOrgStaff ? [{ href: "/org/dashboard", label: "코호트" }] : []),
      ]
    : [];

  const adminLinks = user
    ? [
        ...(isContentAdmin ? [{ href: "/admin/content", label: "문항 관리" }] : []),
        ...(isSuperAdmin
          ? [
              { href: "/admin/users", label: "사용자 권한" },
              { href: "/admin/organizations", label: "기관 승인" },
              { href: "/admin/organizations/benchmark", label: "기관 비교" },
            ]
          : []),
      ]
    : [];

  return (
    <header className="header-premium sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-3.5">
        <Link href="/" className="group flex min-w-0 shrink items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-xs font-bold text-gold">
            H
          </span>
          <span className="keep-one-line text-sm font-semibold tracking-[0.18em] text-gold sm:text-base">
            HR_IN
          </span>
        </Link>

        <MainNav
          adminLinks={adminLinks}
          loggedIn={!!user}
          mainLinks={mainLinks}
          userName={user?.name}
        />

        <MobileNav
          adminLinks={adminLinks}
          loggedIn={!!user}
          mainLinks={mainLinks.map((l) => ({
            ...l,
            label:
              l.href === "/dashboard"
                ? "역량 트래킹"
                : l.href === "/discover"
                  ? "나를 발견하기"
                  : l.href === "/interview/setup"
                    ? "면접 시작"
                    : l.href === "/practice/swipe"
                      ? "질문 카드"
                      : l.label,
          }))}
          userName={user?.name}
        />
      </div>
    </header>
  );
}

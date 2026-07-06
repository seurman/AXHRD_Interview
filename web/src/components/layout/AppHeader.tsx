import Link from "next/link";
import { Mic2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageContent, hasSuperadminAccess } from "@/lib/auth/guards";
import { LogoutButton } from "./LogoutButton";
import { MobileNav } from "./MobileNav";
import { AdminNavMenu } from "./AdminNavMenu";

export async function AppHeader() {
  const user = await getCurrentUser();
  const isOrgStaff = !!user && (user.orgRole === "STAFF" || user.orgRole === "ADMIN");
  const isSuperAdmin = !!user && hasSuperadminAccess(user);
  const isContentAdmin = !!user && canManageContent(user);

  const mainLinks = user
    ? [
        { href: "/dashboard", label: "역량 트래킹" },
        { href: "/interview/setup", label: "면접 시작" },
        { href: "/practice/swipe", label: "질문 카드" },
        { href: "/profile", label: "프로필" },
        ...(isOrgStaff ? [{ href: "/org/dashboard", label: "코호트 대시보드" }] : []),
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
    <header className="sticky top-0 z-40 border-b border-card-border bg-card/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 font-semibold text-primary"
        >
          <Mic2 className="h-6 w-6 shrink-0 text-gold" />
          <span className="keep-one-line text-sm sm:text-base">HR_IN</span>
          <span className="keep-one-line hidden rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold min-[400px]:inline-flex">
            Premium
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-muted sm:flex">
          {user ? (
            <>
              <span className="hidden text-foreground lg:inline">{user.name}님</span>
              {mainLinks.map((l) => (
                <Link key={l.href} href={l.href} className="keep-one-line hover:text-primary">
                  {l.label}
                </Link>
              ))}
              <AdminNavMenu links={adminLinks} />
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hover:text-primary">
                로그인
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-primary px-3 py-1.5 text-white hover:opacity-90"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>

        <MobileNav
          adminLinks={adminLinks}
          userName={user?.name}
          loggedIn={!!user}
          mainLinks={mainLinks}
        />
      </div>
    </header>
  );
}

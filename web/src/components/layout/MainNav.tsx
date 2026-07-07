"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { AdminNavMenu } from "./AdminNavMenu";

type NavLink = { href: string; label: string };

export function MainNav({
  mainLinks,
  adminLinks,
  userName,
  loggedIn,
}: {
  mainLinks: NavLink[];
  adminLinks: NavLink[];
  userName?: string;
  loggedIn: boolean;
}) {
  const pathname = usePathname();

  if (!loggedIn) {
    return (
      <nav className="hidden items-center gap-2 sm:flex">
        <Link href="/auth/login" className="nav-pill">
          로그인
        </Link>
        <Link href="/auth/register" className="nav-pill nav-pill-gold">
          회원가입
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1.5 lg:gap-2 sm:flex">
      {userName && (
        <span className="mr-1 hidden text-xs font-medium text-white/50 xl:inline">
          {userName}님
        </span>
      )}
      {mainLinks.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-pill ${active ? "nav-pill-active" : ""}`}
          >
            {l.label}
          </Link>
        );
      })}
      <AdminNavMenu links={adminLinks} />
      <LogoutButton variant="nav" />
    </nav>
  );
}

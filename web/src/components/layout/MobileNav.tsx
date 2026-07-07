"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

type NavLink = { href: string; label: string };

export function MobileNav({
  mainLinks,
  adminLinks,
  userName,
  loggedIn,
}: {
  mainLinks: NavLink[];
  adminLinks?: NavLink[];
  userName?: string;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const drawer = open && (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col bg-card p-5 shadow-luxe">
        <div className="mb-6 flex min-w-0 items-center justify-between gap-2">
          {userName ? (
            <span className="truncate font-medium text-foreground">{userName}님</span>
          ) : (
            <span className="font-medium text-foreground">메뉴</span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-primary/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm">
          {mainLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`keep-one-line rounded-lg px-3 py-2.5 hover:bg-primary/5 ${
                pathname.startsWith(l.href)
                  ? "bg-primary/5 font-medium text-primary"
                  : "text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {adminLinks && adminLinks.length > 0 && (
            <>
              <p className="keep-one-line mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-gold">
                관리자
              </p>
              {adminLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`keep-one-line rounded-lg px-3 py-2.5 hover:bg-primary/5 ${
                    pathname.startsWith(l.href)
                      ? "bg-primary/5 font-medium text-primary"
                      : "text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-card-border pt-4">
          {loggedIn ? (
            <div className="flex items-center justify-between px-3">
              <span className="keep-one-line text-sm text-muted">로그아웃</span>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="btn-secondary w-full"
              >
                로그인
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="shrink-0 sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold hover:bg-gold/10"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}

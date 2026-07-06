"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

type NavLink = { href: string; label: string };

export function MobileNav({
  links,
  userName,
  loggedIn,
}: {
  links: NavLink[];
  userName?: string;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  // 헤더에 backdrop-blur(= CSS backdrop-filter)가 걸려 있으면 그 헤더가 자신의
  // fixed 자손들의 containing block이 돼 버려서(스펙상 filter/backdrop-filter가
  // 그렇게 만듦), 드로어를 헤더 안에 그대로 두면 전체 화면이 아니라 헤더 높이
  // 안에서만 "fixed"로 처리돼 배경 콘텐츠와 겹쳐 보이는 문제가 있었다.
  // body에 포탈로 그려서 헤더의 containing block 밖으로 완전히 빼낸다.
  const [mounted, setMounted] = useState(false);

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
      <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-card p-5 shadow-luxe">
        <div className="mb-6 flex items-center justify-between">
          {userName ? (
            <span className="font-medium text-foreground">{userName}님</span>
          ) : (
            <span className="font-medium text-foreground">메뉴</span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-primary/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground hover:bg-primary/5"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-card-border pt-4">
          {loggedIn ? (
            <div className="flex items-center justify-between px-3">
              <span className="text-sm text-muted">로그아웃</span>
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
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-primary/5"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}

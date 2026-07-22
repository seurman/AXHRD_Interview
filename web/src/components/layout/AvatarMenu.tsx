"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { AdminModeButton } from "./AdminModeButton";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function AvatarMenu({
  userName,
  profileHref,
  adminModeEnabled,
}: {
  userName?: string;
  profileHref: string | null;
  adminModeEnabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const c = dict.common;
  const a = c.avatar;

  const initial = (userName?.trim()?.[0] ?? "U").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const itemClass = (active: boolean) =>
    [
      "avatar-menu-item flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold no-underline",
      "!text-slate-100 hover:!bg-slate-700/70 hover:!text-white",
      active ? "!text-sky-300" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="avatar-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        title={userName ? (locale === "ko" ? `${userName}${c.userSuffix}` : userName) : a.menu}
      >
        <span className="avatar-menu-trigger__badge" aria-hidden>
          {initial}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="avatar-menu-panel absolute right-0 top-[calc(100%+0.5rem)] z-[60] min-w-[13rem] overflow-hidden rounded-xl border border-slate-600/50 !bg-[#0b1220] !text-slate-50 py-2 shadow-[0_18px_44px_rgb(0_0_0_/_0.45)]"
        >
          {userName && (
            <p className="avatar-menu-panel__name px-3.5 pb-2 pt-1 text-sm font-semibold !text-slate-50">
              {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            </p>
          )}

          {profileHref && (
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass(
                pathname === profileHref || pathname.startsWith(`${profileHref}/`),
              )}
            >
              <User className="h-4 w-4 shrink-0 !text-slate-300" />
              {a.profile}
            </Link>
          )}

          <Link
            href="/pricing"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass(pathname === "/pricing")}
          >
            {a.billing}
          </Link>

          <div className="avatar-menu-panel__prefs flex items-center gap-1.5 px-3 py-2">
            <LanguageSwitcher compact />
            <ThemeSwitcher
              compact
              className="!border-slate-500/60 !bg-slate-800 !text-slate-100 hover:!bg-slate-700"
            />
          </div>

          {adminModeEnabled && (
            <div className="px-2 py-1">
              <AdminModeButton label={c.auth.adminMode} variant="drawer" />
            </div>
          )}

          <div className="border-t border-slate-600/50 px-2 pt-2">
            <LogoutButton variant="drawer" label={c.auth.logout} />
          </div>
        </div>
      )}
    </div>
  );
}

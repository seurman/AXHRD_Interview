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
        <div role="menu" className="avatar-menu-panel">
          {userName && (
            <p className="avatar-menu-panel__name">
              {locale === "ko" ? `${userName}${c.userSuffix}` : userName}
            </p>
          )}

          {profileHref && (
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`avatar-menu-item ${pathname === profileHref || pathname.startsWith(`${profileHref}/`) ? "avatar-menu-item--active" : ""}`}
            >
              <User className="h-4 w-4 shrink-0 opacity-70" />
              {a.profile}
            </Link>
          )}

          <Link
            href="/pricing"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`avatar-menu-item ${pathname === "/pricing" ? "avatar-menu-item--active" : ""}`}
          >
            {a.billing}
          </Link>

          <div className="avatar-menu-panel__prefs">
            <LanguageSwitcher compact />
            <ThemeSwitcher compact />
          </div>

          {adminModeEnabled && (
            <div className="px-2 py-1">
              <AdminModeButton label={c.auth.adminMode} variant="drawer" />
            </div>
          )}

          <div className="border-t border-card-border px-2 pt-2">
            <LogoutButton variant="drawer" label={c.auth.logout} />
          </div>
        </div>
      )}
    </div>
  );
}

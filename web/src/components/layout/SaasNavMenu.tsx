"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NavLink = { href: string; label: string };

type Props = {
  title: string;
  links: NavLink[];
  settingsTitle?: string;
  settingsLinks?: NavLink[];
};

export function SaasNavMenu({ title, links, settingsTitle, settingsLinks }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const allHrefs = [...links, ...(settingsLinks ?? [])];
  const active = allHrefs.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (links.length === 0 && (!settingsLinks || settingsLinks.length === 0)) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nav-pill inline-flex items-center gap-1 ${active ? "nav-pill-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-white/10 bg-[#121a2e] py-1 shadow-2xl"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 text-sm keep-one-line transition hover:bg-white/5 ${
                pathname === l.href || pathname.startsWith(`${l.href}/`)
                  ? "font-medium text-gold"
                  : "text-white/80"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {settingsLinks && settingsLinks.length > 0 && (
            <>
              <div className="my-1 border-t border-white/10" />
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {settingsTitle ?? "설정"}
              </p>
              {settingsLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 pl-5 text-sm keep-one-line transition hover:bg-white/5 ${
                    pathname === l.href || pathname.startsWith(`${l.href}/`)
                      ? "font-medium text-gold"
                      : "text-white/80"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

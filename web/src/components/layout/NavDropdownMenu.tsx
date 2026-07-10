"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavTransitionLink } from "@/components/layout/NavTransitionLink";

type NavLink = { href: string; label: string };

type Section = { title: string; links: NavLink[] };

type Props = {
  title: string;
  /** Flat links (no section headers) */
  links?: NavLink[];
  /** Grouped sections — preferred for Admin */
  sections?: Section[];
};

export function NavDropdownMenu({ title, links = [], sections }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const flat = sections?.length
    ? sections.flatMap((s) => s.links)
    : links;
  const active = flat.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));

  useEffect(() => {
    if (!open) return;
    for (const l of flat) {
      router.prefetch(l.href);
    }
  }, [flat, open, router]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (flat.length === 0) return null;

  const renderLink = (l: NavLink) => (
    <NavTransitionLink
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
    </NavTransitionLink>
  );

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
          {sections && sections.length > 0
            ? sections.map((section, i) => (
                <div key={section.title}>
                  {i > 0 ? <div className="my-1 border-t border-white/10" /> : null}
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {section.title}
                  </p>
                  {section.links.map(renderLink)}
                </div>
              ))
            : links.map(renderLink)}
        </div>
      )}
    </div>
  );
}

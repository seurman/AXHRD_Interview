"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  FileSearch,
  LayoutGrid,
  Presentation,
  Scale,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import type { CapabilityId } from "@/lib/platform/capabilities";

const ICON_BY_CAPABILITY: Partial<Record<CapabilityId, LucideIcon>> = {
  "platform.permissions": Shield,
  "platform.users": Users,
  "platform.organizations": Building2,
  "platform.content": ClipboardList,
  "platform.demo": Presentation,
  "platform.subscriptions": Wallet,
  "platform.audit": FileSearch,
  "platform.benchmark": Scale,
};

type Item = { href: string; label: string; capability: CapabilityId };

export function PlatformConsoleSidebar({ items }: { items: Item[] }) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <aside className="hidden w-56 shrink-0 border-r border-card-border bg-card/40 lg:block">
      <div className="sticky top-[3.25rem] flex h-[calc(100vh-3.25rem)] flex-col p-4">
        <div className="mb-4 flex items-center gap-2 px-2">
          <LayoutGrid className="h-4 w-4 text-gold" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Platform</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICON_BY_CAPABILITY[item.capability];
            const active =
              pathname === item.href ||
              (item.href !== "/admin/permissions" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted hover:bg-primary/5 hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="mt-4 px-2 text-[10px] leading-relaxed text-muted">
          AX Configure · 모듈별 권한 스트라이프
        </p>
      </div>
    </aside>
  );
}

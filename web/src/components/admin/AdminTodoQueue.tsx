import Link from "next/link";
import { Badge } from "@/components/admin/Badge";
import { formatRelativeTime } from "@/lib/admin/relative-time";
import type { PlatformTodoItem } from "@/lib/admin/platform-home-data";

export function AdminTodoQueue({ items }: { items: PlatformTodoItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        지금 처리할 운영 항목이 없습니다. KPI와 모듈 바로가기를 확인하세요.
      </p>
    );
  }

  return (
    <ul className="-mx-4 -mb-4 border-t border-[var(--platform-border)] sm:-mx-5 sm:-mb-5 lg:-mx-6 lg:-mb-6">
      {items.map((item) => (
        <li key={item.id} className="border-b border-[var(--platform-border)] last:border-0">
          <Link
            href={item.href}
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 text-sm transition hover:bg-black/[0.03] sm:px-5 dark:hover:bg-white/[0.04] lg:px-6"
          >
            {item.urgent ? (
              <Badge tone="warning" className="w-16 shrink-0 justify-center">
                긴급
              </Badge>
            ) : (
              <Badge tone="neutral" className="w-16 shrink-0 justify-center">
                {item.kindLabel}
              </Badge>
            )}
            <span className="min-w-[10rem] flex-1">
              <span className="font-semibold text-foreground">{item.title}</span>
              {item.subtitle && <span className="text-muted"> · {item.subtitle}</span>}
            </span>
            {item.meta && <span className="shrink-0 text-xs text-muted">{item.meta}</span>}
            {item.at && (
              <span className="shrink-0 text-xs text-muted">{formatRelativeTime(item.at)}</span>
            )}
            <span className="ml-auto shrink-0 text-xs text-[var(--platform-accent)]">처리 →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

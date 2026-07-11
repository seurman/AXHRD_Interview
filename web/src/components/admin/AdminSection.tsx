import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * admin 섹션 래퍼 — id 앵커·제목·설명·우측 액션을 통일.
 * 플랫폼 콘솔 셸(platform-app)과 같은 표면 언어(platform-panel)를 사용해서
 * `/admin` 홈의 OverviewPanel과 시각적으로 동일하게 맞춘다.
 */
export function AdminSection({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("platform-panel overflow-hidden", id && "scroll-mt-6", className)}>
      <div className="platform-panel-header">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--platform-text)]">{title}</h2>
          {description && (
            <p className="mt-1 text-xs font-medium text-[var(--platform-text-muted)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="platform-panel-body">{children}</div>
    </section>
  );
}

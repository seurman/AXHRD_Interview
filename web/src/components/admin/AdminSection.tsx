import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** admin 섹션 래퍼 — id 앵커·제목·설명·우측 액션을 통일 */
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
    <section id={id} className={cn("card-luxe overflow-hidden", id && "scroll-mt-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-card-border px-6 py-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="px-6 py-4">{children}</div>
    </section>
  );
}

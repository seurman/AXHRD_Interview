"use client";

import { COMPETENCY_TO_QUADSCOPE, scopeDef, type QuadScopeId } from "@/lib/quadscope/scopes";
import { cn } from "@/lib/cn";

const TONE: Record<QuadScopeId, string> = {
  judgment: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  delivery: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  relations: "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-100",
  anchor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
};

export function QuadScopeBadge({
  competencyCode,
  scope: scopeProp,
  size = "sm",
  showKo = false,
  className,
}: {
  competencyCode?: string | null;
  scope?: QuadScopeId | null;
  size?: "sm" | "md";
  showKo?: boolean;
  className?: string;
}) {
  const scope =
    scopeProp ??
    (competencyCode ? COMPETENCY_TO_QUADSCOPE[competencyCode] ?? null : null);
  if (!scope) return null;
  const def = scopeDef(scope);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tracking-tight",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        TONE[scope],
        className,
      )}
      title={def.descriptionEn}
    >
      <span>{def.nameEn}</span>
      {showKo && <span className="opacity-70">{def.nameKo}</span>}
    </span>
  );
}

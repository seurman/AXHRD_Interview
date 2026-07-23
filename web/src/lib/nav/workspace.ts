"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export type WorkspaceMode = "personal" | "org";

const STORAGE_KEY = "axhrd-workspace";

export function pathnameWorkspace(pathname: string): WorkspaceMode {
  if (pathname === "/org" || pathname.startsWith("/org/")) return "org";
  return "personal";
}

export function defaultWorkspaceHref(mode: WorkspaceMode): string {
  // Personal home is persona-specific; /dashboard only redirects.
  // Client callers should prefer resolvePersonaHomeHref when available.
  return mode === "org" ? "/org/dashboard" : "/dashboard/jobseeker";
}

export function useWorkspaceMode(orgAvailable: boolean) {
  const pathname = usePathname();
  const router = useRouter();
  const pathMode = pathnameWorkspace(pathname);

  const [preference, setPreference] = useState<WorkspaceMode | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "personal" || stored === "org") setPreference(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const mode: WorkspaceMode = useMemo(() => {
    if (!orgAvailable) return "personal";
    if (pathMode === "org") return "org";
    if (preference === "org") return "org";
    return "personal";
  }, [orgAvailable, pathMode, preference]);

  const setMode = useCallback(
    (next: WorkspaceMode) => {
      if (!orgAvailable && next === "org") return;
      try {
        sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      setPreference(next);
      const target = defaultWorkspaceHref(next);
      if (pathname !== target && !pathname.startsWith(`${target}/`)) {
        router.push(target);
      }
    },
    [orgAvailable, pathname, router],
  );

  return { mode, setMode, orgAvailable };
}

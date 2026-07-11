"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { WorkspaceMode } from "@/lib/nav/workspace";

export function WorkspaceSwitcher({
  mode,
  onChange,
}: {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}) {
  const { dict } = useI18n();
  const w = dict.common.workspace;

  return (
    <div className="workspace-switcher" role="tablist" aria-label={w.label}>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "personal"}
        className={`workspace-switcher__btn ${mode === "personal" ? "workspace-switcher__btn--active" : ""}`}
        onClick={() => onChange("personal")}
      >
        {w.personal}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "org"}
        className={`workspace-switcher__btn ${mode === "org" ? "workspace-switcher__btn--active" : ""}`}
        onClick={() => onChange("org")}
      >
        {w.org}
      </button>
    </div>
  );
}

import { DEMO_LABELS, PRODUCTION_LABELS, type KitStudioLabels, type KitStudioMode } from "./types";

export type KitStudioConfig = {
  mode: KitStudioMode;
  catalogUrl: string;
  apiBase: string;
  refreshUrl: string;
  labels: KitStudioLabels;
  showCompetencyActiveToggle: boolean;
};

export function createKitStudioConfig(
  mode: KitStudioMode,
  workspaceId?: string,
): KitStudioConfig {
  if (mode === "demo") {
    if (!workspaceId) throw new Error("workspaceId required for demo kit studio");
    const apiBase = `/api/admin/demo/workspaces/${workspaceId}`;
    return {
      mode,
      catalogUrl: "/api/admin/demo/catalog",
      apiBase,
      refreshUrl: apiBase,
      labels: DEMO_LABELS,
      showCompetencyActiveToggle: false,
    };
  }
  return {
    mode,
    catalogUrl: "/api/admin/content/catalog",
    apiBase: "/api/admin",
    refreshUrl: "/api/admin/content-bank",
    labels: PRODUCTION_LABELS,
    showCompetencyActiveToggle: true,
  };
}

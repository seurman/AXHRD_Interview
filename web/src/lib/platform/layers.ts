/**
 * AXHRD platform layer registry — lightweight map of product surfaces to layers.
 * Spec: docs/AX-PLATFORM-LAYERS.md
 */
export const AX_PLATFORM_LAYERS = [
  "surfaces",
  "workflows",
  "meaning",
  "intelligence",
  "trust",
] as const;

export type AxPlatformLayer = (typeof AX_PLATFORM_LAYERS)[number];

export const AX_LAYER_LABEL: Record<AxPlatformLayer, string> = {
  surfaces: "L1 Surfaces",
  workflows: "L2 Workflows",
  meaning: "L3 Meaning",
  intelligence: "L4 Intelligence",
  trust: "Trust",
};

/** Route / module → primary layer (for docs, guards, future MCP scoping). */
export const MODULE_LAYER: Record<string, AxPlatformLayer> = {
  "/interview": "workflows",
  "/discover": "workflows",
  "/practice": "workflows",
  "/practice/path": "workflows",
  "/org/settings/interview-kit": "workflows",
  "/admin/demo": "surfaces",
  "/admin/content": "meaning",
  "/api/admin/meaning": "meaning",
  "/api/admin/meaning/jd-preview": "meaning",
  "/api/admin/global-competencies": "meaning",
  "/api/learning": "workflows",
  "/api/interview": "intelligence",
  irtEngine: "intelligence",
  conceptRelation: "meaning",
  platformRoles: "trust",
  adminAudit: "trust",
};

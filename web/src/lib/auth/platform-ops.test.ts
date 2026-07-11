import { describe, expect, it } from "vitest";
import {
  canGrantPlatformRoles,
  canManageDemoWorkspaces,
  canMutatePlatformSettings,
  canViewDiagnosticConsole,
  canViewPlatformOrganizations,
  isBusinessAdminUser,
  isDemoAdminUser,
} from "./platform-ops";

describe("platform-ops internal roles", () => {
  const business = { email: "biz@test.com", platformRole: "BUSINESS_ADMIN" as const };
  const demo = { email: "sales@test.com", platformRole: "DEMO_ADMIN" as const };
  const legacyDemo = { email: "legacy@test.com", platformRole: "ADMIN" as const };
  const superadmin = { email: "admin@test.com", platformRole: "SUPERADMIN" as const };

  it("identifies business and demo admins", () => {
    expect(isBusinessAdminUser(business)).toBe(true);
    expect(isDemoAdminUser(demo)).toBe(true);
    expect(isDemoAdminUser(legacyDemo)).toBe(true);
    expect(isBusinessAdminUser(demo)).toBe(false);
  });

  it("allows business admin to view orgs and diagnostic but not mutate settings", () => {
    expect(canViewPlatformOrganizations(business)).toBe(true);
    expect(canViewDiagnosticConsole(business)).toBe(true);
    expect(canMutatePlatformSettings(business)).toBe(false);
    expect(canGrantPlatformRoles(business)).toBe(false);
  });

  it("allows demo admin to manage demo workspaces only", () => {
    expect(canManageDemoWorkspaces(demo)).toBe(true);
    expect(canViewPlatformOrganizations(demo)).toBe(false);
    expect(canMutatePlatformSettings(demo)).toBe(false);
  });

  it("superadmin retains full control", () => {
    expect(canMutatePlatformSettings(superadmin)).toBe(true);
    expect(canGrantPlatformRoles(superadmin)).toBe(true);
  });
});

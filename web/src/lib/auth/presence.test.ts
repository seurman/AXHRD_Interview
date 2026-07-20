import { describe, expect, it } from "vitest";
import { isLikelyOnline } from "@/lib/auth/presence";

describe("isLikelyOnline", () => {
  const now = new Date("2026-07-20T12:00:00Z");

  it("is online when logged in recently without logout", () => {
    expect(
      isLikelyOnline(new Date("2026-07-20T10:00:00Z"), null, now),
    ).toBe(true);
  });

  it("is offline after logout newer than login", () => {
    expect(
      isLikelyOnline(
        new Date("2026-07-20T09:00:00Z"),
        new Date("2026-07-20T11:00:00Z"),
        now,
      ),
    ).toBe(false);
  });

  it("is online when re-login after logout", () => {
    expect(
      isLikelyOnline(
        new Date("2026-07-20T11:30:00Z"),
        new Date("2026-07-20T09:00:00Z"),
        now,
      ),
    ).toBe(true);
  });

  it("is offline when login older than 24h", () => {
    expect(
      isLikelyOnline(new Date("2026-07-18T10:00:00Z"), null, now),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  diagnosticSessionCookieOptions,
  orgWideCookieKey,
  teamCookieKey,
} from "./survey-loader";

describe("diagnostic survey session cookies", () => {
  it("uses site-wide path so API routes receive the session", () => {
    const opts = diagnosticSessionCookieOptions();
    expect(opts.path).toBe("/");
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
  });

  it("builds stable cookie keys", () => {
    expect(orgWideCookieKey("wave-1")).toBe("dx_rsp_wave-1__org__");
    expect(teamCookieKey("wave-1", "team-a")).toBe("dx_rsp_wave-1_team-a");
  });
});

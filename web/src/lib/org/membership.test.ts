import { describe, expect, it } from "vitest";
import { MembershipError, membershipErrorResponse } from "@/lib/org/membership";

describe("membershipErrorResponse", () => {
  it("maps known codes", () => {
    expect(membershipErrorResponse(new MembershipError("NOT_FOUND", "x")).status).toBe(404);
    expect(membershipErrorResponse(new MembershipError("SEAT_FULL", "x")).status).toBe(409);
    expect(membershipErrorResponse(new MembershipError("PENDING_EXISTS", "x")).status).toBe(409);
    expect(membershipErrorResponse(new MembershipError("NOT_PENDING", "x")).status).toBe(400);
    expect(membershipErrorResponse(new MembershipError("ADMIN_PROTECTED", "x")).status).toBe(400);
  });
});

import { describe, expect, it } from "vitest";
import { isPublicPath, requiresAuth } from "./middleware-paths";

describe("middleware-paths", () => {
  it("keeps marketing and auth public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/pricing")).toBe(true);
    expect(isPublicPath("/auth/login")).toBe(true);
    expect(isPublicPath("/demo")).toBe(true);
    expect(requiresAuth("/pricing")).toBe(false);
  });

  it("requires auth for learning path and related APIs", () => {
    expect(requiresAuth("/practice/path")).toBe(true);
    expect(requiresAuth("/practice/path/communication")).toBe(true);
    expect(requiresAuth("/practice/swipe")).toBe(true);
    expect(requiresAuth("/api/learning/path")).toBe(true);
    expect(requiresAuth("/api/learning/drill/complete")).toBe(true);
    expect(requiresAuth("/api/questions/swipe")).toBe(true);
    expect(requiresAuth("/discover")).toBe(true);
    expect(requiresAuth("/resume-review")).toBe(true);
  });

  it("still allows anonymous interview respond/tts", () => {
    expect(requiresAuth("/api/interview/respond")).toBe(false);
    expect(requiresAuth("/api/interview/tts")).toBe(false);
    expect(requiresAuth("/api/interview/sessions")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { landingDemoHref, landingStartHref } from "./hrefs";

describe("landing hrefs — 체험 루프", () => {
  it("맛보기는 로그인 여부와 관계없이 /demo#trial", () => {
    expect(landingDemoHref(false)).toBe("/demo#trial");
    expect(landingDemoHref(true)).toBe("/demo#trial");
  });

  it("무료 시작은 비로그인 시 면접 설정으로 가입 유도", () => {
    expect(landingStartHref(false, false)).toBe("/auth/register?next=/interview/setup");
  });

  it("로그인 후 trialOnly면 체험 페이지", () => {
    expect(landingStartHref(true, true)).toBe("/demo#trial");
    expect(landingStartHref(true, false)).toBe("/dashboard/jobseeker");
  });
});

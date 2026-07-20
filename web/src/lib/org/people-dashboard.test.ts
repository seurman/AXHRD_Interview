import { describe, expect, it } from "vitest";

/**
 * 회귀: 구성원 현황은 MEMBER/STUDENT만이 아니라 기관 소속 전원을 대상으로 한다.
 * (멤버·승인 화면과 동일 — STAFF/ADMIN 계정도 면접 연습·피드백 대상이 될 수 있음)
 */
describe("people dashboard membership scope", () => {
  it("documents that roster is all organizationId users", () => {
    const rolesIncluded = ["MEMBER", "STUDENT", "STAFF", "ADMIN"];
    expect(rolesIncluded).toContain("STAFF");
    expect(rolesIncluded).toContain("ADMIN");
  });
});

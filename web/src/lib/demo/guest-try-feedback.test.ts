import { describe, expect, it } from "vitest";
import { buildGuestTryFeedback } from "./guest-try-feedback";

describe("buildGuestTryFeedback", () => {
  it("returns 6-axis dimensions and scorePct", async () => {
    const answer =
      "마케팅 동아리에서 신규 회원 모집이 저조한 상황이었습니다. 목표는 2주 안에 30명이었고, " +
      "제가 SNS 캠페인을 기획해 운영했습니다. 결과적으로 35명을 모집해 목표를 117% 달성했습니다.";
    const fb = await buildGuestTryFeedback(answer, "팀워크 경험을 말씀해 주세요.", "ORG_FIT");

    expect(fb.scorePct).toBeGreaterThan(50);
    expect(fb.dimensions.questionIntent).toBeDefined();
    expect(fb.dimensions.individualOwnership).toBeGreaterThan(0.4);
    expect(fb.keyPoints.length).toBeGreaterThan(0);
    expect(fb.unlockItems.length).toBeGreaterThanOrEqual(3);
    expect(fb.headline.length).toBeGreaterThan(10);
  });

  it("scores team-centric answers lower on individualOwnership than self-led answers", async () => {
    const team =
      "팀 프로젝트에서 일정이 지연되는 상황이 있었고, 우리는 일정을 재조정하고 업무를 분담했습니다.";
    const self =
      "팀 프로젝트에서 일정이 지연되는 상황이 있었고, 제가 일정을 재조정하고 업무를 분담했습니다.";
    const teamFb = await buildGuestTryFeedback(team, "경험을 말해 주세요.");
    const selfFb = await buildGuestTryFeedback(self, "경험을 말해 주세요.");
    expect(teamFb.dimensions.individualOwnership).toBeLessThan(
      selfFb.dimensions.individualOwnership,
    );
  });
});

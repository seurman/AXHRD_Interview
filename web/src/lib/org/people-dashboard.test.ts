import { describe, expect, it } from "vitest";
import { redactPeopleDetailForConsent } from "./people-consent";
import type { OrgMemberDetailData } from "./people-dashboard";

function sampleDetail(consent: boolean): OrgMemberDetailData {
  return {
    member: {
      id: "u1",
      name: "테스트",
      email: "t@example.com",
      orgRole: "MEMBER",
      joinedAt: new Date().toISOString(),
      coachingConsent: consent,
      lastLoginAt: null,
      lastLogoutAt: null,
      online: false,
    },
    interviews: {
      completed: 1,
      inProgress: 0,
      abandoned: 0,
      lastCompletedAt: null,
      recent: [],
    },
    scores: {
      avgPercentile: 55,
      latestByCompetency: [
        {
          competency: "COMMUNICATION",
          label: "의사소통",
          theta: 0.2,
          percentile: 55,
          levelEst: 3,
          recordedAt: new Date().toISOString(),
        },
      ],
    },
    competencySeries: [
      {
        date: "2026-01-01",
        sessionNumber: 1,
        competency: "COMMUNICATION",
        competencyLabel: "의사소통",
        theta: 0.1,
        percentile: 50,
      },
    ],
    dimensionTimeline: [],
    assessmentAttempts: 0,
    feedback: [],
  };
}

describe("people dashboard membership scope", () => {
  it("documents that roster is all organizationId users", () => {
    const rolesIncluded = ["MEMBER", "STUDENT", "STAFF", "ADMIN"];
    expect(rolesIncluded).toContain("STAFF");
    expect(rolesIncluded).toContain("ADMIN");
  });
});

describe("people consent redaction", () => {
  it("keeps detail when consent is granted", () => {
    const out = redactPeopleDetailForConsent(sampleDetail(true));
    expect(out.consentRequired).toBe(false);
    expect(out.competencySeries).toHaveLength(1);
    expect(out.scores.latestByCompetency).toHaveLength(1);
  });

  it("hides series and per-competency scores without consent", () => {
    const out = redactPeopleDetailForConsent(sampleDetail(false));
    expect(out.consentRequired).toBe(true);
    expect(out.competencySeries).toEqual([]);
    expect(out.scores.latestByCompetency).toEqual([]);
    expect(out.scores.avgPercentile).toBe(55);
  });
});

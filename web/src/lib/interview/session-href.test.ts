import { describe, expect, it } from "vitest";
import {
  competencyFeedbackHref,
  interviewSessionHref,
  isInterviewSessionCompleted,
} from "./session-href";

describe("interviewSessionHref", () => {
  it("routes in-progress to the live session", () => {
    expect(
      interviewSessionHref({ id: "s1", status: "IN_PROGRESS" }),
    ).toBe("/interview/s1");
  });

  it("routes COMPETENCY completed to feedback", () => {
    expect(
      interviewSessionHref({
        id: "s1",
        status: "COMPLETED",
        mode: "COMPETENCY",
        planId: "p1",
        focusCompetency: "COMMUNICATION",
      }),
    ).toBe(
      "/interview/plan/p1/competency/COMMUNICATION/feedback?sessionId=s1",
    );
  });

  it("routes FULL completed to report", () => {
    expect(
      interviewSessionHref({
        id: "s1",
        completedAt: new Date(),
        mode: "FULL",
        planId: "p1",
        focusCompetency: "COMMUNICATION",
      }),
    ).toBe("/interview/s1/report");
  });
});

describe("competencyFeedbackHref", () => {
  it("returns null when incomplete or FULL", () => {
    expect(
      competencyFeedbackHref({ id: "s1", status: "IN_PROGRESS", planId: "p", focusCompetency: "X" }),
    ).toBeNull();
    expect(
      competencyFeedbackHref({
        id: "s1",
        status: "COMPLETED",
        mode: "FULL",
        planId: "p",
        focusCompetency: "X",
      }),
    ).toBeNull();
  });

  it("detects completed via completedAt", () => {
    expect(isInterviewSessionCompleted({ completedAt: "2026-01-01" })).toBe(true);
  });
});

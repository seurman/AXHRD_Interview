import { describe, expect, it } from "vitest";
import { mockEvaluate } from "@/lib/gemini/evaluate";
import { normalizeAnswerDimensions } from "@/lib/interview/answer-dimensions";

describe("mockEvaluate", () => {
  it("짧은 답변은 낮은 점수와 STAR 부족 피드백을 준다", () => {
    const result = mockEvaluate("그냥 열심히 했습니다.");
    expect(result.score).toBeLessThan(0.5);
    expect(result.briefFeedback.length).toBeGreaterThan(0);
    expect(result.dimensions.situationSpecificity).toBeLessThan(0.6);
    expect(result.dimensions.individualOwnership).toBeLessThan(0.6);
  });

  it("STAR 4요소 + 수치가 있으면 높은 점수를 준다", () => {
    const answer =
      "대학 마케팅 동아리에서 신규 회원 모집이 저조한 상황이었습니다. 목표는 2주 안에 30명 모집이었습니다. " +
      "SNS 캠페인과 오프라인 부스를 병행해 홍보했고, 결과적으로 35명을 모집해 목표를 117% 달성했습니다.";
    const result = mockEvaluate(answer);
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.dimensions.situationSpecificity).toBeGreaterThan(0.6);
    expect(result.dimensions.outcomeQuantification).toBeGreaterThan(0.6);
    expect(result.briefFeedback).toMatch(/상황|과제|행동|결과/);
  });

  it("상황·행동만 있으면 중간 점수와 부분 STAR 코칭을 준다", () => {
    const answer =
      "팀 프로젝트에서 일정이 지연되는 상황이 있었고, 제가 일정을 재조정하고 업무를 분담했습니다.";
    const result = mockEvaluate(answer);
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.score).toBeLessThan(0.85);
    expect(result.briefFeedback.length).toBeGreaterThan(5);
    expect(result.dimensions.individualOwnership).toBeGreaterThan(0.5);
  });

  it("우리는 중심 답변은 individualOwnership이 낮다", () => {
    const teamAnswer =
      "팀 프로젝트에서 일정이 지연되는 상황이 있었고, 우리는 일정을 재조정하고 업무를 분담했습니다.";
    const individualAnswer =
      "팀 프로젝트에서 일정이 지연되는 상황이 있었고, 제가 일정을 재조정하고 업무를 분담했습니다.";
    const team = mockEvaluate(teamAnswer);
    const individual = mockEvaluate(individualAnswer);
    expect(team.dimensions.individualOwnership).toBeLessThan(
      individual.dimensions.individualOwnership,
    );
  });

  it("결과(수치)만 강조되면 outcomeQuantification은 올라가나 situationSpecificity는 낮을 수 있다", () => {
    const answer = "매출이 20% 증가했습니다.";
    const result = mockEvaluate(answer);
    expect(result.dimensions.delivery).toBeGreaterThan(0.3);
    expect(result.dimensions.outcomeQuantification).toBeGreaterThan(0.5);
    expect(result.dimensions.situationSpecificity).toBeLessThan(0.6);
  });
});

describe("normalizeAnswerDimensions legacy compat", () => {
  it("maps legacy 4-axis starStructure records to 6-axis approximations", () => {
    const normalized = normalizeAnswerDimensions({
      starStructure: 0.6,
      questionIntent: 0.7,
      logic: 0.65,
      delivery: 0.8,
    });
    expect(normalized).toEqual({
      questionIntent: 0.7,
      situationSpecificity: 0.6,
      individualOwnership: 0.6,
      logic: 0.65,
      outcomeQuantification: 0.6,
      delivery: 0.8,
    });
  });
});

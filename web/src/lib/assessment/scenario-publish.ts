/**
 * 과제 게시 전 검증 — 역량·루브릭·행동지표·유형별 필수 필드.
 */
import type { ScenarioWithFramework } from "@/lib/assessment/load-scenario-context";
import { competencyFrameworksWithRubrics } from "@/lib/assessment/load-scenario-context";

export type PublishValidationIssue = {
  field: string;
  message: string;
};

export function validateScenarioForPublish(
  scenario: ScenarioWithFramework,
): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = [];

  if (!scenario.titleKo.trim()) {
    issues.push({ field: "titleKo", message: "과제 제목이 필요합니다." });
  }
  if (!scenario.taskBrief.trim()) {
    issues.push({ field: "taskBrief", message: "과제 브리핑이 필요합니다." });
  }
  if (scenario.competencies.length === 0) {
    issues.push({ field: "competencies", message: "최소 1개 역량을 연결해야 합니다." });
  }

  const frameworks = competencyFrameworksWithRubrics(scenario);
  for (const fw of frameworks) {
    if (!fw.competencyId) {
      issues.push({
        field: `competencies.${fw.code}`,
        message: `${fw.nameKo}: 플랫폼 역량에 연결해야 합니다.`,
      });
    }
    if (fw.scoringLevels.length < 3) {
      issues.push({
        field: `competencies.${fw.code}.rubric`,
        message: `${fw.nameKo}: 1~5점 루브릭(최소 3레벨)이 필요합니다.`,
      });
    }
    const indicatorCount = fw.subskills.reduce(
      (n, s) => n + s.indicators.length,
      0,
    );
    if (indicatorCount < 1) {
      issues.push({
        field: `competencies.${fw.code}.indicators`,
        message: `${fw.nameKo}: 과제별 행동지표가 최소 1개 필요합니다.`,
      });
    }
  }

  if (scenario.kind === "ROLE_PLAY") {
    if (!scenario.personaName?.trim()) {
      issues.push({ field: "personaName", message: "상대역 이름이 필요합니다." });
    }
    if (!scenario.personaProfile?.trim()) {
      issues.push({
        field: "personaProfile",
        message: "상대역 연기 지침이 필요합니다.",
      });
    }
    if (!scenario.openingLine?.trim()) {
      issues.push({ field: "openingLine", message: "첫 발화가 필요합니다." });
    }
    if (scenario.maxTurns < 1) {
      issues.push({ field: "maxTurns", message: "최대 턴 수는 1 이상이어야 합니다." });
    }
  }

  if (scenario.kind === "IN_BASKET") {
    if (scenario.inBasketItems.length < 3) {
      issues.push({
        field: "inBasketItems",
        message: "서류함 항목이 최소 3건 필요합니다.",
      });
    }
    for (const item of scenario.inBasketItems) {
      if (!item.fromLabel.trim() || !item.subject.trim() || !item.body.trim()) {
        issues.push({
          field: `inBasketItems.${item.id}`,
          message: "서류함 항목의 보낸 사람·제목·본문이 모두 필요합니다.",
        });
      }
    }
  }

  return issues;
}

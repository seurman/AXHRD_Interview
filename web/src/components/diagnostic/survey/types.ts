export type ScaleType = "AGREEMENT_5" | "RETRO_CHANGE_5" | "SPEED_5" | "OPEN_TEXT";

export type SurveyItem = {
  id: string;
  itemCode: string;
  textKo: string;
  scaleType: ScaleType;
  scaleLabels: string[] | null;
  hasImportanceAxis: boolean;
  isDemographic: boolean;
  choiceOptions: unknown;
};

export type SurveySection = {
  code: string;
  nameKo: string;
  subscales: Array<{ code: string; nameKo: string; items: SurveyItem[] }>;
  directItems: SurveyItem[];
};

export type SurveyPayload = {
  wave: { id: string; label: string | null; status: string; estimatedMinutes: number | null };
  team: { id: string; name: string } | null;
  instrument: { nameKo: string; version: string };
  sections: SurveySection[];
  response: {
    demographics: Record<string, string> | null;
    consentAt: string | null;
    submittedAt: string | null;
    answers: Record<string, { current?: number; importance?: number; text?: string }>;
  } | null;
};

export type AnswerMap = Record<string, { current?: number; importance?: number; text?: string }>;

export type FlatQuestion = {
  item: SurveyItem;
  sectionCode: string;
  sectionName: string;
  subscaleName: string | null;
  indexInSurvey: number;
};

export const SECTION_BLURB: Record<string, string> = {
  OHI: "지금 조직의 건강 상태를 살펴봅니다. 에너지, 리더십, 업무 환경에 대한 귀하의 경험을 솔직히 말씀해 주세요.",
  ORI: "변화를 맞이할 준비 상태를 확인합니다. 방향, 학습, AI·디지털 전환에 대한 감각을 묻습니다.",
  OVI: "최근 6개월, 조직이 실제로 얼마나 움직였는지 체감을 묻습니다.",
  OAI: "일의 방향이 전략·결과와 맞물리는지 — 정렬의 질을 들여다봅니다.",
};

export function flattenSurveyQuestions(sections: SurveySection[]): FlatQuestion[] {
  const out: FlatQuestion[] = [];
  let i = 0;
  for (const section of sections) {
    if (section.code === "DM") continue;
    for (const sub of section.subscales) {
      for (const item of sub.items) {
        out.push({
          item,
          sectionCode: section.code,
          sectionName: section.nameKo,
          subscaleName: sub.nameKo,
          indexInSurvey: i++,
        });
      }
    }
    for (const item of section.directItems.filter((x) => !x.isDemographic)) {
      out.push({
        item,
        sectionCode: section.code,
        sectionName: section.nameKo,
        subscaleName: null,
        indexInSurvey: i++,
      });
    }
  }
  return out;
}

export function isQuestionComplete(
  item: SurveyItem,
  answer?: { current?: number; importance?: number; text?: string },
): boolean {
  if (item.scaleType === "OPEN_TEXT") return true; // optional
  if (answer?.current == null || answer.current < 1) return false;
  if (item.hasImportanceAxis && (answer.importance == null || answer.importance < 1)) return false;
  return true;
}

export function choiceList(item: SurveyItem): string[] {
  if (Array.isArray(item.choiceOptions)) return item.choiceOptions as string[];
  if (typeof item.choiceOptions === "object" && item.choiceOptions !== null) {
    return Object.values(item.choiceOptions as Record<string, string>);
  }
  return [];
}

/**
 * 역량 단어장 → 게임 문항 (영어앱 단어/숙어 드릴에 대응)
 */

import type { CompetencyCode } from "@/types";
import { getLexicon, ORG_LENSES, type OrgLens } from "@/lib/competency/lexicon";
import { hasDigitCueOnlyOnAnswer } from "./content-shuffle";
import type {
  ChoiceItem,
  MatchPairsItem,
  TrueFalseItem,
} from "../types";

const DIGIT_PAD = [" · 수치 0건", " · 지표 없음(0)", " · 사례 0회"];

/** 정답에만 숫자가 남는 단서 제거 */
function neutralizeDigitCue(choices: string[], answerIndex: number): string[] {
  if (!hasDigitCueOnlyOnAnswer(choices, answerIndex)) return choices;
  return choices.map((c, i) => {
    if (i === answerIndex || /\d/.test(c)) return c;
    return `${c}${DIGIT_PAD[i % DIGIT_PAD.length]}`;
  });
}

type MatchDraft = Pick<
  MatchPairsItem,
  "prompt" | "left" | "right" | "answerMap" | "explain"
>;
type TfDraft = Pick<TrueFalseItem, "prompt" | "statement" | "isTrue" | "explain">;
type ChoiceDraft = Pick<
  ChoiceItem,
  "scenario" | "prompt" | "choices" | "answerIndex" | "explain"
>;

const LENS_LABEL: Record<OrgLens, string> = {
  LARGE: "대기업",
  PUBLIC: "공공기관",
  STARTUP: "스타트업",
};

/** 단어·뜻 짝맞추기 (단어장) */
export function lexiconMatchItems(competency: CompetencyCode): MatchDraft[] {
  const lex = getLexicon(competency);
  const terms = lex.terms.slice(0, 3);
  const sub = lex.subskills.slice(0, 3);
  if (terms.length < 3) return [];
  return [
    {
      prompt: "역량 신호어와 뜻을 짝지으세요.",
      left: terms.map((t) => t.termKo),
      right: terms.map((t) => t.meaningKo),
      answerMap: [0, 1, 2],
      explain: "이 역량에서 면접관이 듣는 핵심 신호입니다.",
    },
    {
      prompt: "좋은 예시와 신호어를 짝지으세요.",
      left: terms.map((t) => t.termKo),
      right: terms.map((t) => t.goodExample),
      answerMap: [0, 1, 2],
      explain: "신호어는 구체 장면으로 증명됩니다.",
    },
    {
      prompt: "하위 요소와 NCS 앵커를 짝지으세요.",
      left: sub.map((s) => s.nameKo),
      right: sub.map((s) => s.ncs),
      answerMap: [0, 1, 2],
      explain: `${lex.ncsAnchor}`,
    },
  ];
}

/** 단어장 참/거짓 */
export function lexiconTrueFalseItems(competency: CompetencyCode): TfDraft[] {
  const lex = getLexicon(competency);
  const t0 = lex.terms[0];
  const t1 = lex.terms[1];
  return [
    {
      prompt: "역량 단어장 — 참인지 고르세요.",
      statement: `‘${t0.termKo}’은(는) ${t0.meaningKo}.`,
      isTrue: true,
      explain: t0.goodExample,
    },
    {
      prompt: "역량 단어장 — 참인지 고르세요.",
      statement: `면접에서 ‘${t1.termKo}’을(를) 말할 때는 “${t1.badExample}”처럼 말하는 편이 강하다.`,
      isTrue: false,
      explain: `약한 예입니다. 강한 예: ${t1.goodExample}`,
    },
    {
      prompt: "역량 단어장 — 참인지 고르세요.",
      statement: `${lex.nameKo}의 NCS 앵커는 “${lex.ncsAnchor}”이다.`,
      isTrue: true,
      explain: lex.definition,
    },
  ];
}

/**
 * 조직 렌즈 독해 — 대기업/공공/스타트업 담당자가 더 높이 평가하는 신호
 * (트리플 피드백과 같은 3관점)
 */
export function lexiconOrgLensChoices(competency: CompetencyCode): ChoiceDraft[] {
  const lex = getLexicon(competency);
  const items: ChoiceDraft[] = [];

  for (const lens of ORG_LENSES) {
    const preferred = lex.terms.filter((t) => t.preferredBy.includes(lens));
    const other = lex.terms.filter((t) => !t.preferredBy.includes(lens));
    const good = preferred[0] ?? lex.terms[0];
    const distractors = [
      ...(other[0] ? [other[0].badExample] : []),
      good.badExample,
      (other[1] ?? lex.terms[1]).badExample,
    ].slice(0, 3);

    // ensure 3 distractors
    while (distractors.length < 3) {
      distractors.push(lex.terms[distractors.length % lex.terms.length].badExample);
    }

    // 길이 편향 완화: 정답이 유일하게 가장 길지 않도록 오답을 맞춤
    const answer = good.goodExample;
    const targetLen = answer.length;
    const fillers = [" — 약한 신호", " · 근거 부족", " · 구체성 낮음", " · 재현 어려움"];
    const padded = [
      answer,
      ...distractors.map((c) => {
        let out = c;
        let fi = 0;
        while (out.length < targetLen && fi < fillers.length * 3) {
          out = `${out}${fillers[fi % fillers.length]}`;
          fi += 1;
        }
        return out;
      }),
    ];
    const choices = neutralizeDigitCue(padded, 0);

    items.push({
      scenario: `${LENS_LABEL[lens]} 면접관이 ${lex.nameKo}을(를) 봅니다. 이 조직이 특히 듣는 신호는 [${lex.lensSignals[lens].join(" · ")}]입니다.`,
      prompt: `${LENS_LABEL[lens]}에서 더 높이 평가될 답은?`,
      choices,
      answerIndex: 0,
      explain: `${LENS_LABEL[lens]}은(는) ‘${good.termKo}’ 신호(${good.meaningKo})를 선호합니다.`,
    });
  }

  return items;
}

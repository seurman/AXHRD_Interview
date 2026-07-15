/**
 * ARC Index Summary — 지표 커버리지 유지 · 문항 최소화 버전.
 *
 * 목적: Full(~82 Likert + 이중축 + OE23)이 부담인 조직을 위해
 *       보고서 지표(4축·Risk·QCI·IPA 드라이버·Opp·Velocity·OAI·Gap)는
 *       동일 산식으로 나오되, 문항은 Full과 같은 코드의 부분집합만 사용.
 *
 * 원칙:
 * - 신규 문항코드 = Full과 동일 → arc-scoring / Org BI 그대로 동작
 * - 중요도: OHI 드라이버(기대 vs 현재 갭·IPA)에만 이중응답.
 *   SE·BO·TL·ORI·OVI·OAI는 현재수준만 (결과/준비/속도/정렬은 “갭”보다 수준 측정).
 * - 하위척도당 1~2문항 → 신뢰도는 Full보다 낮음(보고서 각주에 명시)
 *
 * 규모: DM 5 + Likert 45(+드라이버 중요도 ~10) + OE 3 ≈ 14–16분
 */

import type { SeedItem, SeedSection } from "./arc-index-data";

export const ARC_INDEX_SUMMARY_SEED = {
  instrument: {
    code: "ARC_INDEX_SUMMARY",
    nameKo: "ARC Index Summary — 핵심 조직진단",
    version: "260715",
    estimatedMinutes: 12,
    parentInstrumentCode: "ARC_INDEX",
  },
  /** 보고서에 붙일 신뢰도·해석 주의 */
  reliabilityNoteKo:
    "Summary는 하위척도당 1~2문항의 축약판입니다. 축·드라이버 점수와 랭킹은 Full과 동일한 산식을 쓰지만, 점수 안정성·벤치마크 비교는 Full보다 보수적으로 해석하세요. 중요도(기대)는 OHI 드라이버에만 물어 기대−현재 갭·IPA에 사용합니다.",
  /** 중요도 이중응답이 켜진 영역 — 기대(중요도) vs 현재 수행 갭 */
  importanceGapAreas: ["SL", "SV", "PS", "C", "EM", "PM", "LG", "CI", "WE"] as const,
  sections: [
    {
      code: "DM",
      nameKo: "기본 정보",
      order: 0,
      subscales: [],
      directItems: [
        {
          itemCode: "DM01",
          textKo: "직급",
          scaleType: "AGREEMENT_5",
          isDemographic: true,
          choiceOptions: ["1~3급(고위)", "4~5급(중간관리)", "6~7급(실무)", "8~9급(신규)", "무기계약직"],
          order: 1,
        },
        {
          itemCode: "DM02",
          textKo: "재직기간",
          scaleType: "AGREEMENT_5",
          isDemographic: true,
          choiceOptions: ["1년미만", "1~3년", "3~7년", "7~15년", "15년이상"],
          order: 2,
        },
        {
          itemCode: "DM03",
          textKo: "부서유형",
          scaleType: "AGREEMENT_5",
          isDemographic: true,
          choiceOptions: ["정책·기획", "사업·집행", "지원·행정", "현장·서비스", "연구·전문"],
          order: 3,
        },
        {
          itemCode: "DM04",
          textKo: "연령대",
          scaleType: "AGREEMENT_5",
          isDemographic: true,
          choiceOptions: ["20대", "30대", "40대", "50대이상"],
          order: 4,
        },
        {
          itemCode: "DM05",
          textKo: "AI 활용빈도",
          scaleType: "AGREEMENT_5",
          isDemographic: true,
          choiceOptions: ["거의없음", "월1~2회", "주1~2회", "매일", "업무핵심"],
          order: 5,
        },
      ],
    },
    {
      code: "OHI",
      nameKo: "Organization Health Index — 조직 현재 건강",
      order: 1,
      subscales: [
        {
          code: "SE.E",
          nameKo: "활력",
          order: 1,
          items: [
            {
              itemCode: "E01",
              textKo: "매일 아침 나는 업무에 대한 의욕과 에너지를 느낀다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "E02",
              textKo: "나는 하루 종일 업무에 필요한 에너지를 유지할 수 있다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "SE.C",
          nameKo: "헌신·연결",
          order: 2,
          items: [
            {
              itemCode: "SEC01",
              textKo: "내 업무는 나에게 깊은 의미와 성취감을 준다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "SEC03",
              textKo: "나는 이 조직의 미래가 나의 미래와 연결되어 있다고 느낀다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "SE.F",
          nameKo: "몰두",
          order: 3,
          items: [
            {
              itemCode: "F01",
              textKo: "일을 할 때 나는 완전히 집중하여 시간 가는 줄 모를 때가 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "SE_OE",
              textKo: "이 조직에서 일하면서 가장 의미 있는 것과 가장 힘든 것은 무엇입니까?",
              scaleType: "OPEN_TEXT",
              order: 2,
            },
          ],
        },
        {
          code: "BO",
          nameKo: "행동 결과",
          order: 4,
          items: [
            {
              itemCode: "BO01",
              textKo: "나는 지난 3개월간 업무 개선이나 새로운 아이디어를 자발적으로 제안한 적이 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "BO03",
              textKo: "나는 이 조직에서 중요한 문제가 있을 때 침묵하지 않고 목소리를 낸다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "TL.TR",
          nameKo: "팀 리더십 — 신뢰",
          order: 5,
          items: [
            {
              itemCode: "TL01",
              textKo: "우리 팀 리더는 내가 어려운 상황에 처했을 때 나를 지지해줄 것이라고 믿는다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
          ],
        },
        {
          code: "TL.GF",
          nameKo: "팀 리더십 — 성장·피드백",
          order: 6,
          items: [
            {
              itemCode: "TL03",
              textKo: "우리 팀 리더는 내 강점과 성장 가능성에 관심을 갖고 구체적으로 지원한다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
          ],
        },
        {
          code: "TL.PS",
          nameKo: "팀 리더십 — 심리적안전",
          order: 7,
          items: [
            {
              itemCode: "TL05",
              textKo: "우리 팀 리더 앞에서 나는 모르는 것을 모른다고 편하게 말할 수 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
          ],
        },
        {
          code: "SL",
          nameKo: "경영진 리더십",
          isDriver: true,
          order: 9,
          items: [
            {
              itemCode: "SL01",
              textKo: "경영진은 조직이 나아갈 방향과 그 의미를 명확히 제시한다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "SV",
          nameKo: "직속 상사",
          isDriver: true,
          order: 10,
          items: [
            {
              itemCode: "SV02",
              textKo: "직속 상사는 내가 일을 잘할 수 있도록 충분히 지원한다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "PS",
          nameKo: "심리적 안전",
          isDriver: true,
          order: 11,
          items: [
            {
              itemCode: "PS01",
              textKo: "이 조직에서 나는 어려운 문제나 불편한 진실을 편하게 꺼낼 수 있다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "C",
          nameKo: "소통 & 정보",
          isDriver: true,
          order: 12,
          items: [
            {
              itemCode: "C01",
              textKo: "업무 판단에 필요한 정보가 제때에 원활하게 나에게 공유된다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "EM",
          nameKo: "구조 & 자율권",
          isDriver: true,
          order: 13,
          items: [
            {
              itemCode: "EM01",
              textKo: "업무를 잘 수행하는 데 필요한 의사결정 권한이 나에게 있다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "PM",
          nameKo: "성과 & 보상",
          isDriver: true,
          order: 14,
          items: [
            {
              itemCode: "PM01",
              textKo: "나의 성과는 기여도에 비례하여 공정하게 평가된다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: "PM04",
              textKo:
                "AI 결과물을 그대로 쓰지 않고 검토·검증하는 태도가 이 조직에서 성과로 인정받는다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 2,
            },
          ],
        },
        {
          code: "LG",
          nameKo: "학습 & 성장",
          isDriver: true,
          order: 15,
          items: [
            {
              itemCode: "LG01",
              textKo: "이 조직에서 나는 지속적으로 성장하고 있다고 느낀다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "CI",
          nameKo: "문화 & 포용",
          isDriver: true,
          order: 16,
          items: [
            {
              itemCode: "CI01",
              textKo: "이 조직의 구성원들은 서로 존중하고 품위 있게 대한다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
        {
          code: "WE",
          nameKo: "업무 환경",
          isDriver: true,
          order: 17,
          items: [
            {
              itemCode: "WE02",
              textKo: "나는 과도한 업무량으로 인해 지속적으로 지쳐있지 않다",
              scaleType: "AGREEMENT_5",
              hasImportanceAxis: true,
              order: 1,
            },
          ],
        },
      ],
    },
    {
      code: "ORI",
      nameKo: "Organization Readiness Index — 조직 미래 준비",
      order: 2,
      subscales: [
        {
          code: "CD",
          nameKo: "변화 준비 방향",
          order: 1,
          items: [
            {
              itemCode: "CD01",
              textKo: "우리 조직은 앞으로 어떻게 변화해야 하는지 방향이 명확하다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "CD02",
              textKo:
                "우리 조직의 구성원들은 변화하지 않으면 뒤처진다는 긴장감을 공유하고 있다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
            {
              itemCode: "CD04",
              textKo: "우리 조직에서 오래된 관행을 바꾸는 것은 매우 어렵다",
              scaleType: "AGREEMENT_5",
              isReversed: true,
              order: 3,
            },
            {
              itemCode: "CD_OE",
              textKo: "변화 준비에서 가장 잘 되는 것과 가장 시급한 것은 무엇입니까?",
              scaleType: "OPEN_TEXT",
              order: 4,
            },
          ],
        },
        {
          code: "LA",
          nameKo: "학습 & 적응",
          order: 2,
          items: [
            {
              itemCode: "LA01",
              textKo: "우리 조직은 과거 경험으로부터 조직 차원에서 실제로 배운다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "LA03",
              textKo: "구성원들이 새로운 업무 방식을 시도할 심리적·제도적 여건이 있다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "AXS",
          nameKo: "AX 전략 준비",
          order: 3,
          items: [
            {
              itemCode: "AXS01",
              textKo: "우리 조직은 AI·디지털 전환에 대한 명확한 방향과 전략을 갖고 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "AXS02",
              textKo: "AI 활용에 대한 명확한 윤리 기준과 가이드라인이 실제로 작동한다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "AXC",
          nameKo: "AX 역량 준비",
          order: 4,
          items: [
            {
              itemCode: "AXC01",
              textKo: "나는 AI 도구를 업무에 실제로 활용할 수 있는 역량을 갖추고 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "AXC02",
              textKo: "나는 AI가 제공한 결과물이 틀렸을 때 그 이유를 파악하고 수정할 수 있다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "AXA",
          nameKo: "AX 수용 의지",
          order: 5,
          items: [
            {
              itemCode: "AXA01",
              textKo: "나는 AI 도구를 지금보다 업무에 더 많이 활용하고 싶다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "AXA02",
              textKo: "AI를 더 잘 활용하면 내 커리어와 전문성 향상에 도움이 된다고 생각한다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "AXG",
          nameKo: "AX 거버넌스 부담",
          order: 6,
          items: [
            {
              itemCode: "AXG01",
              textKo: "AI를 사용하다 문제가 생기면 내가 책임져야 한다는 부담을 느낀다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "AXG02",
              textKo: "AI 활용에 대한 명확한 가이드라인이 없어서 어떻게 써야 할지 막막하다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
      ],
    },
    {
      code: "OVI",
      nameKo: "Organization Velocity Index — 조직 변화 속도",
      order: 3,
      subscales: [
        {
          code: "HV",
          nameKo: "조직 건강 속도",
          order: 1,
          items: [
            {
              itemCode: "HV01",
              textKo: "지난 6개월과 비교해서 우리 조직의 리더십이 더 나아지고 있다고 느낀다",
              scaleType: "RETRO_CHANGE_5",
              order: 1,
            },
            {
              itemCode: "HV02",
              textKo: "지난 6개월과 비교해서 구성원들이 의견을 말하는 것이 더 편해졌다고 느낀다",
              scaleType: "RETRO_CHANGE_5",
              order: 2,
            },
            {
              itemCode: "HV_OE",
              textKo: "지난 6개월간 가장 눈에 띄게 좋아진 것과 가장 아쉬운 것은 무엇입니까?",
              scaleType: "OPEN_TEXT",
              order: 3,
            },
          ],
        },
        {
          code: "CV",
          nameKo: "변화 실행 속도",
          order: 2,
          items: [
            {
              itemCode: "CV01",
              textKo: "우리 조직에서 변화가 결정되고 현장에 실제로 적용되는 속도는 어느 정도인가?",
              scaleType: "SPEED_5",
              order: 1,
            },
            {
              itemCode: "CV03",
              textKo: "지난 6개월과 비교해서 불필요한 관행이나 절차가 실제로 줄어들고 있다",
              scaleType: "RETRO_CHANGE_5",
              order: 2,
            },
          ],
        },
        {
          code: "AV",
          nameKo: "AX 전환 속도",
          order: 3,
          items: [
            {
              itemCode: "AV01",
              textKo: "지난 6개월과 비교해서 AI 도구 활용이 우리 조직에 더 넓게 퍼지고 있다",
              scaleType: "RETRO_CHANGE_5",
              order: 1,
            },
            {
              itemCode: "AV02",
              textKo: "지난 6개월과 비교해서 AI 때문에 실제로 업무 방식이 달라지고 있다",
              scaleType: "RETRO_CHANGE_5",
              order: 2,
            },
          ],
        },
      ],
    },
    {
      code: "OAI",
      nameKo: "Organization Alignment Index — 조직 방향 정렬",
      order: 4,
      subscales: [
        {
          code: "SA",
          nameKo: "전략 정렬",
          weight: 0.4,
          order: 1,
          items: [
            {
              itemCode: "SA01",
              textKo: "우리 조직의 일상적 업무는 조직의 핵심 전략 방향과 직접 연결되어 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "SA02",
              textKo: "경영진이 강조하는 우선순위와 내가 실제로 시간을 쓰는 곳이 일치한다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "EA",
          nameKo: "에너지 정렬",
          weight: 0.35,
          order: 2,
          items: [
            {
              itemCode: "EA01",
              textKo: "내가 가장 많은 에너지를 쏟는 일이 우리 조직에서 가장 중요한 일과 일치한다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "EA02",
              textKo: "열심히 한 일이 조직이 원하는 방향의 결과로 이어지고 있다고 느낀다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
        {
          code: "OA",
          nameKo: "결과 정렬",
          weight: 0.25,
          order: 3,
          items: [
            {
              itemCode: "OA01",
              textKo:
                "지난 6개월 우리 조직의 변화 노력이 처음 의도한 방향의 결과를 실제로 만들고 있다",
              scaleType: "AGREEMENT_5",
              order: 1,
            },
            {
              itemCode: "OA06",
              textKo: "측정하고 보고하는 성과지표가 조직이 정말 원하는 방향의 성과를 반영한다",
              scaleType: "AGREEMENT_5",
              order: 2,
            },
          ],
        },
      ],
    },
  ] satisfies SeedSection[],
};

/** Summary Likert 문항코드 (DM·OE 제외) — 검증·문서용 */
export function listSummaryLikertCodes(): string[] {
  const codes: string[] = [];
  for (const section of ARC_INDEX_SUMMARY_SEED.sections) {
    const pools: SeedItem[][] = [];
    if (section.directItems) pools.push(section.directItems);
    for (const sub of section.subscales) pools.push(sub.items);
    for (const items of pools) {
      for (const it of items) {
        if (it.isDemographic || it.scaleType === "OPEN_TEXT") continue;
        codes.push(it.itemCode);
      }
    }
  }
  return codes;
}

/** 지표 → 사용 문항 (Summary에서 “다 나옴” 보장용 체크리스트) */
export const SUMMARY_METRIC_COVERAGE = {
  OHI: ["E01", "E02", "SEC01", "SEC03", "F01", "SL01", "SV02", "PS01", "C01", "EM01", "PM01", "LG01", "CI01", "WE02"],
  SE_E_C_F: { E: ["E01", "E02"], C: ["SEC01", "SEC03"], F: ["F01"] },
  BO: ["BO01", "BO03"],
  TL: { trust: ["TL01"], growth: ["TL03"], safety: ["TL05"] },
  Risk_QCI: ["SEC03", "E01", "E02", "BO01", "BO03", "HV01", "HV02"],
  IPA_drivers: ["SL01", "SV02", "PS01", "C01", "EM01", "PM01", "LG01", "CI01", "WE02"],
  JudgmentRecognition: ["PM04", "AXC02"],
  ORI: ["CD01", "CD02", "CD04", "LA01", "LA03", "AXS01", "AXS02", "AXC01", "AXC02"],
  Opportunity: ["AXA01", "AXA02", "AXG01", "AXG02"],
  ChangeTension: ["CD02", "CD04"],
  OVI: ["HV01", "HV02", "CV01", "CV03", "AV01", "AV02"],
  DynamicCongruence: ["HV01", "HV02", "AV01", "AV02"],
  OAI: ["SA01", "SA02", "EA01", "EA02", "OA01", "OA06"],
  StrategyTimeGap: ["SA02"],
  OrgBI_4axis: ["OHI", "ORI", "OVI", "OAI"],
} as const;

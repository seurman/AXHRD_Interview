/**
 * ARC Index diagnostic instrument seed data.
 * Item text sourced verbatim from docs/arc-index/source/ (OHI v2, ORI, OVI, OAI final docs).
 */

export type SeedItem = {
  itemCode: string;
  textKo: string;
  scaleType: 'AGREEMENT_5' | 'RETRO_CHANGE_5' | 'SPEED_5' | 'OPEN_TEXT';
  hasImportanceAxis?: boolean;
  isReversed?: boolean;
  isDemographic?: boolean;
  choiceOptions?: string[];
  order: number;
};

export type SeedSubscale = {
  code: string;
  nameKo: string;
  weight?: number;
  isDriver?: boolean;
  order: number;
  items: SeedItem[];
};

export type SeedSection = {
  code: string;
  nameKo: string;
  order: number;
  subscales: SeedSubscale[];
  /** DM section only - items without subscale */
  directItems?: SeedItem[];
};

export const ARC_INDEX_SEED = {
  instrument: {
    code: 'ARC_INDEX',
    nameKo: 'ARC Index — 통합 조직진단',
    version: 'v1.0',
    estimatedMinutes: 22,
  },
  sections: [
    {
      code: 'DM',
      nameKo: '기본 정보',
      order: 0,
      subscales: [],
      directItems: [
        {
          itemCode: 'DM01',
          textKo: '직급',
          scaleType: 'AGREEMENT_5',
          isDemographic: true,
          choiceOptions: ['1~3급(고위)', '4~5급(중간관리)', '6~7급(실무)', '8~9급(신규)', '무기계약직'],
          order: 1,
        },
        {
          itemCode: 'DM02',
          textKo: '재직기간',
          scaleType: 'AGREEMENT_5',
          isDemographic: true,
          choiceOptions: ['1년미만', '1~3년', '3~7년', '7~15년', '15년이상'],
          order: 2,
        },
        {
          itemCode: 'DM03',
          textKo: '부서유형',
          scaleType: 'AGREEMENT_5',
          isDemographic: true,
          choiceOptions: ['정책·기획', '사업·집행', '지원·행정', '현장·서비스', '연구·전문'],
          order: 3,
        },
        {
          itemCode: 'DM04',
          textKo: '연령대',
          scaleType: 'AGREEMENT_5',
          isDemographic: true,
          choiceOptions: ['20대', '30대', '40대', '50대이상'],
          order: 4,
        },
        {
          itemCode: 'DM05',
          textKo: 'AI 활용빈도',
          scaleType: 'AGREEMENT_5',
          isDemographic: true,
          choiceOptions: ['거의없음', '월1~2회', '주1~2회', '매일', '업무핵심'],
          order: 5,
        },
      ],
    },
    {
      code: 'OHI',
      nameKo: 'Organization Health Index — 조직 현재 건강',
      order: 1,
      subscales: [
        {
          code: 'SE.E',
          nameKo: '활력 (Energy / Vigor)',
          order: 1,
          items: [
            {
              itemCode: 'E01',
              textKo: '매일 아침 나는 업무에 대한 의욕과 에너지를 느낀다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'E02',
              textKo: '나는 하루 종일 업무에 필요한 에너지를 유지할 수 있다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'E03',
              textKo: '업무에서 어렵고 힘든 상황이 생겨도 나는 끈기 있게 계속 나아간다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
          ],
        },
        {
          code: 'SE.C',
          nameKo: '헌신·연결 (Commitment)',
          order: 2,
          items: [
            {
              // TODO: 원장님 확인 — 산식표 SE.C는 C01~C03, 드라이버 C(소통)도 C01~C02 사용. DB 유일성을 위해 SE.C는 SEC 접두.
              itemCode: 'SEC01',
              textKo: '내 업무는 나에게 깊은 의미와 성취감을 준다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'SEC02',
              textKo: '나는 내가 하는 일에 열정과 자부심을 느낀다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'SEC03',
              textKo: '나는 이 조직의 미래가 나의 미래와 연결되어 있다고 느낀다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
          ],
        },
        {
          code: 'SE.F',
          nameKo: '몰두 (Focus / Absorption)',
          order: 3,
          items: [
            {
              itemCode: 'F01',
              textKo: '일을 할 때 나는 완전히 집중하여 시간 가는 줄 모를 때가 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'F02',
              textKo: '업무를 할 때 나는 다른 모든 것을 잊고 완전히 몰두하는 경우가 있다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'SE_OE',
              textKo: '이 조직에서 일하면서 가장 의미 있는 것과 가장 힘든 것은 무엇입니까?',
              scaleType: 'OPEN_TEXT',
              order: 3,
            },
          ],
        },
        {
          code: 'BO',
          nameKo: '행동 결과변인 — Behavioral Outcomes',
          order: 4,
          items: [
            {
              itemCode: 'BO01',
              textKo: '나는 지난 3개월간 업무 개선이나 새로운 아이디어를 자발적으로 제안한 적이 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'BO02',
              textKo: '나는 담당 업무 범위를 넘어서도 팀의 성공을 위해 자발적으로 기여한다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'BO03',
              textKo: '나는 이 조직에서 중요한 문제가 있을 때 침묵하지 않고 목소리를 낸다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'BO_OE',
              textKo: '자발적으로 기여하거나 새로운 시도를 할 때 가장 방해가 되는 것은 무엇입니까?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'TL.TR',
          nameKo: '팀 리더십 — 신뢰·존중',
          order: 5,
          items: [
            {
              itemCode: 'TL01',
              textKo: '우리 팀 리더는 내가 어려운 상황에 처했을 때 나를 지지해줄 것이라고 믿는다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'TL02',
              textKo: '우리 팀 리더는 팀원 각자의 역량과 판단을 진심으로 존중한다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
          ],
        },
        {
          code: 'TL.GF',
          nameKo: '팀 리더십 — 성장지원·피드백',
          order: 6,
          items: [
            {
              itemCode: 'TL03',
              textKo: '우리 팀 리더는 내 강점과 성장 가능성에 관심을 갖고 구체적으로 지원한다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'TL04',
              textKo: '우리 팀 리더는 내 성과에 대해 도움이 되는 피드백을 적시에 준다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
          ],
        },
        {
          code: 'TL.PS',
          nameKo: '팀 리더십 — 심리적안전',
          order: 7,
          items: [
            {
              itemCode: 'TL05',
              textKo: '우리 팀 리더 앞에서 나는 모르는 것을 모른다고 편하게 말할 수 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'TL06',
              textKo: '우리 팀에서 새로운 시도가 잘 안 되더라도 그것이 불이익으로 돌아오지 않는다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'TL_OE',
              textKo: '우리 팀 리더십에서 가장 힘이 되는 것과 아쉬운 것은 무엇입니까? (신뢰·성장지원·심리적안전 중 무엇이 가장 중요한지도 함께 적어주세요)',
              scaleType: 'OPEN_TEXT',
              order: 3,
            },
          ],
        },
        {
          code: 'D',
          nameKo: '전략 방향',
          order: 8,
          items: [
            {
              itemCode: 'D01',
              textKo: '우리 기관의 미션과 전략 방향이 나에게 명확하게 전달된다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'D02',
              textKo: '우리 기관은 외부 환경 변화를 빠르게 감지하고 실제로 대응한다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'D_OE',
              textKo: '전략 방향에서 가장 명확한 것과 가장 혼란스러운 것은 무엇입니까?',
              scaleType: 'OPEN_TEXT',
              order: 3,
            },
          ],
        },
        {
          code: 'SL',
          nameKo: '경영진 리더십',
          isDriver: true,
          order: 9,
          items: [
            {
              itemCode: 'SL01',
              textKo: '경영진은 조직이 나아갈 방향과 그 의미를 명확히 제시한다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'SL02',
              textKo: '경영진의 의사결정을 신뢰한다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'SL03',
              textKo: '경영진은 구성원의 현장 목소리에 귀 기울인다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 3,
            },
            {
              itemCode: 'SL_OE',
              textKo: '경영진 리더십에서 가장 신뢰하는 것과 가장 개선이 필요한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'SV',
          nameKo: '직속 상사',
          isDriver: true,
          order: 10,
          items: [
            {
              itemCode: 'SV01',
              textKo: '직속 상사는 내 성장과 발전에 진심으로 관심을 갖는다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'SV02',
              textKo: '직속 상사는 내가 일을 잘할 수 있도록 충분히 지원한다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'SV03',
              textKo: '직속 상사는 내 성과 향상에 도움 되는 피드백을 준다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 3,
            },
            {
              itemCode: 'SV_OE',
              textKo: '직속 상사의 리더십에서 가장 도움이 되는 것과 아쉬운 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'PS',
          nameKo: '심리적 안전',
          isDriver: true,
          order: 11,
          items: [
            {
              itemCode: 'PS01',
              textKo: '이 조직에서 나는 어려운 문제나 불편한 진실을 편하게 꺼낼 수 있다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'PS02',
              textKo: '이 조직에서 위험을 감수하는 새로운 시도를 해도 안전하다고 느낀다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'PS03',
              textKo: '이 조직에서 실수를 하면 불이익을 받을 것이라는 두려움이 있다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              isReversed: true,
              order: 3,
            },
            {
              itemCode: 'PS_OE',
              textKo: '의견을 말하거나 새로운 시도를 할 때 가장 방해가 되는 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'C',
          nameKo: '소통 & 정보',
          isDriver: true,
          order: 12,
          items: [
            {
              itemCode: 'C01',
              textKo: '업무에 필요한 정보가 나에게 원활하게 공유된다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'C02',
              textKo: '나는 내 의견을 조직 윗선에 솔직하게 전달할 수 있다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'C_OE',
              textKo: '조직 내 소통에서 가장 개선이 필요한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 3,
            },
          ],
        },
        {
          code: 'EM',
          nameKo: '구조 & 자율권',
          isDriver: true,
          order: 13,
          items: [
            {
              itemCode: 'EM01',
              textKo: '업무를 잘 수행하는 데 필요한 의사결정 권한이 나에게 있다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'EM02',
              textKo: '부서 간 협업이 실제로 원활하게 이루어진다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'EM03',
              textKo: '회의·보고·결재 등 내부 행정 업무가 실제 가치 창출을 방해한다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              isReversed: true,
              order: 3,
            },
            {
              itemCode: 'EM_OE',
              textKo: '업무 자율성과 부서 간 협업에서 가장 개선이 필요한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'PM',
          nameKo: '성과 & 보상',
          isDriver: true,
          order: 14,
          items: [
            {
              itemCode: 'PM01',
              textKo: '나의 성과는 기여도에 비례하여 공정하게 평가된다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'PM02',
              textKo: '성과 평가 기준이 명확하고 사전에 충분히 공유된다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'PM03',
              textKo: 'AI 도구를 활용한 업무 혁신이 성과로 인정받는다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 3,
            },
            {
              itemCode: 'PM_OE',
              textKo: '성과 평가와 보상에서 가장 개선이 필요한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'LG',
          nameKo: '학습 & 성장',
          isDriver: true,
          order: 15,
          items: [
            {
              itemCode: 'LG01',
              textKo: '이 조직에서 나는 지속적으로 성장하고 있다고 느낀다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'LG02',
              textKo: '업무 중 새로운 것을 배울 기회가 충분히 주어진다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'LG03',
              textKo: '실수와 실패로부터 배울 수 있는 환경이 조성되어 있다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 3,
            },
            {
              itemCode: 'LG_OE',
              textKo: '성장과 학습을 위해 가장 시급하게 지원이 필요한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
        {
          code: 'CI',
          nameKo: '문화 & 포용',
          isDriver: true,
          order: 16,
          items: [
            {
              itemCode: 'CI01',
              textKo: '이 조직의 구성원들은 서로 존중하고 품위 있게 대한다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'CI02',
              textKo: '이 조직은 배경이나 출신에 상관없이 모든 구성원을 공정하게 대한다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'CI_OE',
              textKo: '우리 조직 문화에서 가장 자랑스러운 것과 바꾸고 싶은 것은?',
              scaleType: 'OPEN_TEXT',
              order: 3,
            },
          ],
        },
        {
          code: 'WE',
          nameKo: '업무 환경',
          isDriver: true,
          order: 17,
          items: [
            {
              itemCode: 'WE01',
              textKo: '업무에 필요한 도구·장비·자원이 충분히 갖춰져 있다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 1,
            },
            {
              itemCode: 'WE02',
              textKo: '나는 과도한 업무량으로 인해 지속적으로 지쳐있지 않다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 2,
            },
            {
              itemCode: 'WE03',
              textKo: '일과 삶의 균형을 유지하면서도 성장이 가능하다',
              scaleType: 'AGREEMENT_5',
              hasImportanceAxis: true,
              order: 3,
            },
            {
              itemCode: 'WE_OE',
              textKo: '업무 환경에서 가장 시급하게 개선이 필요한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 4,
            },
          ],
        },
      ],
    },
    {
      code: 'ORI',
      nameKo: 'Organization Readiness Index — 조직 미래 준비',
      order: 2,
      subscales: [
        {
          code: 'CD',
          nameKo: '변화 준비 방향 — Change Direction',
          order: 1,
          items: [
            {
              itemCode: 'CD01',
              textKo: '우리 기관은 앞으로 어떻게 변화해야 하는지 방향이 명확하다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'CD02',
              textKo: '우리 기관의 구성원들은 변화하지 않으면 뒤처진다는 긴장감을 공유하고 있다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'CD03',
              textKo: '변화의 필요성과 방향이 구성원에게 충분히 설명되고 있다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'CD04',
              textKo: '우리 기관에서 오래된 관행을 바꾸는 것은 매우 어렵다',
              scaleType: 'AGREEMENT_5',
              isReversed: true,
              order: 4,
            },
            {
              itemCode: 'CD05',
              textKo: '기관 지도부는 변화를 성공적으로 이끌어갈 능력이 있다고 신뢰한다',
              scaleType: 'AGREEMENT_5',
              order: 5,
            },
            {
              itemCode: 'CD_OE',
              textKo: '변화 준비에서 가장 잘 되는 것과 가장 시급한 것은?',
              scaleType: 'OPEN_TEXT',
              order: 6,
            },
          ],
        },
        {
          code: 'LA',
          nameKo: '학습 & 적응 역량 — Learning Agility',
          order: 2,
          items: [
            {
              itemCode: 'LA01',
              textKo: '우리 조직은 과거 경험으로부터 조직 차원에서 실제로 배운다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'LA02',
              textKo: '우리 조직은 다가오는 변화에 필요한 역량을 미리 개발하고 있다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'LA03',
              textKo: '구성원들이 새로운 업무 방식을 시도할 심리적·제도적 여건이 있다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'LA04',
              textKo: '어렵고 힘든 상황에서도 우리 팀은 빠르게 새로운 방식을 찾아낸다',
              scaleType: 'AGREEMENT_5',
              order: 4,
            },
            {
              itemCode: 'LA_OE',
              textKo: '변화에 빠르게 적응하기 위해 가장 먼저 강화해야 할 것은?',
              scaleType: 'OPEN_TEXT',
              order: 5,
            },
          ],
        },
        {
          code: 'AXS',
          nameKo: 'AX 전략 준비 — AX Strategy',
          order: 3,
          items: [
            {
              itemCode: 'AXS01',
              textKo: '우리 기관은 AI·디지털 전환에 대한 명확한 방향과 전략을 갖고 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'AXS02',
              textKo: 'AI 활용에 대한 명확한 윤리 기준과 가이드라인이 실제로 작동한다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'AXS03',
              textKo: 'AI 기반 의사결정의 책임 소재가 명확하게 정의되어 있다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'AXS04',
              textKo: '내 역할에서 AI가 맡아야 할 일과 내가 반드시 해야 할 일의 경계가 명확하다',
              scaleType: 'AGREEMENT_5',
              order: 4,
            },
            {
              itemCode: 'AXS_OE',
              textKo: 'AI 거버넌스에서 가장 시급하게 해결해야 할 것은?',
              scaleType: 'OPEN_TEXT',
              order: 5,
            },
          ],
        },
        {
          code: 'AXC',
          nameKo: 'AX 역량 준비 — AX Capability',
          order: 4,
          items: [
            {
              itemCode: 'AXC01',
              textKo: '나는 AI 도구를 업무에 실제로 활용할 수 있는 역량을 갖추고 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'AXC02',
              textKo: '나는 AI가 제공한 결과물이 틀렸을 때 그 이유를 파악하고 수정할 수 있다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'AXC03',
              textKo: '우리 기관은 AI 역량 개발을 위한 실질적 교육과 기회를 제공한다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'AXC04',
              textKo: '우리 팀에서 AI를 잘 모른다고 말해도 부끄럽거나 불이익이 없다',
              scaleType: 'AGREEMENT_5',
              order: 4,
            },
            {
              itemCode: 'AXC05',
              textKo: 'AI 활용을 통한 업무 혁신이 성과로 인정받을 수 있는 체계가 갖춰져 있다',
              scaleType: 'AGREEMENT_5',
              order: 5,
            },
            {
              itemCode: 'AXC_OE',
              textKo: 'AI 역량 개발을 위해 가장 먼저 지원해야 할 것은?',
              scaleType: 'OPEN_TEXT',
              order: 6,
            },
          ],
        },
        {
          code: 'AXA',
          nameKo: 'AXA 수용 의지 — People Ready',
          order: 5,
          items: [
            {
              itemCode: 'AXA01',
              textKo: '나는 AI 도구를 지금보다 업무에 더 많이 활용하고 싶다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'AXA02',
              textKo: 'AI를 더 잘 활용하면 내 커리어와 전문성 향상에 도움이 된다고 생각한다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
          ],
        },
        {
          code: 'AXG',
          nameKo: 'AXG 거버넌스 공포 — System Not Ready',
          order: 6,
          items: [
            {
              itemCode: 'AXG01',
              textKo: 'AI를 사용하다 문제가 생기면 내가 책임져야 한다는 부담을 느낀다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'AXG02',
              textKo: 'AI 활용에 대한 명확한 가이드라인이 없어서 어떻게 써야 할지 막막하다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'OPP_OE',
              textKo: 'AI를 더 잘 활용하기 위해 기관이 가장 먼저 해야 할 것은?',
              scaleType: 'OPEN_TEXT',
              order: 3,
            },
          ],
        },
      ],
    },
    {
      code: 'OVI',
      nameKo: 'Organization Velocity Index — 조직 변화 속도',
      order: 3,
      subscales: [
        {
          code: 'HV',
          nameKo: '조직 건강 변화 속도 — Health Velocity',
          order: 1,
          items: [
            {
              itemCode: 'HV01',
              textKo: '지난 6개월과 비교해서 우리 조직의 리더십이 더 나아지고 있다고 느낀다',
              scaleType: 'RETRO_CHANGE_5',
              order: 1,
            },
            {
              itemCode: 'HV02',
              textKo: '지난 6개월과 비교해서 구성원들이 의견을 말하는 것이 더 편해졌다고 느낀다',
              scaleType: 'RETRO_CHANGE_5',
              order: 2,
            },
            {
              itemCode: 'HV03',
              textKo: '지난 6개월과 비교해서 우리 팀의 협업과 소통이 더 원활해지고 있다고 느낀다',
              scaleType: 'RETRO_CHANGE_5',
              order: 3,
            },
            {
              itemCode: 'HV04',
              textKo: '지난 6개월과 비교해서 나의 성장과 발전 기회가 더 많아지고 있다고 느낀다',
              scaleType: 'RETRO_CHANGE_5',
              order: 4,
            },
            {
              itemCode: 'HV05',
              textKo: '지난 6개월과 비교해서 우리 조직의 성과 공정성이 더 개선되고 있다고 느낀다',
              scaleType: 'RETRO_CHANGE_5',
              order: 5,
            },
            {
              itemCode: 'HV_OE',
              textKo: '지난 6개월간 가장 눈에 띄게 좋아진 것과 가장 아쉬운 것은?',
              scaleType: 'OPEN_TEXT',
              order: 6,
            },
          ],
        },
        {
          code: 'CV',
          nameKo: '변화 실행 속도 — Change Velocity',
          order: 2,
          items: [
            {
              itemCode: 'CV01',
              textKo: '우리 기관에서 변화가 결정되고 현장에 실제로 적용되는 속도는 어느 정도인가?',
              scaleType: 'SPEED_5',
              order: 1,
            },
            {
              itemCode: 'CV02',
              textKo: '지난 6개월과 비교해서 우리 조직이 외부 변화에 더 빠르게 대응하고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 2,
            },
            {
              itemCode: 'CV03',
              textKo: '지난 6개월과 비교해서 불필요한 관행이나 절차가 실제로 줄어들고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 3,
            },
            {
              itemCode: 'CV04',
              textKo: '우리 조직은 시도 → 실패 → 학습 → 재시도의 사이클이 더 빨라지고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 4,
            },
            {
              itemCode: 'CV05',
              textKo: '지난 6개월과 비교해서 의사결정이 더 빠르고 명확해지고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 5,
            },
            {
              itemCode: 'CV_OE',
              textKo: '변화 실행 속도를 높이기 위해 가장 먼저 제거해야 할 장애물은?',
              scaleType: 'OPEN_TEXT',
              order: 6,
            },
          ],
        },
        {
          code: 'AV',
          nameKo: 'AX 전환 속도 — AX Velocity',
          order: 3,
          items: [
            {
              itemCode: 'AV01',
              textKo: '지난 6개월과 비교해서 AI 도구 활용이 우리 조직에 더 넓게 퍼지고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 1,
            },
            {
              itemCode: 'AV02',
              textKo: '지난 6개월과 비교해서 AI 때문에 실제로 업무 방식이 달라지고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 2,
            },
            {
              itemCode: 'AV03',
              textKo: '지난 6개월과 비교해서 AI에 대한 두려움이나 불안이 줄어들고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 3,
            },
            {
              itemCode: 'AV04',
              textKo: '지난 6개월과 비교해서 AI 활용이 성과로 인정받는 분위기가 강해지고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 4,
            },
            {
              itemCode: 'AV05',
              textKo: '우리 기관의 AI 전환 속도가 외부 환경의 변화 속도를 따라가고 있다',
              scaleType: 'RETRO_CHANGE_5',
              order: 5,
            },
            {
              itemCode: 'AV_OE',
              textKo: 'AI 전환 속도를 높이기 위해 가장 효과적인 것은 무엇이라고 생각합니까?',
              scaleType: 'OPEN_TEXT',
              order: 6,
            },
          ],
        },
      ],
    },
    {
      code: 'OAI',
      nameKo: 'Organization Alignment Index — 조직 방향 정렬',
      order: 4,
      subscales: [
        {
          code: 'SA',
          nameKo: '전략 정렬 — Strategic Alignment',
          weight: 0.4,
          order: 1,
          items: [
            {
              itemCode: 'SA01',
              textKo: '우리 기관의 일상적 업무는 기관의 핵심 전략 방향과 직접 연결되어 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'SA02',
              textKo: '기관 경영진이 강조하는 우선순위와 내가 실제로 시간을 쓰는 곳이 일치한다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'SA03',
              textKo: '회의·보고·결재에서 다뤄지는 내용이 우리 기관의 핵심 방향과 연관되어 있다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'SA04',
              textKo: '부서 간 협업이 기관 전체 방향보다 각 부서 이익 중심으로 이루어진다',
              scaleType: 'AGREEMENT_5',
              isReversed: true,
              order: 4,
            },
            {
              itemCode: 'SA05',
              textKo: '우리 기관의 변화 노력이 1~2년 후 어떤 구체적인 모습을 만들어낼지 그림이 그려진다',
              scaleType: 'AGREEMENT_5',
              order: 5,
            },
            {
              itemCode: 'SA06',
              textKo: '성과 평가 기준이 기관이 나아가야 할 방향을 실제로 반영하고 있다',
              scaleType: 'AGREEMENT_5',
              order: 6,
            },
            {
              itemCode: 'SA_OE',
              textKo: '기관의 전략 방향이 현장에서 가장 잘 실현되는 것과 가장 어긋나는 것은 무엇입니까?',
              scaleType: 'OPEN_TEXT',
              order: 7,
            },
          ],
        },
        {
          code: 'EA',
          nameKo: '에너지 정렬 — Energy Alignment',
          weight: 0.35,
          order: 2,
          items: [
            {
              itemCode: 'EA01',
              textKo: '내가 가장 많은 에너지를 쏟는 일이 우리 기관에서 가장 중요한 일과 일치한다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'EA02',
              textKo: '열심히 한 일이 기관이 원하는 방향의 결과로 이어지고 있다고 느낀다',
              scaleType: 'AGREEMENT_5',
              order: 2,
            },
            {
              itemCode: 'EA03',
              textKo: '중요하지 않은 일에 시간과 에너지를 낭비하고 있다고 느낀다',
              scaleType: 'AGREEMENT_5',
              isReversed: true,
              order: 3,
            },
            {
              itemCode: 'EA04',
              textKo: '우리 팀의 집단 에너지가 기관의 핵심 과제에 집중되어 있다',
              scaleType: 'AGREEMENT_5',
              order: 4,
            },
            {
              itemCode: 'EA05',
              textKo: '지금 내가 하는 일이 기관의 공공 가치와 미래를 만드는 데 실제로 기여하고 있다',
              scaleType: 'AGREEMENT_5',
              order: 5,
            },
            {
              itemCode: 'EA06',
              textKo: '변화 과제와 일상 업무 사이에서 무엇을 더 중요시해야 할지 혼란스럽다',
              scaleType: 'AGREEMENT_5',
              isReversed: true,
              order: 6,
            },
            {
              itemCode: 'EA_OE',
              textKo: '내 에너지가 가장 의미 있게 쓰이는 업무와 가장 낭비된다고 느끼는 업무는 무엇입니까?',
              scaleType: 'OPEN_TEXT',
              order: 7,
            },
          ],
        },
        {
          code: 'OA',
          nameKo: '결과 정렬 — Outcome Alignment',
          weight: 0.25,
          order: 3,
          items: [
            {
              itemCode: 'OA01',
              textKo: '지난 6개월 우리 기관의 변화 노력이 처음 의도한 방향의 결과를 실제로 만들고 있다',
              scaleType: 'AGREEMENT_5',
              order: 1,
            },
            {
              itemCode: 'OA02',
              textKo: '변화 시도의 결과가 예상치 못한 방향으로 나타나는 경우가 많다',
              scaleType: 'AGREEMENT_5',
              isReversed: true,
              order: 2,
            },
            {
              itemCode: 'OA03',
              textKo: '개선하려고 한 것이 실제로 개선되고 있다는 것을 구성원이 체감한다',
              scaleType: 'AGREEMENT_5',
              order: 3,
            },
            {
              itemCode: 'OA04',
              textKo: '우리 기관의 학습과 개선이 같은 문제를 반복하지 않는 방향으로 이루어지고 있다',
              scaleType: 'AGREEMENT_5',
              order: 4,
            },
            {
              itemCode: 'OA05',
              textKo: 'AI·디지털 전환 노력이 실제 공공서비스 방식을 의도한 방향으로 바꾸고 있다',
              scaleType: 'AGREEMENT_5',
              order: 5,
            },
            {
              itemCode: 'OA06',
              textKo: '측정하고 보고하는 성과지표가 기관이 정말 원하는 방향의 성과를 반영한다',
              scaleType: 'AGREEMENT_5',
              order: 6,
            },
            {
              itemCode: 'OA_OE',
              textKo: '우리 기관에서 의도한 대로 잘 작동하고 있는 변화와, 노력했는데 결과가 기대와 달리 나타나는 변화는 각각 무엇입니까?',
              scaleType: 'OPEN_TEXT',
              order: 7,
            },
          ],
        },
      ],
    },
  ] satisfies SeedSection[],
};

# 글로벌 역량사전 기반 역량·루브릭·질문 확장 (전체 20역량판) — 커서용 스크립트

## 어떤 역량사전을 근거로 삼았는가

**Spencer & Spencer의 "Competence at Work"(1993) 범용 역량사전** — 6클러스터·20역량·41차원·289개 행동지표로 구성된, McClelland의 BEI(행동사건면접) 방법론을 만든 컨설팅사(McBer)에서 Lyle Spencer가 20년간 650개 직무를 분석해 만든 사실상 표준 역량사전입니다. 이 프로젝트가 이미 근거로 삼는 BEI 이론의 직계 후속 연구라 이론적 계보가 끊기지 않습니다. 지난번엔 20개 중 12개만 샘플로 뽑았는데, 이번에 **나머지 8개까지 포함해 20개 전체**로 확장했습니다.

교차 검증(구조만 참고, 목록은 베끼지 않음):
- **SHL Universal Competency Framework**("Great Eight" — Leading and Deciding / Supporting and Cooperating / Interacting and Presenting / Analyzing and Interpreting / Creating and Conceptualizing / Organizing and Executing / Adapting and Coping / Enterprising and Performing) — Bartram의 학술 논문으로 공개.
- **Korn Ferry Lominger Leadership Architect**(67역량·26클러스터) — 상용 라이선스 제품이라 목록은 가져오지 않고 구조 중첩만 확인.
- **영국 공무원 Success Profiles — Civil Service Behaviours**(gov.uk, Cabinet Office, 2024-10-09 최초 발행) — **실제로 전세계에서 지금 쓰이고 있는 공개 정부 구조화 면접 프레임워크**입니다. 9개 행동지표를 STAR 기법으로 1~7점 채점하며, 채용 공고마다 직무에 맞는 행동지표를 선택해 보통 6~8개 구조화 질문으로 면접합니다. OGL v3.0 라이선스(공공저작물, 출처표시 조건)로 전문 공개 — 아래 "교차 참조" 섹션에 9개 항목을 그대로 인용(출처표시)했습니다.
- (참고, 사용 안 함) **미국 OPM Executive Core Qualifications**는 2025년 10월 개정판이 미국 특정 정치 이슈("헌법 원칙 준수" 등)를 담고 있어 한국 HR 제품에 들여오기 부적절하다고 판단, 이번 사전에서 제외했습니다. 굳이 참조가 필요하면 30년 가까이 안정적으로 인용돼 온 구버전 5개 명칭(Leading Change/Leading People/Results Driven/Business Acumen/Building Coalitions)만 개념적으로 참고할 수 있습니다.

**아래 역량 정의·루브릭·질문은 전부 이 프로젝트가 자체 저작**했습니다 — Spencer & Spencer 원서 문장을 베낀 게 아니라 클러스터·역량 이름과 개념만 참고해서 새로 썼습니다. 단, 영국 Civil Service Behaviours 9개 항목의 "정의(Definition)" 한 줄은 OGL 라이선스 공공저작물이라 원문을 그대로 인용·출처표시했습니다(문서 최하단 교차 참조 섹션).

## 이 역량사전을 기존 시스템에 어떻게 붙일 것인가

지금 `Competency`(NCS 6개: COMMUNICATION/PROBLEM_SOLVING/JOB_FIT/ORG_FIT/LEADERSHIP/GROWTH)는 IRT 엔진·세션 흐름 전체에 하드코딩된 채용 인터뷰 전용 체계입니다. 이번 글로벌 역량사전은 **완전히 별도 계층**으로 추가하는 걸 권합니다 — "역량평가(면접 외 형태 — 자기평가/360)" 모듈에 쓰기 위한 것이라 IRT 세션에 섞지 말고 독립된 모델로 둡니다.

## 역량사전 콘텐츠 (6클러스터 × 20역량, 질문 총 48개)

### 1. 성취와 행동 (Achievement and Action)

**성취지향 (Achievement Orientation)** — 더 나은 방식으로 일을 해내려는 내적 기준을 갖고, 스스로 목표를 높여가는 정도
- L1: 주어진 목표만 겨우 채운다 / L2: 정해진 기준은 충족한다 / L3: 스스로 개선점을 찾아 시도한다 / L4: 이전보다 나은 결과를 낼 구체적 목표를 세우고 달성한다 / L5: 위험을 감수하고서라도 조직에 의미 있는 성과를 만든다
- 질문: "목표를 초과 달성했던 경험을 구체적으로 말씀해주세요. 무엇을 다르게 시도했나요?" / "아무도 시키지 않았는데 스스로 기준을 높여 일했던 경험이 있나요?"

**주도성 (Initiative)** — 문제가 드러나기 전에 먼저 움직이는 정도
- L1: 지시받은 일만 한다 / L2: 문제가 생기면 그때 대응한다 / L3: 눈앞의 문제를 먼저 나서서 해결한다 / L4: 몇 주~몇 달 앞의 문제를 예측해 미리 대비한다 / L5: 회사 방향 자체에 영향을 주는 장기적 기회를 스스로 만든다
- 질문: "문제가 커지기 전에 먼저 나서서 해결한 경험을 말씀해주세요." / "아무도 요청하지 않았지만 스스로 시작한 일이 있나요?"

**질서와 품질에 대한 관심 (Concern for Order, Quality and Accuracy)** — 업무의 정확성·완결성을 스스로 점검하고 체계를 만드는 정도
- L1: 실수를 지적받아야 안다 / L2: 마감 전 스스로 한 번 확인한다 / L3: 정확성을 위한 자기만의 점검 절차를 갖고 있다 / L4: 반복되는 실수를 막기 위한 체크리스트·프로세스를 만든다 / L5: 조직 전체의 품질 기준·시스템을 설계한다
- 질문: "본인이 만든 점검 절차나 체크리스트 덕분에 실수를 막았던 경험이 있나요?" / "정확성을 위해 남들보다 한 단계 더 확인했던 습관이나 사례를 말씀해주세요."

**정보 수집 (Information Seeking)** — 의사결정을 위해 다양한 경로로 정보를 파고드는 정도
- L1: 주어진 정보만 사용한다 / L2: 궁금하면 한 사람에게 물어본다 / L3: 여러 경로(사람·자료·현장)로 직접 확인한다 / L4: 남들이 놓친 이면 정보까지 체계적으로 조사한다 / L5: 정보 수집 네트워크·프로세스 자체를 구축한다
- 질문: "결정을 내리기 전에 여러 경로로 직접 정보를 파고들었던 경험을 말씀해주세요." / "다들 당연하게 여긴 걸 직접 확인해봤더니 다른 사실이 나왔던 경험이 있나요?"

### 2. 조력과 대인서비스 (Helping and Human Service)

**대인이해 (Interpersonal Understanding)** — 타인의 감정·의도·니즈를 정확히 읽어내는 정도
- L1: 타인의 감정을 거의 신경 쓰지 않는다 / L2: 명백한 감정 표현만 알아챈다 / L3: 말로 표현 안 된 감정·의도까지 짐작한다 / L4: 상대의 입장에서 왜 그렇게 느끼는지 이해하고 반영한다 / L5: 복잡한 이해관계 속에서 각자의 숨은 동기를 파악해 조율한다
- 질문: "동료나 고객이 말하지 않은 불만을 먼저 알아채고 대응했던 경험이 있나요?" / "입장이 다른 두 사람 사이에서 각자의 속마음을 파악해 조율한 경험을 말씀해주세요."

**고객지향 (Customer Service Orientation)** — 고객(내부·외부)의 니즈를 실제로 해결해주려는 정도
- L1: 요청받은 일만 처리한다 / L2: 고객 불만에 성실히 응대한다 / L3: 고객이 말하지 않은 잠재 니즈까지 찾아 해결한다 / L4: 장기적 관점에서 고객에게 진짜 도움이 되는 제안을 한다 / L5: 고객의 신뢰할 수 있는 조언자 역할을 한다
- 질문: "고객(또는 협업 부서)이 요청하지 않았지만 필요할 거라 판단해 먼저 제공한 게 있나요?" / "고객의 단기 요청과 장기적 이익이 부딪혔을 때 어떻게 처리했나요?"

### 3. 영향력 (Impact and Influence)

**영향력과 설득 (Impact and Influence)** — 타인의 생각·행동을 원하는 방향으로 움직이게 하는 정도
- L1: 설득 시도를 거의 안 한다 / L2: 직접적으로 요청·설명한다 / L3: 상대에 맞춰 논거·자료를 다르게 준비한다 / L4: 여러 사람에게 순차적으로 영향을 미쳐 분위기를 바꾼다 / L5: 복잡한 이해관계자 구조를 읽고 전략적으로 설득 순서를 설계한다
- 질문: "본인의 의견에 회의적이던 사람을 설득해 방향을 바꾼 경험을 말씀해주세요." / "상대에 따라 설득 방식을 다르게 준비했던 경험이 있나요?"

**관계 구축 (Relationship Building)** — 업무에 도움이 되는 인적 네트워크를 의도적으로 만들고 유지하는 정도
- L1: 필요할 때만 연락한다 / L2: 업무 관계를 우호적으로 유지한다 / L3: 당장 필요하지 않아도 관계를 꾸준히 관리한다 / L4: 서로 다른 조직·부서 간 신뢰 관계를 의도적으로 만든다 / L5: 폭넓은 네트워크를 조직의 자산으로 연결한다
- 질문: "당장 필요하지 않았지만 꾸준히 관계를 쌓아뒀던 사람이 나중에 도움이 된 경험이 있나요?" / "서로 소원했던 부서·팀 사이를 연결한 경험을 말씀해주세요."

**조직 인식 (Organizational Awareness)** — 조직 내 권력구조·이해관계·비공식 역학을 파악하는 정도
- L1: 공식 조직도만 안다 / L2: 누가 어떤 역할인지는 안다 / L3: 의사결정이 실제로 어디서 이뤄지는지 파악한다 / L4: 부서 간 이해관계 충돌을 미리 읽고 대응한다 / L5: 조직 전체의 비공식 역학까지 활용해 일을 성사시킨다
- 질문: "공식 절차만으로는 안 풀리던 일을, 실제 의사결정 구조를 파악해서 풀어낸 경험이 있나요?" / "부서 간 이해관계가 부딪힐 걸 미리 알고 대비했던 경험을 말씀해주세요."

### 4. 관리 역량 (Managerial)

**타인 육성 (Developing Others)** — 동료·후배의 성장을 실제로 돕는 정도
- L1: 육성에 시간을 쓰지 않는다 / L2: 요청받으면 알려준다 / L3: 상대가 스스로 답을 찾도록 코칭한다 / L4: 개인별 성장 계획을 세워 꾸준히 피드백한다 / L5: 조직 차원의 육성 체계를 만든다
- 질문: "후배나 동료가 스스로 답을 찾도록 코칭했던 경험을 말씀해주세요." / "누군가의 성장을 위해 꾸준히 신경 쓴 구체적 사례가 있나요?"

**팀워크와 협력 (Teamwork and Cooperation)** — 팀의 성과를 위해 자신의 몫 이상을 기여하는 정도
- L1: 자기 몫만 한다 / L2: 협조 요청에 응한다 / L3: 팀 성과를 위해 먼저 나서 돕는다 / L4: 갈등을 조율해 팀 전체가 협력하게 만든다 / L5: 여러 팀에 걸쳐 협업 문화를 만든다
- 질문: "본인 업무가 아닌데도 팀 성과를 위해 나서서 도운 경험이 있나요?" / "팀 내 갈등을 직접 조율해서 협력을 끌어낸 경험을 말씀해주세요."

**지시성 (Directiveness)** — 필요할 때 명확한 기준·기대치를 제시하고 단호하게 요구하는 정도
- L1: 기대치를 명확히 제시하지 못한다 / L2: 요청하면 지시를 내린다 / L3: 스스로 기준을 세워 명확히 요구한다 / L4: 성과 미달 시 단호하게 피드백하고 개선을 요구한다 / L5: 조직 전체의 기준·원칙을 세우고 일관되게 관철시킨다
- 질문: "다른 사람에게 명확한 기준을 제시하고 그대로 지키도록 요구했던 경험이 있나요?" / "불편하더라도 단호하게 피드백을 줘야 했던 상황을 말씀해주세요."

**팀 리더십 (Team Leadership)** — 집단의 목표를 위해 방향을 제시하고 구성원을 이끄는 정도
- L1: 리더 역할을 맡지 않는다 / L2: 맡은 역할 안에서 팀을 돕는다 / L3: 팀 목표·역할 분담을 정리해 이끈다 / L4: 팀의 비전을 제시하고 동기부여한다 / L5: 어려운 상황에서도 팀을 지키고 방향을 유지한다
- 질문: "팀을 이끌어 목표를 달성했던 경험을 말씀해주세요(공식 직책이 아니어도 좋습니다)." / "팀이 어려운 상황에 처했을 때 방향을 제시했던 경험이 있나요?"

### 5. 인지 역량 (Cognitive)

**분석적 사고 (Analytical Thinking)** — 문제를 요소로 쪼개 논리적 인과관계를 파악하는 정도
- L1: 문제를 있는 그대로만 본다 / L2: 명백한 원인 하나를 찾는다 / L3: 여러 원인을 체계적으로 분리해 분석한다 / L4: 복잡한 문제를 구조화해 우선순위를 정한다 / L5: 데이터·모델을 활용해 복잡한 인과관계를 규명한다
- 질문: "복잡한 문제를 여러 원인으로 나눠 분석했던 경험을 말씀해주세요." / "데이터나 근거를 바탕으로 원인을 규명한 사례가 있나요?"

**개념적 사고 (Conceptual Thinking)** — 겉보기 다른 정보들 사이의 패턴·연결을 찾아내는 정도
- L1: 정보를 개별적으로만 본다 / L2: 익숙한 패턴에 맞춰 판단한다 / L3: 여러 정보를 연결해 새로운 관점을 만든다 / L4: 복잡한 상황을 단순한 프레임으로 재정의한다 / L5: 완전히 새로운 개념·모델을 창출한다
- 질문: "서로 관련 없어 보이는 정보를 연결해서 새로운 아이디어를 낸 경험이 있나요?" / "복잡한 상황을 간단한 원칙으로 정리해 팀에 설명한 사례를 말씀해주세요."

**전문성 (Expertise)** — 자기 직무 영역의 지식·기술을 깊이 갖추고 계속 갱신하는 정도
- L1: 기본 업무 지식만 있다 / L2: 필요한 지식을 그때그때 찾아본다 / L3: 해당 분야 지식을 체계적으로 갖추고 있다 / L4: 남에게 지식을 전수할 정도로 깊이 안다 / L5: 해당 분야의 새 흐름을 만들거나 조직의 전문성 기준을 세운다
- 질문: "본인 분야에서 남들이 모르는 것까지 파고들어 해결했던 경험이 있나요?" / "본인의 전문 지식을 다른 사람에게 전수하거나 표준화한 경험을 말씀해주세요."

### 6. 개인 효과성 (Personal Effectiveness)

**자기통제 (Self-Control)** — 압박·감정적 상황에서도 침착하게 행동을 유지하는 정도
- L1: 압박 상황에서 감정이 그대로 드러난다 / L2: 감정을 억누르지만 티가 난다 / L3: 압박 속에서도 침착하게 대응한다 / L4: 스트레스 상황에서 오히려 더 건설적으로 반응한다 / L5: 극한 상황에서도 팀 전체를 안정시킨다
- 질문: "압박이 심한 상황에서도 침착하게 대응했던 경험을 말씀해주세요." / "감정적으로 힘들었던 상황에서 어떻게 스스로를 다잡았나요?"

**유연성 (Flexibility)** — 변화하는 상황·요구에 접근 방식을 조정하는 정도
- L1: 정해진 방식을 고수한다 / L2: 지시가 있으면 방식을 바꾼다 / L3: 상황에 맞춰 스스로 접근법을 조정한다 / L4: 다양한 이해관계자의 요구에 맞춰 유연하게 대응한다 / L5: 근본 전략까지 상황에 맞게 재설계한다
- 질문: "계획이 갑자기 틀어졌을 때 접근 방식을 바꿔 대응한 경험이 있나요?" / "예상과 다른 상황에서 유연하게 방향을 바꾼 사례를 말씀해주세요."

**자기확신 (Self-Confidence)** — 스스로의 판단·능력을 믿고 도전적 상황에서도 소신을 지키는 정도
- L1: 결정을 늘 남에게 확인받으려 한다 / L2: 익숙한 일에서는 자신 있게 행동한다 / L3: 실패 가능성이 있어도 스스로 판단해 행동한다 / L4: 권위 있는 사람 앞에서도 소신을 굽히지 않고 의견을 낸다 / L5: 실패를 겪고도 배움으로 삼아 더 큰 도전에 나선다
- 질문: "상급자나 전문가의 의견과 달랐지만 본인의 판단을 소신 있게 밀어붙인 경험이 있나요?" / "실패했던 경험에서 무엇을 배워 다음 도전에 반영했나요?"

**조직헌신 (Organizational Commitment)** — 개인의 이익보다 조직의 목표·가치를 우선하는 정도
- L1: 조직 목표에 관심이 적다 / L2: 맡은 역할 안에서 조직 방침을 따른다 / L3: 개인적으로 손해여도 조직 목표를 우선한다 / L4: 조직의 가치를 팀에 전파하고 실천을 독려한다 / L5: 장기적으로 조직에 헌신하며 위기 상황에도 조직을 지킨다
- 질문: "개인적으로는 손해였지만 조직(팀)을 위해 선택했던 경험이 있나요?" / "조직의 방향이나 가치에 스스로 공감해 앞장서 실천한 경험을 말씀해주세요."

## 교차 참조 — 영국 공무원 Success Profiles: Civil Service Behaviours (9개)

실제로 지금 전세계 정부기관 구조화 면접에서 쓰이는 공개 프레임워크입니다. 아래 9개 항목명·정의는 영국 정부(Cabinet Office) 공식 발행 자료를 **OGL v3.0 라이선스 조건에 따라 출처 표시 후 그대로 인용**했습니다(© Crown copyright, gov.uk). 회사별로 직무에 맞는 일부만 골라 6~8문항, STAR 기법, 1~7점 척도로 평가합니다.

| 행동지표 | 정의 | Spencer & Spencer 상 유사 클러스터 |
|---|---|---|
| Seeing the big picture (큰 그림 이해) | Understand how your role fits with and supports organisational objectives. Recognise the wider Civil Service priorities and ensure work is in the national interest. | 조직 인식 |
| Changing and improving (변화와 개선) | Seek out opportunities to create effective change and suggest innovative ideas for improvement. Review ways of working, including seeking and providing feedback. | 주도성 / 개념적 사고 |
| Making effective decisions (효과적 의사결정) | Use evidence and knowledge to support accurate, expert decisions and advice. Carefully consider alternative options, implications and risks of decisions. | 분석적 사고 |
| Leadership (리더십) | Show pride and passion for public service. Create and engage others in delivering a shared vision. Value difference, diversity and inclusion, ensuring fairness and opportunity for all. | 팀 리더십 |
| Communicating and influencing (소통과 영향력) | Communicate purpose and direction with clarity, integrity and enthusiasm. Respect the needs, responses and opinions of others. | 영향력과 설득 |
| Working together (협업) | Form effective partnerships and relationships with people both internally and externally, from a range of diverse backgrounds, sharing information, resources and support. | 팀워크와 협력 / 관계 구축 |
| Developing self and others (자신과 타인의 성장) | Focus on continuous learning and development for self, others and the organisation as a whole. | 타인 육성 |
| Managing a quality service (품질 관리) | Deliver service objectives with professional excellence, expertise and efficiency, taking account of diverse customer needs. | 고객지향 / 질서와 품질에 대한 관심 |
| Delivering at pace (신속한 실행) | Take responsibility for delivering timely and quality results with focus and drive. | 성취지향 |

출처: gov.uk, "Success Profiles: Civil Service behaviours", Cabinet Office (최초 발행 2024-10-09, 최종 개정 2025-01-29), Open Government Licence v3.0. https://www.gov.uk/government/publications/success-profiles/success-profiles-civil-service-behaviours

이 표는 "우리 20역량 사전이 실제 글로벌 정부 채용 프레임워크와 구조적으로 겹친다"는 근거 자료로만 쓰고, 질문 콘텐츠 자체는 위 20역량 섹션의 자체 저작 질문을 그대로 사용합니다.

## 커서에 붙여넣을 프롬프트

```
이 프로젝트에 Spencer & Spencer(1993) 범용 역량사전 구조를 참고한 새로운
역량 체계를 별도 계층으로 추가해줘. 기존 Competency(NCS 6개 — COMMUNICATION
/PROBLEM_SOLVING/JOB_FIT/ORG_FIT/LEADERSHIP/GROWTH)는 IRT 채용 면접
전용이라 건드리지 말고, 이번 건 완전히 별도 모델로 만들어줘 — 지난번
설계한 "역량평가(면접 외 형태 — 자기평가/360)" 모듈에서 쓸 콘텐츠야.

## 스키마

GlobalCompetencyCluster(역량군) — id, code, nameKo, nameEn, description
GlobalCompetency(역량) — id, clusterId, code, nameKo, nameEn, definition
GlobalCompetencyRubricLevel(루브릭) — id, competencyId, level(1~5),
  descriptionKo
GlobalCompetencyQuestion(질문) — id, competencyId, questionText, externalId
GlobalCompetencyBenchmarkRef(교차참조, 선택) — id, competencyId,
  frameworkName(예: "UK Civil Service Behaviours"), refLabel, refDefinition,
  sourceUrl, licenseNote — 콘텐츠 근거를 관리자 화면에 함께 보여주기 위한
  참고용 테이블. 채점에는 관여하지 않음.

## 시드 데이터

아래 6개 역량군 × 20개 역량, 역량별 정의 + 5단계 루브릭 + 질문 2개씩
(총 48문항)을 seed/global-competencies.json으로 만들어서 DB에 넣어줘.
내용은 이 문서에 이미 다 적어뒀으니 그대로 옮겨줘:

[여기에 위 "역량사전 콘텐츠" 섹션 전체를 그대로 붙여넣어줘 — 6개 역량군,
20개 역량, 각각의 정의·5단계 루브릭·질문 2개씩]

교차참조 데이터도 함께 seed/global-competency-benchmarks.json으로 만들어줘:

[여기에 위 "교차 참조 — 영국 공무원 Success Profiles" 표 전체를 그대로
붙여넣어줘 — 9개 행동지표명, 정의(영문 원문 그대로, OGL 라이선스 인용),
출처 URL, 라이선스 표기]

## UI

/admin/content(또는 새 탭)에 "글로벌 역량사전" 섹션 추가 — 역량군별로
아코디언, 역량 클릭 시 정의·루브릭 5단계·질문 목록 표시. 각 역량 상세
화면 하단에 "관련 글로벌 벤치마크" 접이식 섹션을 두고 GlobalCompetency
BenchmarkRef가 있으면 프레임워크명·원문 정의·출처 링크를 함께 보여줘
(라이선스 표기 필수). 콘텐츠 관리자가 직접 역량/질문/루브릭을 추가·수정할
수 있게 해줘(이미 있는 CMS 패턴 재사용 — CONTENT_ADMIN 권한 체크, 감사
로그 남기기).

## 원칙

- 이 역량사전은 지금 당장 IRT 채점에 연결하지 마 — 향후 "역량평가(자기
  평가/360)" 모듈에서 쓸 콘텐츠 기반을 먼저 마련하는 단계야.
- Spencer & Spencer 원서 문장을 그대로 베끼지 말 것(이미 자체 저작해뒀음,
  이 문서 내용 그대로 쓰면 됨) — 특허·저작권 회피 원칙 유지.
- 영국 Civil Service Behaviours 정의문은 OGL v3.0 공공저작물이라 원문
  인용이 허용되지만, 반드시 출처(Crown copyright, gov.uk URL)를 함께
  표시할 것 — UI에서도 라이선스 문구 노출.
- 스키마 변경이 있으니 npx prisma migrate dev + npm run build 확인해줘.

작업 끝나면 docs/STATUS.md에 이번 작업(근거 이론, 20역량 전체 목록,
스키마, 마이그레이션 파일명, 향후 역량평가 모듈과의 연결 계획)을 기존
문서 스타일대로 정리해줘.
```

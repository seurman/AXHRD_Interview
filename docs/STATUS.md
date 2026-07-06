# 현재 상태 (2026-07-06 기준)

새 대화/작업창에서 이어가실 때 이 문서를 먼저 읽어달라고 하시면 됩니다.

## 배포 현황

- **운영 주소**: https://app.axhrd.com (Vercel Hobby)
- `www.axhrd.com`, `axhrd.com` → `app.axhrd.com`으로 리다이렉트
- DB: Supabase PostgreSQL (Seoul 리전, Free tier)
- IRT 엔진(FastAPI): Render (Singapore 리전, Free tier — 15분 미사용 시 슬립, 첫 요청 30~60초 지연될 수 있음)
- GitHub: https://github.com/seurman/AXHRD_Interview (master 브랜치, push 완료)
- 소셜 로그인: 카카오 로그인 정상 작동 (단, 이메일 동의항목 미승인 상태라 `kakao_숫자@oauth.hr-in.local` 형태의 임시 이메일로 가입됨 — 실제 이메일 필요해지면 카카오 개발자 콘솔에서 이메일 동의항목 추가 신청 필요)

## 완료된 주요 기능

- IRT(2PL) 기반 적응형 모의 면접 (역량별 2~3문항, 실시간 난이도 조정)
- 자소서 맞춤 질문 생성 (Gemini) — 같은 일화 반복 방지, 문항별 채점 루브릭 자동 생성
- 음성 답변 → STT 오타 교정(Gemini) → 채점
- 세션 리포트 / 역량별 피드백 (강점·개선점·재작성 예시·전달력 통계)
- "왜 이 질문인가요?" — IRT 문항 선택 근거 투명 공개
- 역량 인증서(`/profile/certificate`) + 공개 공유 링크(`/c/[slug]`)
- **대학 취업센터용 코호트 대시보드**:
  - `/org/setup` — 학생은 가입 코드로 소속 연결, 담당자는 기관을 새로 만들어 ADMIN이 됨
  - `/org/dashboard` — 소속 학생 현황(완료 면접 수, 평균 백분위), 역량별 코호트 평균(취약 역량 우선 정렬)
  - 개인 답변 원문은 노출하지 않고 점수·완료 현황만 집계 (프라이버시 원칙)
- **코호트 기관 생성 승인 절차** (배포 완료):
  - 신규 기관은 `PENDING` 상태로 생성 → 학생 가입 코드 사용 불가, `/org/dashboard`도 승인 대기 화면만 표시
  - `/admin/organizations` — `SUPERADMIN_EMAILS` 환경변수에 등록된 이메일(현재 `seurman@gmail.com`)만 접근, 대기 중인 기관 승인/반려
  - 마이그레이션 시 기존에 이미 만들어져 있던 기관은 자동으로 `APPROVED`로 백필됨 (신규 생성 기관부터만 승인 절차 적용)
  - 로컬 `prisma migrate deploy` + Vercel 재배포 완료 확인됨
- **학교(기관) 간 퍼포먼스 비교** (스키마 변경 없음, 코드만 추가 — 마이그레이션 불필요): NACE/PDP 등 대학 취업센터 벤치마킹 대시보드 관행 참고(동료 기관 대비 완료율·성과 비교, 소규모 표본 특정 방지)
  - `lib/org/benchmark.ts` 신규 — `computeOrgAggregate()`(기관 1개의 학생 수/활동 학생 수/완료율/역량별 평균 백분위 집계), `getOrgBenchmark()`(기관 담당자용 — 다른 기관 이름은 노출하지 않고 익명 평균·순위만 반환), `getAllOrgBenchmarks()`(슈퍼어드민용 — 실명 전체 랭킹)
  - 완료율 정의: 학생별 `CompetencyProgress`(역량 6개) 중 `COMPLETED` 비율의 평균(%)
  - 프라이버시: 익명 평균(비교 평균)에는 학생 수 3명 이상인 기관만 포함 — 소규모 기관 한 곳이 평균으로 특정되는 것을 방지 (`MIN_PEER_MEMBERS`)
  - `/org/dashboard`에 "다른 학교와 비교" 카드 추가 — 전체 승인 기관 중 순위(상위 N%), 완료율/평균 백분위를 비교 평균과 나란히 표시, 역량별로는 우리 학교 막대 + 비교 평균 위치를 세로선으로 표시. 비교 가능한 기관이 없으면 안내 문구만 표시
  - `/admin/organizations/benchmark` 신규 페이지(슈퍼어드민 전용) — 승인된 기관 전체를 평균 백분위 내림차순으로 실명 랭킹 표시(학생 수·활동 학생 수·완료율·평균 백분위). `/admin/organizations`에 링크 추가
  - `components/layout/AppHeader.tsx`(전 페이지 공통 헤더)에 역할별 메뉴 추가 — `orgRole`이 STAFF/ADMIN이면 "코호트 대시보드"(`/org/dashboard`), `SUPERADMIN_EMAILS`에 등록된 계정이면 "기관 승인 관리"(`/admin/organizations`)와 "기관 비교"(`/admin/organizations/benchmark`) 링크가 상단 네비게이션에 표시됨(그전까지는 URL을 직접 입력해야만 접근 가능했음)
- **슈퍼어드민 전체 사용자·권한 관리** (스키마 변경 없음, 코드만 추가 — 마이그레이션 불필요): 기존에는 `orgRole`을 STAFF로 올리거나 한 기관에 담당자를 추가로 지정하는 화면이 전혀 없었음(가입 시 ADMIN/STUDENT 둘 중 하나로 고정)
  - `/admin/users` 신규 페이지(슈퍼어드민 전용) — 전체 사용자 목록(이름/이메일/현재 소속·역할), 이름·이메일 검색, 사용자별로 소속 기관과 역할(학생/담당자/기관 관리자)을 직접 변경
  - `PATCH /api/admin/users/[id]` 신규 — 소속 기관이 없으면 역할은 자동으로 "학생"으로 강제(담당자/관리자 역할은 소속 기관이 있어야만 의미가 있음)
  - `SUPERADMIN_EMAILS` 자체는 여전히 환경변수 — DB화하지 않기로 함(이번 스코프 아님)
  - `/admin/organizations`, 헤더 메뉴에 "전체 사용자 관리" 링크 추가
- **압박 강도 적응형 조절** (스키마 변경 없음, 코드만 추가 — 마이그레이션 불필요): ROADMAP의 "면접관 페르소나 3종"을 사용자가 고르는 정적 방식이 아니라, IRT가 이미 추정하고 있는 역량 레벨(`current_level`, 1~5)을 그대로 재사용해 자동으로 조절하는 방식으로 구현 — 브레인스토밍에서 나온 "독창적 아이디어" 중 첫 번째로 착수
  - `lib/interview/persona.ts` 신규 — `pressureTierFromLevel(level)`: 레벨 1~2 GENTLE(실무진·우호적), 3 NEUTRAL, 4~5 TOUGH(임원·압박)로 매핑. `applyPressureTone()`: 사전 정의된 문구 풀에서 골라 질문 앞에 붙임(추가 LLM 호출 없음, 세션 내 반복 방지용 seed 회전)
  - **채점은 절대 이 값의 영향을 받지 않는다** — 톤은 화면 표시용 텍스트에만 적용되고, 채점에 쓰이는 `personalizedQuestions[...].text` 캐시는 원문 그대로 유지. 규준참조 점수처럼 세션 간 비교 가능한 지표를 만들려면 채점 기준이 페르소나에 따라 흔들리면 안 되기 때문
  - `lib/interview/follow-up.ts` — `shouldTriggerFollowUp()`/`pickFollowUpQuestion()`에 tier 파라미터 추가: TOUGH는 문턱을 낮춰(점수<0.75 & 구체성<0.6) 더 쉽게 꼬리질문을 걸고 문구도 더 직설적으로, GENTLE은 반대로 너그럽게(점수<0.55 & 구체성<0.4)
  - 다음 문항의 압박 강도는 이번 답변까지 반영된 최신 추정 레벨(`irtResult.competency_states`) 기준으로 정함 — 잘 버티면 다음 질문은 더 깐깐하게, 흔들리면 더 부드럽게
  - `InterviewQuestion`에 `resumePersonalized` 필드를 명시적으로 추가해 "자소서 맞춤 질문" 배지 판단 기준을 텍스트 비교(`personalizedText !== text`)에서 이 값으로 교체 — 압박 톤 프리픽스나 꼬리질문 때문에 텍스트가 달라져도 배지가 잘못 뜨지 않도록 수정(기존에 꼬리질문에도 "자소서 맞춤 질문" 배지가 같이 뜨던 부수적 버그도 함께 해결됨)
  - `InterviewSession.tsx`에 GENTLE(🙂)/TOUGH(🔥) 배지 표시, NEUTRAL은 배지 미표시
- **경쟁사 벤치마킹 아이디어 3종 채택 구현** (스키마 변경 없음, 코드만 추가 — 마이그레이션 불필요): "실시간 압박 꼬리질문/멀티모달 감정분석/할루시네이션 탐지/JD 매핑/평판 예측/대안 답변 제시/기술면접" 등 외부 아이디어 검토 후, 우리 아키텍처·비용 원칙·차별화 포지셔닝(HireVue식 감정분석·근거없는 예측 점수는 명확히 반대)과 맞는 3가지만 선별 구현
  - **JD/인재상 매핑**: `interview/setup` 2번 섹션에 "채용공고(JD)·인재상 붙여넣기" 선택 입력(토글) 추가 → `jdText` 전송 → `lib/company/jd-mapper.ts`(신규) `deriveInterviewStyleFromJD()`가 세션 시작 시 1회만 Gemini 호출해 `{tone, rounds, focus}` 추출 → `TargetCompany.interviewStyle`에 저장(스키마 필드는 기존에 있었으나 지금까지 아무 곳에서도 읽지 않던 죽은 데이터였음 — 이번에 처음으로 실제 소비하도록 연결). 같은 플랜의 후속 역량 세션에서 JD를 다시 입력하지 않으면 이전 값을 유지(덮어쓰지 않음)
    - `lib/interview/personalize-question.ts`: `personalizeQuestion()`/`personalizeWithGemini()`에 `interviewStyle` 파라미터 추가, 첫 문항 개인화 프롬프트에 "면접 스타일: {tone} (중점 평가 역량: {focus})" 반영 — 질문 어투와 루브릭에 실제로 영향
    - `lib/interview/build-question.ts`: `session.targetCompany.interviewStyle`(Json)을 안전 파싱해 전달
  - **압박 꼬리질문 고도화(첫 문항만)**: `correctAndEvaluateAnswer()`(`lib/gemini/evaluate.ts`) 응답에 `suggestedFollowUp` 필드 추가 — 답변의 논리적 비약·구체성 부족을 근거로 LLM이 즉석 후속 질문을 제안(압박 강도 톤에 맞춰). 추가 API 호출 없이 기존 채점 호출에 얹음. `respond/route.ts`에서 역량당 첫 문항(`isFirstItem`)일 때만 이 제안을 쓰고, 2번째 이상 문항은 기존 무료 키워드 기반(`pickFollowUpQuestion`)을 그대로 사용 — 비용 원칙 유지
  - **자소서 일관성 체크(순화된 버전)**: 같은 응답에 `consistencyNote` 필드 추가 — 자소서와 명백히 모순되는 사실(기간·숫자·역할 등)이 있을 때만 부드러운 코칭 톤 1문장 생성("거짓말 탐지"가 아니라 정보 정리 제안으로 표현). **채점 점수에는 전혀 영향 없음** — `ChipEvent.briefFeedback`에만 덧붙여 표시
  - 반대로 명확히 채택 안 한 것: 멀티모달 감정/표정/음성 분석(HireVue가 편향 논란으로 폐지한 방식, COMMERCIAL.md의 특허·법무 리스크 회피 전략과 정면 충돌), 지원자 평판/퇴사확률 예측 점수(검증 데이터 없는 사이비 지표, EU AI Act류 고위험 채용 AI 규제 대상이 될 위험) — 근거는 대화 기록 참고
- **AI 꼬리질문(follow-up question)** (로컬 `prisma generate` / `migrate deploy` / `npm run build` 성공 확인됨 — git push는 진행 중이었는데 이후 대화에서 확인 안 됨, 안 하셨으면 아래 "진행 시 참고" 커밋 필요):
  - 답변 채점 시 `score < 0.65` 그리고 `dimensions.specificity < 0.5`이면 "추상적인 답변"으로 판단해 같은 문항 안에서 꼬리질문을 한 번 더 낸다 (`web/src/lib/interview/follow-up.ts`의 `shouldTriggerFollowUp`)
  - 꼬리질문 텍스트는 Gemini를 다시 호출하지 않고 `Question.followUpHints`(시딩된 주제 키워드) 중 아직 답변에서 다루지 않은 것을 템플릿에 꽂아 생성 — 추가 API 비용 없음
  - 꼬리질문 답변이 들어오면 원 답변 + 꼬리질문 답변을 함께 최종 평가(Gemini 1회 추가 호출)해 그 점수로 IRT 엔진에 제출 — 문항당 최대 1회만 꼬리질문 (꼬리질문 답변에는 다시 트리거하지 않음)
  - `ResponseRecord`에 `initialRubricScore`/`followUpQuestion`/`followUpTranscript`/`followUpCorrectedTranscript` 저장, `ChipEvent.hadFollowUp`으로 표시 — 세션 리포트/역량 피드백 생성 로직에는 아직 반영 안 함(추후 개선 후보)
  - 클라이언트 UI(`InterviewSession.tsx`)에 "꼬리질문" 배지 표시, 꼬리질문을 내는 턴에는 칩(레벨 통과/유지/하향 표시)을 추가하지 않고 최종 확정 시에만 표시
- **산업군+역량 기반 설정 + 실제 기출 질문 참고** (가장 최근 작업, 코드 작성 완료 — 아래 로컬 검증 단계 필요):
  - 벤치마킹 결과(국내 사람인/잡다, 해외 Big Interview/Google Interview Warmup 등) 특정 회사명 필수 입력보다 산업군+직무 축이 주류라 판단, `/interview/setup` 2번 섹션을 "지원 회사"(필수 텍스트) → "산업군"(필수 선택: IT/SW·금융·제조·공기업·기타) + 회사명(선택, 있으면 질문 문구에만 반영)으로 전환
  - `Organization`이 아니라 `TargetCompany`에 `industryCode`(`Industry` enum) 추가 — 기존 회사명 추측 휴리스틱(`enrichCompany`) 대신 `resolveCompanyContext()`가 산업군 프리셋(`lib/company/industry-presets.ts`)을 우선 사용, 단 삼성전자·카카오 등 기존 5개 유명 기업 프리셋은 이름이 정확히 일치하면 계속 우선 적용됨
  - **`RealInterviewQuestion` 신규 테이블** — IRT 채점 문항 뱅크와 별개로, 산업군×직무별 "실제 기출 질문 참고"만 보여주는 조회 전용 데이터. 공개 검색(잡코리아·링커리어·사람인·브런치 등)으로 수집한 질문 + 근거 부족한 조합은 `isAiExample=true`로 투명하게 표시한 AI 예시로 보강. 1차로 IT/SW·금융·제조·공기업 4개 산업군 × 각 3~4개 직무, 총 44문항 시드 (`seed/real-questions.json`, `prisma/seed-real-questions.ts`) — 로그인 필요한 블라인드·잡플래닛 등은 이용약관상 크롤링 제외
  - `/interview/setup`에서 산업군+직무를 고르면 `/api/interview/real-questions`로 참고 질문 6개까지 미리보기 (출처 표시)
  - 나중에 산업군·직무 확장 시: `prisma/schema.prisma`의 `Industry` enum에 값 추가 + 마이그레이션, `seed/real-questions.json`에 데이터만 추가하고 `npm run db:seed:real` 재실행하면 됨 (재실행해도 안전 — 조합 단위로 지우고 다시 넣음)
- **답변 처리 지연(랙) 개선** (스키마 변경 없음, 코드만 수정 — 마이그레이션 불필요):
  - `correctTranscript()`(STT 교정) + `evaluateAnswer()`(채점)를 순차 호출하던 것을 `correctAndEvaluateAnswer()` 한 번의 Gemini 호출로 합침 — 매 턴 왕복 1회 절감, 특히 꼬리질문이 트리거되는 턴(질문만 반환하고 바로 끝나는 짧은 턴)에서 체감 지연이 크게 줄어듦
  - `ResponseRecord`/`ChipEvent` 기록을 세션 상태 저장+다음 문항 개인화와 병렬로 처리(`Promise.all`)하도록 `respond/route.ts` 재구성 — 단, 세션 `irtState`에 대한 두 번의 쓰기 순서(명시적 업데이트 → `buildPersonalizedQuestion` 내부 업데이트)는 캐시 유실 방지를 위해 그대로 유지
  - 여전히 남아있는 지연 원인: (1) IRT 엔진(Render 무료 티어) 콜드스타트 30~60초 — 알려진 이슈, 유료 전환 전까진 근본 해결 어려움, (2) 다음 문항 자소서 맞춤화(Gemini) 자체가 여전히 매 문항 1회 호출됨 — 프리페치나 "일부 문항만 맞춤화" 같은 추가 개선은 논의 후 진행 예정
- **첫 문항만 자소서 맞춤화** (스키마 변경 없음, 코드만 수정 — 마이그레이션 불필요): 위 지연 개선 논의 후 "역량당 첫 문항만 자소서 인용, 나머지는 일반 질문" 방식 채택
  - `buildPersonalizedQuestion()`(`lib/interview/build-question.ts`)에 `options.skipPersonalization` 추가 — true면 Gemini 호출 없이 `question.template` 그대로 쓰고, 채점 루브릭은 일반 기준(`buildGenericRubric`, 새로 export)으로 캐싱
  - 판단 기준은 "이 문항이 해당 역량에서 몇 번째인가"이며, `stored.administeredIds.length === 0`(아직 답변한 문항 없음)일 때만 맞춤화, 그 외에는 스킵
    - `interview/[sessionId]/page.tsx`(세션 진입/새로고침 시 문항 렌더링): `administeredIds.length === 0`이면 맞춤화, 아니면(새로고침 등으로 2번째 이상 문항을 다시 그리는 경우) 스킵
    - `respond/route.ts`의 다음 문항 준비 블록: 이 시점엔 방금 답한 문항이 이미 `administeredIds`에 들어간 뒤라 항상 2번째 이상 문항 — 무조건 스킵
  - 효과: 역량당 문항 1회만 자소서 관련 Gemini 호출(질문 개인화) 발생 — 이전엔 문항마다 호출. 2번째 이후 문항은 일반 질문이라 답변 자체와 무관하게 즉시 표시 가능
- **자소서 없이도 모의 면접 가능** (스키마 변경 없음, 코드만 수정 — 마이그레이션 불필요): 자소서를 필수로 요구하던 하드 블록 두 곳 제거
  - `interview/setup/SetupForm.tsx`: 제출 전 `!resumeText.trim()` 시 alert로 막던 클라이언트 검증과 버튼 `disabled` 조건에서 제거, 섹션 제목을 "4. 자기소개서 (선택)"으로 변경, 안내 문구를 "없어도 일반 질문으로 면접을 진행할 수 있습니다"로 수정
  - `api/interview/start/route.ts`: 서버 400 에러 블록(`!resumeText?.trim()`) 제거. `Resume` 레코드는 `resumeText`가 있을 때만 생성/갱신하고, 없으면 `existingPlan.resume`(같은 플랜에 이전에 저장된 자소서가 있으면 재사용)을 쓰거나 그마저 없으면 `resume = null`로 진행 — `InterviewSession.resumeId`/`InterviewPlan.resumeId`는 원래 스키마상 nullable이라 문제 없음
  - 다운스트림(`build-question.ts`, `personalize-question.ts`, `respond/route.ts`)은 이미 `session.resume?.rawText` optional chaining + `personalizeQuestion()`의 "자소서 없으면 일반 질문 반환" 폴백이 있어 추가 수정 불필요 — 자소서 없는 세션은 모든 문항이 일반 질문으로 나감
- **설정 화면 정리** (스키마 변경 없음, 코드만 수정 — 마이그레이션 불필요): 위 자소서 선택 사항 전환 직후 UI 피드백 반영
  - "3. 지원 직무" 아래 실제 기출 질문 미리보기 목록(`/api/interview/real-questions` 호출 + 렌더링) 제거 — 불필요한 정보로 판단, 직무 선택 셀렉트박스만 남김. 백엔드 엔드포인트 자체는 그대로 둠(추후 재사용 가능)
  - "4. 자기소개서" 텍스트 영역이 파일에서 추출한 원문을 그대로 화면에 노출하던 것을 제거 — 업로드 시 "✓ 파일명 업로드됨" 확인 문구만 표시하고 추출된 본문은 화면에 그리지 않음(내부 상태 `fileResumeText`로만 보관해 제출에 사용). 직접 타이핑하고 싶을 때만 "파일 대신 텍스트로 직접 입력" 버튼으로 별도 `textarea`(`manualText`)를 펼칠 수 있음 — 제출 시 `manualText.trim() || fileResumeText` 우선순위로 전송
- **JD 업로드 UI 버그 수정 + Vercel 빌드 에러 수정**: JD/인재상 섹션이 붙여넣기 토글만 있고 실제 파일 업로드가 없던 문제를 자소서 섹션과 동일한 드롭존 UX(업로드 → "✓ 파일명 업로드됨", 파일 대신 직접 입력 토글)로 교체, `handleJdFile()` 추가(`/api/resume/parse` 재사용). 동시에 Vercel 빌드를 막던 `lib/company/jd-mapper.ts`의 타입 에러(`filter` 콜백이 `string`을 반환해 `boolean` 타입가드와 불일치) 수정
- **스와이프 카드 z-index 버그 수정**: "Save를 눌러도 다른 문제가 저장/녹음된다"는 리포트 — 카드 3장을 쌓아 보여줄 때(`absolute inset-0`) z-index를 명시하지 않아서, 실제 상호작용(드래그, 하단 Pass/Save 버튼)은 `deck[0]`(맨 앞 카드)에 묶여 있는데 화면에는 DOM 순서상 마지막 카드(`depth=2`, 원래 맨 뒤여야 함)가 위에 그려지고 있었음 — 즉 화면에 보이는 카드와 실제로 저장되는 카드가 서로 달랐던 것. `SwipeCard`에 `zIndex: 10 - depth`를 명시해서 depth가 낮을수록(앞 카드) 위에 그려지도록 수정
- **UI 톤 조정 — aptifit.co.kr 참고** (스키마 변경 없음): 사용자가 스크린샷으로 공유해준 aptifit.co.kr(서울대 기술지주 자회사 앱티마이저의 진로적성 서비스) 디자인을 참고해 색상 톤을 조정
  - `globals.css`: `--color-primary`를 더 채도 높은 선명한 블루(#2f5fee)로, `--color-accent`도 그쪽으로 살짝 이동. 페리윙클(연보라빛 블루) 전용 색 `--color-band`(#7c8cf5) 신규 추가 — aptifit의 "만족도 95%" 같은 전체 폭 강조 밴드 섹션용. 카드 모서리를 1rem→1.25rem으로 더 둥글게, 번호 원형 배지 유틸(`badge-step`) 추가(aptifit의 ❶❷❸ 스타일)
  - `page.tsx`(랜딩): 기능 카드 3개에 번호 배지 추가, 하단에 페리윙클 밴드 섹션 신규 추가 — 단, aptifit처럼 실명 후기를 넣는 대신(허위 후기 조작 방지) 실제 차별화 포인트(감정·표정 AI 미구현, 특허 리스크 회피, 페르소나 무관 채점)를 담음
  - Chrome 확장 연결이 안 돼서 직접 브라우징 대신 사용자가 첨부한 스크린샷을 보고 색상을 추출함
- **모바일 메뉴가 배경과 겹치는 버그 수정** (스키마 변경 없음): 우측 상단 햄버거 메뉴를 열면 드로어가 화면 전체가 아니라 헤더 높이 안에서만 뜨면서 배경 콘텐츠와 겹쳐 보이는 문제. 원인은 CSS 스펙상 `backdrop-filter`(헤더의 `backdrop-blur-md`)가 걸린 요소는 그 안의 `position: fixed` 자손들의 기준(containing block)이 스스로가 돼 버리는 것 — 드로어가 헤더 안에 있다 보니 뷰포트 기준이 아니라 헤더 높이 기준으로 "고정"돼 버렸음. `MobileNav.tsx`를 `createPortal`로 `document.body`에 직접 그리도록 고쳐서 헤더의 containing block 밖으로 빼냄. 열려 있는 동안 배경 스크롤도 잠금 처리 추가
- **스와이프 카드 "저장" = 답변 연습으로 연결** (스키마 변경 있음 — 로컬 `prisma migrate dev` 필요): "저장이 무슨 의미가 있냐, 고르면 바로 녹음해서 답변할 수 있어야 한다"는 피드백 반영 — 지금까지 Save는 그냥 북마크만 하고 끝이었음
  - `SwipeAction`에 `answerTranscript`/`answeredAt` 필드 추가. `POST /api/questions/swipe`가 `answerTranscript`를 같이 받으면 저장
  - `components/practice/AnswerPracticeModal.tsx`(신규) — Save를 누르면(스와이프든 버튼이든) 바로 이 모달이 뜨면서 `VoiceRecorder`(방금 중복 버그 고친 그 컴포넌트 재사용)로 답변을 녹음. **채점은 하지 않고 자체 STT 텍스트만 기록** — 모바일=짧은 반복 연습(Engagement), PC=심층 분석(Insight)이라는 이원화 전략 원칙을 그대로 따름(비용도 안 듦: 추가 Gemini 호출 없음)
  - "저장한 질문" 목록에서도 각 항목에 저장된 답변 미리보기 + "다시 답변 연습하기" 버튼 추가 — 나중에 다시 들어와서 반복 연습 가능
- **모바일 음성 인식 중복 버그 수정** (스키마 변경 없음, 코드만 수정): "녹음 버튼을 눌러 설명하면 같은 내용이 반복된다" 리포트 — 안드로이드 Chrome 등 모바일에서는 `SpeechRecognition.continuous=true`여도 몇 초 침묵하면 내부적으로 인식 세션이 조용히 끊겼다 재시작되는데, 기존 코드는 `onresult`가 올 때마다 `event.results` 전체를 처음부터 다시 이어붙이는 방식이라 재시작 시 이미 확정된 문장이 또 붙어 중복됨
  - `VoiceRecorder.tsx`: 확정된(`isFinal`) 문장을 `finalTranscriptRef`에 직접 누적하고, `event.resultIndex`부터만 처리하도록 변경. 재시작 직후 같은 문장이 다시 오면(`already.endsWith(piece)`) 건너뛰어 중복을 막음
  - 겸사겸사 `onend`에서 사용자가 정지 버튼을 안 눌렀는데(=모바일이 알아서 끊은 것) 자동으로 `recognition.start()` 재시작하도록 추가 — 그동안 누적된 텍스트는 유지됨. 사용자가 직접 정지 버튼을 누른 경우만 재시작 안 함(`manualStopRef`)
- **질문 카드 스와이프(모바일 습관형성 루프)** (스키마 변경 있음 — 로컬 `prisma migrate dev` 필요): 모바일/PC 이원화 전략 브레인스토밍에서 나온 "스와이프 카드 UI"를 첫 기능으로 구현. 핵심 요구사항은 "무작위가 아니라 본인이 결정한 직무 관련 카드"였음
  - `UserProfile.desiredIndustry`(신규 nullable 필드) + 기존에 있었지만 아무 데서도 안 쓰이던 `desiredJobRole`을 처음으로 실제 연결 — `PATCH /api/profile/preference`로 저장. `UserProfile` row 자체가 지금까지 한 번도 생성된 적 없던 죽은 테이블이었음(가입 시 생성 로직이 없었음)
  - `/practice/swipe`: 처음 진입하면(또는 아직 아무것도 안 골랐으면) 산업군+직무를 명시적으로 고르게 강제하고, 그 다음부터는 상단에 "{산업군}·{직무} 변경" 배지로 항상 보여줌 — 로그인할 때마다 랜덤이 아니라 본인이 정한 조합이 계속 유지됨
  - `SwipeAction` 신규 모델(`userId`+`questionId` 유니크, `PASS`/`SAVE`) — 카드를 넘긴 기록. `GET/POST /api/questions/swipe`
  - **콘텐츠 물량 이슈 발견**: `RealInterviewQuestion`은 총 45문항인데 산업군×직무 조합(16개)당 2~4개뿐이라, 정확히 고른 조합만 보여주면 몇 장 만에 바닥남. `GET /api/questions/swipe-deck`에서 우선순위를 낮춰가며 채우는 폴백을 넣음(①정확한 조합 → ②같은 산업군 → ③같은 직무 → ④전체), 그래도 다 봤으면 같은 조합을 재열람(`recycled: true`)으로 표시. 조합당 5개 미만이면 화면에 "관련 산업군·직무 질문도 섞어서 보여드려요" 안내 표시. **다만 습관형성 루프로서의 진짜 가치는 카드 절대량에 달려있어서, `seed/real-questions.json` 물량을 늘리는 게 자연스러운 다음 스텝**
  - `components/practice/SwipeDeck.tsx` — 이미 의존성에 있던 `framer-motion`으로 드래그 스와이프 구현(추가 라이브러리 설치 없음), 왼쪽 Pass/오른쪽 Save + 하단 버튼(터치 제스처 없는 환경 대비), "저장한 질문" 목록 패널
  - 헤더 네비게이션에 "질문 카드" 링크 추가(`/practice/swipe`)
- **UI 리뉴얼 — 코발트 블루 테마 + 모바일 대응 + 스톡 사진**: "더 세련되고 모바일에서도 잘 보이면 좋겠다"는 요청으로 전체 색상 톤과 랜딩/로그인 화면을 손봄
  - `globals.css`: 기존 크림·네이비·골드 톤에서 `--color-primary`/`--color-primary-light`/`--color-accent`/`--color-background`/`--color-card-border`를 코발트 블루 계열로 교체(`--color-gold`는 보조 프리미엄 포인트 색으로 유지, 톤만 코발트와 어울리게 미세 조정). 클래스명(`text-gold`, `card-luxe` 등)은 그대로라 13개 파일의 기존 사용처를 건드리지 않고 전체 배색만 바뀜
  - `components/layout/AppHeader.tsx` + `MobileNav.tsx`(신규): 로그인 시 메뉴가 7개까지 늘어나는데 모바일 대응(햄버거/드로어 메뉴)이 전혀 없었던 문제 발견 — `sm:` 이상에서는 기존 가로 네비게이션, 그 이하에서는 우측 슬라이드 드로어 메뉴로 전환. 헤더에 `sticky top-0` 추가
  - 랜딩 페이지(`app/page.tsx`)에 히어로 사진 추가 — 무료 스톡 사진(Unsplash, 상업적 이용 무료/저작자 표시 불필요)을 코발트 그라데이션 오버레이와 함께 배치, 모바일에서는 텍스트 아래로 쌓이고 데스크톱에서는 2단 레이아웃
  - 로그인/회원가입(`components/auth/AuthLayout.tsx` 신규): 데스크톱에서만 좌측에 인물 사진 패널 표시(모바일은 폼만 표시해 스크롤 최소화)
  - `next.config.ts`에 `images.remotePatterns`로 `images.unsplash.com` 허용 추가 (Next.js Image Optimization 사용을 위해 필요)
  - 사용한 사진은 모두 Unsplash 자체 공개 API(napi)로 실존 여부와 무료(비-프리미엄) 라이선스를 확인 후 선정함
- **지원자 페르소나(롤모델) 시스템** (스키마 변경 있음 — 로컬 `prisma migrate dev` 필요): "산업+직무를 종합해서 어떤 롤모델처럼 보이고 싶은지 정하는 재미"를 넣어달라는 상세 설계 요청 반영. 채점에는 절대 영향 없음(기존 압박 톤 원칙과 동일)
  - `lib/interview/persona-archetype.ts`(신규) — 산업군별/직무별 특성 태그 사전(`INDUSTRY_TRAITS`/`JOBROLE_TRAITS`)을 각각 아키타입과 겹치는 정도로 채점해(직무 2배 가중치, 산업 1배) 매칭하는 순수 함수 `matchPersona(industry, jobRole)`, 큐레이션한 8개 페르소나 원형(`PERSONA_ARCHETYPES`, 예: "원칙있는 문제해결사", "데이터로 말하는 전략가" 등). LLM 호출 없음(추가 비용 0) — 트리 구조 대신 태그 겹침으로 "유사성" 아이디어 구현. 공공기관+개발 조합 → "원칙있는 문제해결사"(사용자 예시와 일치) 확인함
    - **[수정 2026-07-06]** 처음엔 산업+직무 태그를 그냥 합쳐서 단순 교집합으로 채점했는데, 국내 채용/모의면접 서비스 벤치마킹(사람인·원티드는 채용공고=직무를 1차 축으로 쓰고 산업은 자동 추출만 함, NCS/블라인드채용은 오히려 전공 배제·직무기술서 중심, 코멘토 직무부트캠프는 산업×직무 병행) 결과 "직무가 1차 축, 산업은 보조 신호"가 업계 표준이라 확인. 실제 검증 스크립트로 돌려보니 IT_SW·MANUFACTURING 산업군은 태그 5개가 특정 아키타입과 100% 일치해 직무를 뭘 골라도 늘 같은 페르소나만 나오는 버그가 있었음(사용자가 "산업군에만 반영되는 것 같다"고 정확히 지적한 부분) — 직무 겹침 점수에 2배 가중치를 줘서 직무 선택이 항상 결과에 반영되도록 수정
  - `TargetCompany.persona`(Json, 신규) — `api/interview/start/route.ts`에서 산업군+직무 확정 시 `matchPersona()` 결과를 저장
  - `interview/setup/SetupForm.tsx` — 산업/직무를 고르는 즉시 클라이언트에서 `matchPersona()`로 페르소나 이름·설명을 계산해 "당신의 페르소나는 OOO입니다" 리빌 카드를 보여줌(요청하신 "재미" 요소, 네트워크 호출 없이 즉시 표시)
  - `interview/[sessionId]/page.tsx` — 면접 진행 중 화면 상단에 페르소나 배지(🎭)를 계속 표시(면접 끝날 때까지 배지로 계속 보여달라는 요청 반영)
  - `CompetencyFeedback.personaAlignmentNote`(String?, 신규) — 역량 리포트에 "이 페르소나답게 답변했는가" 1문장 코칭 추가. **새 API 호출을 만들지 않고** 기존 역량 피드백 생성 호출(`lib/claude/competency-feedback.ts`, DeepSeek)의 프롬프트/스키마에 얹어서 같이 받아옴 — 비용 증가 없음. API 키 미설정 시 폴백(`mockCompetencyFeedback`)에서는 페르소나 이름을 넣은 결정론적 템플릿 문구로 대체. 프롬프트에 "이 코칭은 점수에 전혀 영향을 주지 않는다"를 명시해 채점 로직과 완전히 분리
  - `interview/plan/[planId]/competency/[code]/feedback/page.tsx` — 페르소나 코칭 문구가 있으면 "🎭 페르소나답게 답변했나요?" 섹션으로 표시(참고용이며 점수 무관이라는 안내 문구 포함)
- **스와이프 카드 z-index 버그 재확인**: 이전에 이미 수정 완료된 건으로, 이번 요청에서 다시 리포트된 것과 동일한 증상이라 기존 수정(`zIndex: 10 - depth`)이 적용돼 있는지 재확인함 — 코드상 정상 반영되어 있음
- **역량 선택 화면 — 산업/직무 우선 재배치 + 추천 배지** (스키마 변경 없음): "역량은 직접 고르는 게 맞나, 아니면 직무가 역량을 자동으로 정해야 하나"라는 질문에 대한 벤치마킹 반영. NCS "직업기초능력"(우리 6개 역량)은 정의상 모든 직무 공통이라 직무가 역량 선택 자체를 제한하면 안 되지만, 실제 채용에서는 직무별로 중점적으로 보는 역량이 다르다는 점(마케팅=소통·데이터분석, 영업=신뢰관계·설득력 등)도 확인 — 그래서 "자유 선택 + 추천"으로 절충
  - `interview/setup/SetupForm.tsx` 섹션 순서를 "1.역량선택→2.산업군→3.직무"에서 "1.산업군→2.직무→(페르소나 리빌)→3.역량선택→4.자기소개서"로 재배치 — 역량을 고를 시점에 이미 직무 정보가 있어야 추천이 가능하므로
  - 각 페르소나 아키타입에 이미 정의돼 있었지만 지금까지 어디서도 안 쓰이던 `focusCompetencies` 필드(예: "원칙있는 문제해결사"→PROBLEM_SOLVING·ORG_FIT)를 처음으로 연결 — 역량 카드에 "⭐ 추천" 배지 표시 + 아직 완료 안 한 역량 중 첫 번째를 기본 선택값으로 자동 지정
  - 단, 역량 선택 자체를 막지는 않음(직업기초능력은 직무 무관 공통 평가 대상이라는 NCS 원칙 유지) — 사용자가 역량 카드를 직접 클릭하거나 `?competency=` 파라미터로 들어오면(`competencyManuallyChanged` ref) 이후 추천 로직이 덮어쓰지 않음
- **랜딩 페이지 구성 보강 — unchartedcareer.com 벤치마킹** (스키마 변경 없음, `app/page.tsx`만 수정): "저 사이트처럼 멋지게"라는 요청 반영. 다만 원본은 진한 다크 테마 + 로그인 전 체험 데모 위젯이라 사용자와 상의해 **코발트 톤은 유지하고 레이아웃 구성만 참고**하는 방향으로 확정(가짜 고객 로고·후기는 넣지 않음 — 이전에도 aptifit 참고 때 같은 원칙 적용한 바 있음)
  - "이용 방법" 3단계 번호 섹션 신규 추가(산업·직무 선택 → 역량 선택 → 음성 답변·리포트) — `badge-step` 재사용
  - "역량 6개, 전부 다뤄요" 그리드 신규 추가 — unchartedcareer의 "Every interview type covered" 그리드를 참고했지만 내용은 지어내지 않고 우리 실제 6개 역량(`COMPETENCY_CODES`)과 설명을 그대로 사용
  - FAQ 아코디언 신규 추가(`<details>/<summary>` 네이티브 엘리먼트, 별도 JS 없음) — "감정 분석 하나요", "무료인가요", "개인정보는요" 등 실제로 자주 나올 질문 위주
  - 하단 최종 CTA 밴드 섹션 신규 추가
  - 신뢰 로고 스트립·유료 요금제·고객 후기는 의도적으로 넣지 않음 — 실제 유료 플랜이 없고, 가짜 후기/로고를 넣으면 허위 사회적 증거가 되기 때문
- **홈페이지 / 데모 페이지 분리** (스키마 변경 없음): unchartedcareer.com이 "메인 홈페이지(전체 플랫폼 소개)"와 "/ai-interview-practice(면접 기능 전용 데모 랜딩)"를 분리해둔 구조를 참고 — 우리도 루트(`/`)와 `/demo`를 분리
  - `app/demo/page.tsx`(신규) — 기존에 루트에 있던 면접 중심 랜딩(히어로+3기능카드+이용방법 3단계+역량 6개 그리드+FAQ+CTA)을 그대로 이전. `/`로 돌아가는 링크 추가
  - `app/page.tsx`(전면 재작성) — 이제 플랫폼 전체를 소개하는 홈페이지: 미션형 히어로("채용 AI 시대, 정직하게 준비하는 면접") → "하나의 플랫폼" 툴킷 그리드 6개(모의면접·역량 트래킹·자소서/JD 맞춤·페르소나·스와이프 연습·대학 코호트 대시보드, 전부 실제 구현된 기능만 나열) → "왜 AXHRD인가" 차별화 밴드(데모 페이지에서 이쪽으로 단일화, 중복 제거) → 플랫폼 단위 FAQ(경쟁사 대비 차별점, 대학/기관 도입 방법 등 추가) → 마지막 CTA. 히어로 사진은 데모 페이지와 다른 것(AuthLayout에서 이미 쓰던 `photo-1573497620053-ea5300f94f21`, 검증됨)을 써서 두 페이지가 시각적으로 구분되게 함
  - 홈페이지의 모든 주요 CTA는 "데모 체험하기"(`/demo`)를 1순위 버튼으로, "무료로 시작하기"(`/auth/register`)를 보조 버튼으로 배치 — "여기서 데모로 가게 해달라"는 요청 반영
  - `AppHeader.tsx`의 로고 링크는 그대로 `/`를 가리키므로 별도 수정 불필요
- **홈/데모 페이지 시각적 차별화 + 수상작급 디자인 트렌드 반영**: "홈페이지와 데모페이지가 너무 비슷하다, 더 세련되게" 요청 — 2026년 Awwwards/SaaS 랜딩 트렌드(벤토 그리드 채택 시 체류시간 47%·클릭률 38% 상승, 오버사이즈 에디토리얼 타이포그래피, 스크롤 등장 모션, "절제된 미니멀") 검색해 반영. 색상 톤(코발트)은 그대로 유지하고 구조·타이포·모션만 강화
  - `components/ui/Reveal.tsx`(신규) — `framer-motion`(기존 의존성, 스와이프 카드에서 이미 사용 중) 기반 스크롤 등장 애니메이션 클라이언트 래퍼. 서버 컴포넌트인 페이지들이 감싸서 쓸 수 있게 분리
  - `globals.css`에 `.mesh-bg`(그라디언트 메시 + 옅은 그리드 라인, 홈페이지 히어로 전용 — 사진 대신 사용해 데모 페이지와 구분), `.window-chrome`(브라우저 창 목업 바, 데모 페이지 전용) 추가
  - **홈페이지**: 사진 제거하고 오버사이즈(최대 7xl) 그라디언트 타이포 히어로 + `.mesh-bg` 배경 + 하단 플로팅 태그 칩(IRT 적응형 난이도 등)으로 교체. "하나의 플랫폼" 섹션은 6개 카드를 벤토 그리드(2x2 큰 카드 1개 + 1x1 작은 카드 4개 + 2x1 넓은 카드 1개)로 재배치. 전 섹션에 `Reveal`로 스크롤 등장 모션 적용
  - **데모 페이지**: 기존 3개 동일 크기 기능카드 섹션 제거(홈의 벤토 그리드와 중복이라 삭제), 히어로 사진은 `.window-chrome`(●●● 탭 버튼 + 가짜 주소창 "app.axhrd.com/interview")으로 감싸 실제 제품 스크린샷처럼 보이게 함. "이용 방법" 3단계를 카드 3개 나열 대신 세로 타임라인(연결선 + 번호 배지)으로, 역량 6개 그리드를 카드 대신 알약(pill) 칩 나열로 교체해 홈페이지와 톤이 겹치지 않게 함
  - 참고: [SaaS landing page trends 2026 (bento grid stats)](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples), [Awwwards bento inspiration](https://www.awwwards.com/inspiration/bento-linearity), [2026 typography/motion trends](https://www.moburst.com/blog/landing-page-design-trends-2026/)

## 알려진 이슈 / 트레이드오프

- **[해결됨 2026-07-05] Vercel 빌드가 스키마 변경 후 실패하는 문제**: Vercel이 이전 빌드의 `node_modules` 캐시를 재사용하면 `@prisma/client`의 postinstall(`prisma generate`)이 다시 실행되지 않아, `schema.prisma`에 새로 추가한 모델/필드가 타입에 반영되지 않은 채로 빌드됨 → `next build` 타입체크 단계에서 "Property 'xxx' does not exist" 에러로 실패. `web/package.json`의 `build` 스크립트를 `"prisma generate && next build"`로 고쳐서 캐시 여부와 무관하게 항상 최신 스키마로 재생성하도록 해결. **앞으로 스키마를 바꾼 커밋을 배포할 때 Vercel 빌드가 실패하면 이 문제부터 의심할 것.**
- **TTS 응답 속도**: MiniMax→Gemini 전환 후 질문 음성 합성이 느려짐. "합성 중/재생 중" 상태 구분으로 체감은 개선했으나 근본 해결은 아님. 사용자 테스트 후 벤더 재검토 필요할 수 있음.
- **Render 무료 티어 콜드스타트**: IRT 엔진이 15분 미사용 시 슬립, 재요청 시 30~60초 지연.
- 이 개발 환경(Cowork 샌드박스)의 `.git` 등 일부 파일을 마운트된 드라이브에서 직접 읽으면 간헐적으로 깨진 값이 나오는 현상이 있음 — 코드 수정은 문제없이 되지만, 로컬 `npm run build`/`prisma migrate` 등 컴파일·DB 관련 검증은 항상 박사님 본인 PC 터미널에서 최종 확인 필요.
- **[미해결] 운영 DB에 IRT 문항 시드가 없는 것으로 추정됨**: 운영 사이트에서 모든 역량 선택 시 "해당 역량 문항이 없습니다" 에러 발생 확인(2026-07-05). `docs/DEPLOY.md`에 로컬 DB 세팅용 시드 단계는 있지만 운영 Supabase에 시드를 넣는 절차가 없었음. Supabase Table Editor에서 `Question` 테이블 행 수 확인 후, 없다면 운영 DB 환경변수(`DATABASE_URL`/`DIRECT_URL`)를 세팅한 채로 `npm run db:seed` 실행 필요 (upsert라 안전).

## 다음 후보 아이디어 (우선순위 논의됨, 아직 미착수)

1. 답변 대기 중 다음 문항 백그라운드 프리페치 — 체감 속도 개선
2. PDF 리포트/인증서 다운로드 — 취업센터 상담 현장에서 실물 문서 선호
3. 부정행위 방지 최소 장치 — 답변창 붙여넣기 감지, 탭 전환 감지
4. (꼬리질문 후속) 세션 리포트/역량 피드백에 꼬리질문 발생 여부·개선 정도 반영

## 진행 시 참고

- git 커밋/푸시, `prisma migrate`, `npm run build`는 전부 박사님 로컬 PC 터미널(PowerShell)에서 실행 — 이 샌드박스 환경에서는 안 되는 경우가 있었음
- 로컬 명령어는 항상 `D:\HR_IN_Solution\web` 폴더에서 실행 (단, git 명령어만 루트 `D:\HR_IN_Solution`에서)
- 배포 상세 절차는 `docs/DEPLOY.md` 참고
- Windows PowerShell에서 `npx ...`가 실행 정책 오류(PSSecurityException)로 막히면 `npx.cmd ...`로 실행 (docs/DEPLOY.md에도 반영됨)

### 로컬 PC에서 확인해야 할 일 (산업군+역량 선택 / 실제 기출 질문 DB)

새 마이그레이션 파일: `prisma/migrations/20260705110000_add_industry_and_real_questions/`
(TargetCompany에 컬럼 추가 + RealInterviewQuestion 신규 테이블 — 기존 데이터 영향 없음)

```powershell
cd D:\HR_IN_Solution\web
npx.cmd prisma generate
$env:DATABASE_URL="<Supabase Transaction pooler 연결 문자열>"
$env:DIRECT_URL="<Supabase Session pooler 연결 문자열>"
npx.cmd prisma migrate deploy
npm run db:seed:real
npm run build
```

`npm run db:seed:real`이 실제 기출 질문 참고 DB(44문항)를 운영 DB에 넣습니다.
(혹시 운영 DB에 `Question`/`Competency` 시드가 아직 없다면 위 "알려진 이슈"에
적어둔 대로 `npm run db:seed`도 같이 실행해 주세요 — 완전히 별개의 테이블입니다.)

빌드 통과 후 git 커밋/푸시 → Vercel 재배포되면 `/interview/setup`에서 산업군
선택(회사명은 선택 입력으로 바뀜) → 직무 선택 시 실제 기출 질문 참고 목록이
뜨는지 확인해 주세요.

### AI 꼬리질문 로컬 검증 (이전 세션, 완료 확인됨)

`prisma/migrations/20260705100000_add_follow_up_question/` — generate/migrate deploy/build
모두 성공 확인. 실제 면접에서 짧고 막연한 답변으로 꼬리질문이 뜨는지 테스트는 아직
안 하셨다면 한 세션 해보시는 걸 권합니다 (임계값은 `web/src/lib/interview/follow-up.ts`
상단 상수에서 조정 가능).

# 현재 상태 (2026-07-05 기준)

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

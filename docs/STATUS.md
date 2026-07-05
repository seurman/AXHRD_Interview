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
- **AI 꼬리질문(follow-up question)** (가장 최근 작업, 코드는 작성됐으나 아래 로컬 검증 단계 필요):
  - 답변 채점 시 `score < 0.65` 그리고 `dimensions.specificity < 0.5`이면 "추상적인 답변"으로 판단해 같은 문항 안에서 꼬리질문을 한 번 더 낸다 (`web/src/lib/interview/follow-up.ts`의 `shouldTriggerFollowUp`)
  - 꼬리질문 텍스트는 Gemini를 다시 호출하지 않고 `Question.followUpHints`(시딩된 주제 키워드) 중 아직 답변에서 다루지 않은 것을 템플릿에 꽂아 생성 — 추가 API 비용 없음
  - 꼬리질문 답변이 들어오면 원 답변 + 꼬리질문 답변을 함께 최종 평가(Gemini 1회 추가 호출)해 그 점수로 IRT 엔진에 제출 — 문항당 최대 1회만 꼬리질문 (꼬리질문 답변에는 다시 트리거하지 않음)
  - `ResponseRecord`에 `initialRubricScore`/`followUpQuestion`/`followUpTranscript`/`followUpCorrectedTranscript` 저장, `ChipEvent.hadFollowUp`으로 표시 — 세션 리포트/역량 피드백 생성 로직에는 아직 반영 안 함(추후 개선 후보)
  - 클라이언트 UI(`InterviewSession.tsx`)에 "꼬리질문" 배지 표시, 꼬리질문을 내는 턴에는 칩(레벨 통과/유지/하향 표시)을 추가하지 않고 최종 확정 시에만 표시

## 알려진 이슈 / 트레이드오프

- **TTS 응답 속도**: MiniMax→Gemini 전환 후 질문 음성 합성이 느려짐. "합성 중/재생 중" 상태 구분으로 체감은 개선했으나 근본 해결은 아님. 사용자 테스트 후 벤더 재검토 필요할 수 있음.
- **Render 무료 티어 콜드스타트**: IRT 엔진이 15분 미사용 시 슬립, 재요청 시 30~60초 지연.
- 이 개발 환경(Cowork 샌드박스)의 `.git` 등 일부 파일을 마운트된 드라이브에서 직접 읽으면 간헐적으로 깨진 값이 나오는 현상이 있음 — 코드 수정은 문제없이 되지만, 로컬 `npm run build`/`prisma migrate` 등 컴파일·DB 관련 검증은 항상 박사님 본인 PC 터미널에서 최종 확인 필요.

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

### 이번 세션에서 로컬 PC에서 확인해야 할 일 (AI 꼬리질문 적용)

새 마이그레이션 파일: `prisma/migrations/20260705100000_add_follow_up_question/`
(ResponseRecord/ChipEvent에 컬럼만 추가 — 데이터 백필 불필요, 배포해도 기존 데이터 영향 없음)

```powershell
cd D:\HR_IN_Solution\web
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm run build
```

빌드 통과하면 실제 면접 흐름에서 일부러 짧고 막연한 답변("네 열심히 했습니다" 등)을
해봐서 꼬리질문이 뜨는지, 꼬리질문 답변 후 정상적으로 다음 문항으로 넘어가는지
한 세션 정도 직접 확인해 보시는 걸 권합니다 (임계값은 `web/src/lib/interview/follow-up.ts`
상단 상수에서 조정 가능).

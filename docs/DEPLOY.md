# 배포 가이드 (무료 데모 단계)

목표: `app.axhrd.com`에서 실제 서비스가 돌아가고, `www.axhrd.com` / `axhrd.com`은
`app.axhrd.com`으로 리다이렉트되도록 구성합니다. 전부 무료 티어로 시작하고,
실제 사업이 시작되면 유료 플랜으로 업그레이드합니다.

구성:
- Next.js 웹앱 → **Vercel** (Hobby, 무료)
- FastAPI IRT 엔진 → **Render** (Free Web Service)
- PostgreSQL → **Supabase** (Free tier)

> 주의: Vercel Hobby 플랜은 약관상 비상업적 용도로 한정됩니다. 결제 기능을
> 붙이거나 실제 매출이 발생하는 시점에는 Pro 플랜(월 $20)으로 전환해야 합니다.

---

## 0. 사전 준비

- GitHub 저장소: `https://github.com/seurman/AXHRD_Interview` (이미 push 완료)
- 도메인: `axhrd.com` (가비아/후이즈 등록)
- 아래 계정을 각각 이메일로 무료 가입: [Supabase](https://supabase.com),
  [Render](https://render.com), [Vercel](https://vercel.com)

---

## 1. Supabase — PostgreSQL 생성

1. Supabase 대시보드 → New Project 생성 (Region은 **Northeast Asia (Seoul)** 선택
   — 한국 사용자 대상이므로 지연시간이 가장 짧은 리전)
2. 프로젝트 생성 후 상단 **"Connect"** 버튼 → **"ORM"** 탭 → **Prisma** 선택.
   두 개의 연결 문자열을 사용합니다:
   - Transaction pooler (포트 6543) → `DATABASE_URL`
   - **Session pooler** (포트 5432, "IPv4 compatible"로 표시됨) → `DIRECT_URL`

   ⚠️ "Direct connection"(순수 direct, IPv6 전용)이 아니라 **Session pooler**를
   `DIRECT_URL`에 넣어야 합니다. Supabase의 순수 Direct connection은 기본
   IPv6 전용이라 대부분의 로컬 PC·Vercel 같은 IPv4 환경에서는 연결이 안 됩니다
   (유료 IPv4 애드온을 사면 되지만 필요 없습니다). Session pooler는 IPv4를
   지원하면서 Prisma migrate에 필요한 지속 연결도 지원합니다.

   둘 다 복사해서 `[YOUR-PASSWORD]` 부분을 프로젝트 생성 시 설정한 비밀번호로
   바꿔 메모해둡니다. (`schema.prisma`에 이미 `directUrl` 설정을 반영해뒀습니다.)
3. 이 두 값을 나중에 Vercel 환경변수에 각각 `DATABASE_URL`, `DIRECT_URL`로
   넣습니다.
4. 로컬에서 프로덕션 DB에 스키마 반영:
   ```powershell
   cd D:\HR_IN_Solution\web
   $env:DATABASE_URL="<Transaction pooler 연결 문자열>"
   $env:DIRECT_URL="<Direct connection 연결 문자열>"
   npx.cmd prisma migrate deploy
   ```

---

## 2. Render — IRT 엔진 배포

1. Render 대시보드 → New → Web Service → GitHub 저장소 연결
2. Root Directory: `services/irt-engine`
3. Runtime: Docker (이미 `Dockerfile`과 `render.yaml`이 준비되어 있어
   자동으로 인식됩니다)
4. Instance Type: Free
5. 배포 완료 후 발급되는 URL을 확인합니다 (예: `https://axhrd-irt-engine.onrender.com`)
   — 이 값을 Vercel의 `IRT_ENGINE_URL` 환경변수에 넣습니다.

무료 티어는 15분 미사용 시 슬립 상태로 들어가 첫 요청이 30~60초 걸릴 수
있습니다. 데모 트래픽이 적을 때는 이 정도는 감수하고, 실제 서비스 전환 시
유료 플랜(Always-on)으로 옮기면 해결됩니다.

---

## 3. Vercel — Next.js 앱 배포

1. Vercel 대시보드 → Add New → Project → GitHub 저장소 import
2. Root Directory: `web`
3. Framework Preset: Next.js (자동 인식)
4. Environment Variables — `web/.env.example`을 참고해 아래 값을 전부 등록:
   - `DATABASE_URL` (1단계 Transaction pooler 연결 문자열)
   - `DIRECT_URL` (1단계 Direct connection 연결 문자열)
   - `IRT_ENGINE_URL` (2단계에서 받은 Render URL)
   - `GEMINI_API_KEY`
   - `GEMINI_LITE_MODEL` = `gemini-flash-lite-latest` (STT 교정·테마 등 고빈도)
   - `GEMINI_STANDARD_MODEL` = `gemini-flash-latest` (자소서 enrich·JD)
   - `GEMINI_PRO_MODEL` = `gemini-pro-latest` (첨삭·자소서 기반 문항·답변 피드백)
   - (호환) `GEMINI_TEXT_MODEL`, `GEMINI_RESUME_REVIEW_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`
   - 티어 비율 원칙: Lite≈고빈도 다수 / Standard≈중간 / Pro≈체감 품질 핵심(문항·피드백·첨삭)
   - `NEXTAUTH_SECRET` → 아래 값 사용 (프로덕션 전용으로 새로 생성한 값):
     ```
     4442890974814cc1dd3c2f9c1be7c6c38f12ae6300ae7fd8b63d8af0b4e9c3e4
     ```
   - `NEXTAUTH_URL` = `https://app.axhrd.com`
   - `NEXT_PUBLIC_APP_URL` = `https://app.axhrd.com`
   - `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` (기존 값 그대로)
   - `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` (사용 시)
   - `NEO4J_ENABLED` = `false` (Neo4j 미배포 시)
5. Deploy 클릭

---

## 4. 도메인 연결 — `app.axhrd.com` / `www` / apex 리다이렉트

Vercel 프로젝트 → Settings → Domains 에서:

1. `app.axhrd.com` 추가 → Vercel이 안내하는 **CNAME 레코드**를 가비아/후이즈
   DNS 관리 화면에 등록:
   ```
   유형: CNAME
   호스트: app
   값: cname.vercel-dns.com
   ```
2. `www.axhrd.com` 추가 → Vercel 도메인 설정에서 "Redirect to another domain"
   체크 후 대상으로 `app.axhrd.com` 지정. DNS에는:
   ```
   유형: CNAME
   호스트: www
   값: cname.vercel-dns.com
   ```
3. apex 도메인 `axhrd.com` 도 동일하게 추가 후 `app.axhrd.com`으로 리다이렉트
   설정. DNS에는 (가비아는 apex에 CNAME이 안 되면 A 레코드 사용):
   ```
   유형: A
   호스트: @
   값: 76.76.21.21   (Vercel이 화면에서 알려주는 값 사용 — 바뀔 수 있음)
   ```

DNS 전파는 보통 수 분~1시간 내 완료됩니다. Vercel 대시보드에서 도메인 상태가
"Valid Configuration"으로 바뀌면 완료입니다.

---

## 5. 소셜 로그인 Redirect URI 업데이트

카카오/네이버 개발자 콘솔에 로그인해 아래 콜백 URL을 **운영 도메인용으로
추가** (기존 localhost용은 유지해도 무방):

```
https://app.axhrd.com/api/auth/oauth/kakao/callback
https://app.axhrd.com/api/auth/oauth/naver/callback
```

이 단계를 빼먹으면 프로덕션에서 소셜 로그인 시 `redirect_uri mismatch`
오류가 납니다.

---

## 6. 최종 확인 체크리스트

- [ ] `https://app.axhrd.com` 접속 시 랜딩 페이지 정상 표시
- [ ] `https://www.axhrd.com`, `https://axhrd.com` 접속 시 `app.axhrd.com`으로
      리다이렉트
- [ ] 회원가입/로그인 (이메일 + 카카오) 정상 동작
- [ ] 면접 시작 → 질문 생성 → 음성 답변 → 채점까지 한 세션 정상 완료
- [ ] `/profile/certificate` 및 `/c/[slug]` 공유 링크 정상 표시

---

## 7. 나중에 유료 전환 시

- Vercel: Hobby → Pro ($20/월/멤버)
- Render: Free → Starter ($7/월, 슬립 없음)
- Supabase: Free → Pro ($25/월, 저장공간·백업 확대)

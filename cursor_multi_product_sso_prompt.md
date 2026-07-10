# 제품 간 SSO(서브도메인 공유 세션) 인프라 — 커서용 스크립트

## 방향 요약

배포 구조: **앱은 하나(현재 `web/`), 도메인만 제품별로 분리** —
`interview.axhrd.com`(면접솔루션) / `ac.axhrd.com`(역량솔루션, 아직 미구현) /
`diagnosis.axhrd.com`(진단솔루션, 아직 미구현 — 신규 인적성/성향검사류). 루트
`axhrd.com`은 제품 허브.

현재 인증은 `lib/auth/session.ts`의 자체 JWT httpOnly 쿠키(`hr_in_session`,
`jose` 라이브러리) 하나뿐이고 `domain` 옵션이 없어서 지금은 `path: "/"`라도
**정확히 그 호스트에서만** 유효함. 앱이 하나인 채로 여러 서브도메인에서
서빙되므로, **진짜 OAuth2/OIDC 같은 별도 인증 서버·토큰 교환 프로토콜은 필요
없고, 쿠키 도메인을 `.axhrd.com`으로 넓히는 것만으로 3개 제품 간 로그인
공유가 끝난다.** API 호출도 각 서브도메인 입장에서 여전히 same-origin이라
CORS 작업도 불필요.

역량솔루션·진단솔루션은 제품 자체가 아직 없으므로, 이번 배치는 **인프라만**
준비한다 — 실제 서브도메인 3개를 다 연결하는 DNS/Vercel 작업은 각 제품이
실제로 배포 가능해졌을 때.

**참고 — 범위 밖 항목**: 나중에 B2B 기관 고객이 자체 SAML/OIDC IdP로 로그인하고
싶다고 하면 그건 "외부 신원공급자 연동"이라는 완전히 다른 문제라 이번 스크립트
범위가 아님. 헷갈리지 말 것.

## 1. 쿠키 도메인 확장 — 핵심 변경

`lib/auth/session.ts`:
```ts
const cookieDomain =
  process.env.NODE_ENV === "production" ? ".axhrd.com" : undefined;

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, domain: cookieDomain, path: "/" });
}
```

**중요**: `clearSessionCookie`도 반드시 `setSessionCookie`와 정확히 같은
`domain`/`path`로 지워야 함 — 안 맞으면 로그아웃해도 쿠키가 실제로는 안
지워지는(또는 새 쿠키가 하나 더 생기는) 흔한 버그가 남. 로컬(`localhost`)은
`domain: undefined` 유지 — 부모 도메인 쿠키(`.axhrd.com`)는 localhost에서
동작하지 않으므로 로컬 개발 환경이 깨지지 않게 production에서만 적용.

## 2. 미들웨어 — 호스트 기반 랜딩 스켈레톤

`middleware.ts`(신규 또는 기존 파일에 추가):
```ts
const PRODUCT_HOSTS: Record<string, string> = {
  "interview.axhrd.com": "/interview",
  "ac.axhrd.com": "/ac",               // 역량솔루션 — 라우트 생기면 연결
  "diagnosis.axhrd.com": "/diagnosis", // 진단솔루션 — 라우트 생기면 연결
};
```
- 호스트가 이 매핑에 있고 경로가 `/`(루트)일 때만 해당 제품 홈으로 rewrite.
  그 외 경로는 그대로 통과시킬 것 — **서브도메인은 "기본 화면이 뭐냐"만
  결정하고 접근 자체를 막지 않는다.** 예를 들어 `ac.axhrd.com/interview/setup`
  같은 "다른 제품 경로를 다른 서브도메인에서 접속"도 그냥 동작하게 둔다(강제
  차단은 나중에 필요해지면 별도로 추가 — 이번엔 permissive하게).
- `ac`/`diagnosis` 엔트리는 대상 라우트가 아직 없으니 매핑은 미리 적어두되
  **주석으로 "라우트 생기기 전까지 실제 DNS 연결하지 말 것"** 명시.

## 3. 제품 간 링크 헬퍼

`lib/platform/product-domains.ts`(신규):
```ts
export const PRODUCT_DOMAINS = {
  interview: "interview.axhrd.com",
  ac: "ac.axhrd.com",
  diagnosis: "diagnosis.axhrd.com",
  hub: "axhrd.com",
} as const;

export function productUrl(
  product: keyof typeof PRODUCT_DOMAINS,
  path = "/"
): string {
  if (process.env.NODE_ENV !== "production") return path; // 로컬은 상대경로 유지
  return `https://${PRODUCT_DOMAINS[product]}${path}`;
}
```
- `lib/platform/nav-registry.ts`에서 향후 다른 제품으로 넘어가는 교차 유입
  링크(예: 면접 리포트 화면에 "역량평가도 해보기" CTA)를 만들 때 이 헬퍼로
  절대 URL을 생성. **지금은 AC/진단 라우트가 없으니 실제 교차 링크는 추가하지
  말고, 헬퍼 함수만 준비**해둔다 — 그 제품들이 생기면 그때 링크만 꽂으면 됨.

## 4. 배포(Vercel/DNS) — 코드 밖 작업, 안내만

- Vercel은 프로젝트 하나에 도메인 여러 개를 붙일 수 있음(Settings → Domains).
  `interview.axhrd.com`을 먼저 추가 — 기존 `app.axhrd.com`을 이걸로 대체할지,
  당분간 병행(둘 다 살려두고 나중에 리다이렉트)할지는 운영 판단이라 사용자가
  결정.
- `ac.axhrd.com`/`diagnosis.axhrd.com`은 **해당 제품이 실제 배포 가능해졌을 때
  추가** — 지금 미리 연결하면 빈 페이지가 공개 도메인에 그대로 노출됨.
- `NEXTAUTH_SECRET`은 이미 앱 전체가 공유하는 값이라 추가 설정 불필요 — 같은
  서명 키를 여러 도메인이 그대로 검증할 수 있는 게 "앱 하나 + 도메인만 분리"
  방식을 쓰는 핵심 이유.

## 원칙

- OAuth2/OIDC 같은 별도 인증 프로토콜·인증 서버는 만들지 않는다 — 앱이
  하나이므로 쿠키 도메인 확장만으로 충분.
- 이번 배치는 인프라만 — AC/진단 제품 자체 구현은 각각 별도 배치(범위 밖).
- `domain` 쿠키 옵션은 production에서만 적용해 로컬 개발 환경 보존.
- 쿠키 설정과 삭제 로직을 반드시 함께 고칠 것(도메인 불일치로 로그아웃이
  실제로는 안 되는 버그 방지).
- 스키마 변경 없음 — 마이그레이션 불필요.
- 작업 끝나면 `docs/STATUS.md`에 근거·변경 파일·로컬 검증 방법(로그인 후
  브라우저 devtools에서 쿠키의 Domain 속성이 `.axhrd.com`으로 보이는지,
  로그아웃 후 쿠키가 실제로 사라지는지) 정리.

## 커서에 붙여넣을 프롬프트

```
이 문서(cursor_multi_product_sso_prompt.md)에 정리된 "제품 간 SSO(서브도메인
공유 세션) 인프라"를 구현해줘. 앱은 하나 그대로 유지하고 도메인만 제품별로
나누는 구조라, 진짜 SSO 서버 없이 쿠키 도메인만 넓히면 돼.

핵심 원칙만 다시 강조:
1. OAuth2/OIDC 같은 별도 인증 프로토콜/서버 만들지 마 — lib/auth/session.ts의
   setSessionCookie/clearSessionCookie에 domain: ".axhrd.com" (production
   한정) 옵션만 추가하면 충분해.
2. clearSessionCookie도 setSessionCookie와 정확히 같은 domain/path로 지워야
   로그아웃이 실제로 동작해 — 이거 빠뜨리지 마.
3. 로컬(localhost)에서는 domain 옵션 없이(undefined) 그대로 둬서 로컬 개발
   안 깨지게 해.
4. middleware.ts에 호스트 기반 랜딩 rewrite 스켈레톤 추가하되, ac.axhrd.com/
   diagnosis.axhrd.com은 대상 라우트가 아직 없으니 매핑만 적어두고 실제 rewrite
   로직이 없는 상태로 둬(주석으로 "라우트 생기면 연결" 명시).
5. lib/platform/product-domains.ts에 productUrl() 헬퍼만 준비 — 실제 교차 제품
   링크는 추가하지 마(AC/진단 라우트가 없으니까).

스키마 변경 없어서 마이그레이션 불필요. npm run build 확인하고 docs/STATUS.md에
정리해줘.
```

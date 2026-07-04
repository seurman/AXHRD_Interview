/**
 * 카카오 로그인 (OAuth 2.0)
 * @see https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import type { OAuthAdapter, OAuthProfile } from "./types";

const AUTH_BASE = "https://kauth.kakao.com";
const API_BASE = "https://kapi.kakao.com";

function redirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/auth/oauth/kakao/callback`;
}

function getAuthUrl(state: string): string {
  const clientId = process.env.KAKAO_CLIENT_ID ?? "";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
    // 주의: account_email 등 "권한 없음" 상태인 동의항목을 scope로 요청하면
    // 인가 요청 자체가 실패한다. 콘솔에서 "추가 기능 신청"(개인정보 국외이전
    // 동의 포함)으로 이메일 접근 권한을 받기 전까지는 scope를 지정하지 않고
    // 콘솔에 설정된 기본 동의항목(예: 닉네임)만 사용한다.
    // 이메일 권한을 받은 뒤 scope: "account_email"을 다시 추가하면 된다.
  });
  return `${AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

async function exchangeCode(code: string): Promise<{ accessToken: string }> {
  const clientId = process.env.KAKAO_CLIENT_ID ?? "";
  const clientSecret = process.env.KAKAO_CLIENT_SECRET; // 콘솔에서 활성화한 경우만 필요

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    code,
  });
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetchWithTimeout(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    timeoutMs: 8000,
    retries: 1,
  });

  if (!res.ok) {
    throw new Error(`[Kakao] 토큰 교환 실패: ${await res.text()}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token as string };
}

async function fetchProfile(accessToken: string): Promise<OAuthProfile> {
  const res = await fetchWithTimeout(`${API_BASE}/v2/user/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 8000,
    retries: 1,
  });

  if (!res.ok) {
    throw new Error(`[Kakao] 프로필 조회 실패: ${await res.text()}`);
  }

  const data = await res.json();
  const account = data.kakao_account ?? {};

  return {
    providerAccountId: String(data.id),
    email: account.email ?? null,
    name: account.profile?.nickname ?? null,
  };
}

export const kakaoAdapter: OAuthAdapter = {
  key: "kakao",
  getAuthUrl,
  exchangeCode,
  fetchProfile,
};

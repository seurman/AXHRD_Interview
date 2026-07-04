/**
 * 네이버 로그인 (OAuth 2.0)
 * @see https://developers.naver.com/docs/login/api/api.md
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import type { OAuthAdapter, OAuthProfile } from "./types";

const AUTH_BASE = "https://nid.naver.com";
const API_BASE = "https://openapi.naver.com";

function redirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/auth/oauth/naver/callback`;
}

function getAuthUrl(state: string): string {
  const clientId = process.env.NAVER_CLIENT_ID ?? "";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTH_BASE}/oauth2.0/authorize?${params.toString()}`;
}

async function exchangeCode(code: string, state?: string): Promise<{ accessToken: string }> {
  const clientId = process.env.NAVER_CLIENT_ID ?? "";
  const clientSecret = process.env.NAVER_CLIENT_SECRET ?? "";

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    ...(state ? { state } : {}),
  });

  const res = await fetchWithTimeout(`${AUTH_BASE}/oauth2.0/token?${params.toString()}`, {
    method: "GET",
    timeoutMs: 8000,
    retries: 1,
  });

  if (!res.ok) {
    throw new Error(`[Naver] 토큰 교환 실패: ${await res.text()}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`[Naver] 토큰 교환 실패: ${JSON.stringify(data)}`);
  }
  return { accessToken: data.access_token as string };
}

async function fetchProfile(accessToken: string): Promise<OAuthProfile> {
  const res = await fetchWithTimeout(`${API_BASE}/v1/nid/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 8000,
    retries: 1,
  });

  if (!res.ok) {
    throw new Error(`[Naver] 프로필 조회 실패: ${await res.text()}`);
  }

  const data = await res.json();
  const profile = data.response ?? {};

  return {
    providerAccountId: String(profile.id),
    email: profile.email ?? null,
    name: profile.name ?? profile.nickname ?? null,
  };
}

export const naverAdapter: OAuthAdapter = {
  key: "naver",
  getAuthUrl,
  // 네이버는 토큰 교환 시 authorize 요청에 쓴 state와 동일한 값을 요구함
  exchangeCode,
  fetchProfile,
};

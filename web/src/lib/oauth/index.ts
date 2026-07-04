import { kakaoAdapter } from "./kakao";
import { naverAdapter } from "./naver";
import type { OAuthAdapter, OAuthProviderKey } from "./types";

const registry: Record<OAuthProviderKey, OAuthAdapter> = {
  kakao: kakaoAdapter,
  naver: naverAdapter,
};

export function getOAuthAdapter(provider: string): OAuthAdapter | null {
  if (provider === "kakao" || provider === "naver") {
    return registry[provider];
  }
  return null;
}

export * from "./types";

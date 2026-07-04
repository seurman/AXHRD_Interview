export type OAuthProviderKey = "kakao" | "naver";

export interface OAuthProfile {
  /** 각 제공자 내부의 고유 사용자 ID (문자열로 정규화) */
  providerAccountId: string;
  /** 제공자가 이메일 동의를 거부/미지원하면 null일 수 있음 */
  email: string | null;
  name: string | null;
}

export interface OAuthAdapter {
  key: OAuthProviderKey;
  /** 사용자를 제공자 인가 화면으로 보낼 URL */
  getAuthUrl(state: string): string;
  /** 인가 코드를 access token으로 교환. state는 네이버처럼 CSRF 검증에 state를 요구하는 제공자용 */
  exchangeCode(code: string, state?: string): Promise<{ accessToken: string }>;
  /** access token으로 프로필 조회 */
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

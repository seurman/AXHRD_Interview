/**
 * 외부 API(Gemini, DeepSeek, Kakao/Naver 등) 호출 공통 래퍼.
 *
 * - 타임아웃: AbortController로 지정 시간 내 응답 없으면 중단
 * - 재시도: 네트워크 오류·타임아웃·5xx에 한해 짧게 재시도
 *   (4xx는 재시도해도 성공하지 않으므로 즉시 반환 — 비용 낭비 방지)
 *
 * 실시간 면접 흐름(TTS, 채점, 질문 개인화)에서 외부 API가 느려지거나
 * 응답이 없을 때 요청이 무한정 걸려있지 않도록 하기 위한 안전장치.
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  /** 요청 1회당 최대 대기 시간(ms). 기본 8초 */
  timeoutMs?: number;
  /** 실패 시 추가 재시도 횟수(최초 시도 제외). 기본 1회 */
  retries?: number;
  /** 재시도 전 대기 시간(ms), 매 시도마다 배수로 증가. 기본 300ms */
  retryDelayMs?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 8000, retries = 1, retryDelayMs = 300, ...init } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      // 4xx(키 오류·잘못된 요청)는 재시도해도 실패하므로 그대로 반환
      if (res.status >= 400 && res.status < 500) return res;

      if (!res.ok && attempt < retries) {
        console.warn(
          `[fetchWithTimeout] HTTP ${res.status}, 재시도 ${attempt + 1}/${retries}: ${url}`
        );
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      return res;
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
      const isAbort = e instanceof Error && e.name === "AbortError";

      if (attempt < retries) {
        console.warn(
          `[fetchWithTimeout] ${isAbort ? "타임아웃" : "네트워크 오류"}, 재시도 ${attempt + 1}/${retries}: ${url}`
        );
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`fetchWithTimeout: ${url} 요청 실패`);
}

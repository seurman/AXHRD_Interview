/** 면접·역량평가 공통 음성 모드 localStorage 키 */
export const VOICE_MODE_STORAGE_KEY = "axhrd_voice_mode";

export type VoiceSubmitMode = "submit" | "draft";

export function readVoiceModeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(VOICE_MODE_STORAGE_KEY);
  if (stored === "off") return false;
  if (stored === "on") return true;
  return true;
}

export function writeVoiceModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_MODE_STORAGE_KEY, enabled ? "on" : "off");
}

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.",
  "no-speech": "음성이 감지되지 않았습니다. 조금 더 크게 말씀해 주세요.",
  network: "음성 인식 네트워크 오류입니다. 인터넷 연결을 확인해 주세요.",
  aborted: "음성 인식이 중단되었습니다. 다시 시도해 주세요.",
  "audio-capture": "마이크를 찾을 수 없습니다. 장치 연결을 확인해 주세요.",
  "service-not-allowed":
    "이 페이지에서는 음성 인식을 사용할 수 없습니다. HTTPS 또는 localhost에서 시도해 주세요.",
};

export function speechRecognitionErrorMessage(code: string): string {
  return (
    SPEECH_ERROR_MESSAGES[code] ??
    `음성 인식 오류(${code}). 다시 시도하거나 직접 입력해 주세요.`
  );
}

/** draft 모드는 받아쓰기 후 편집·확인, submit은 정지 즉시 전송 */
export function shouldDeferVoiceSubmit(mode: VoiceSubmitMode): boolean {
  return mode === "draft";
}

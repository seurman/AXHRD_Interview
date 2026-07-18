/** 면접·역량평가 공통 음성 모드 localStorage 키 */
export const VOICE_MODE_STORAGE_KEY = "axhrd_voice_mode";

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

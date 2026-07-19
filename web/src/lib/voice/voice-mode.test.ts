import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readVoiceModeEnabled,
  shouldDeferVoiceSubmit,
  speechRecognitionErrorMessage,
  VOICE_MODE_STORAGE_KEY,
  writeVoiceModeEnabled,
} from "@/lib/voice/voice-mode";

describe("voice-mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to enabled and persists on/off", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
        clear: () => store.clear(),
        key: () => null,
        get length() {
          return store.size;
        },
      },
    });

    expect(readVoiceModeEnabled()).toBe(true);
    writeVoiceModeEnabled(false);
    expect(store.get(VOICE_MODE_STORAGE_KEY)).toBe("off");
    expect(readVoiceModeEnabled()).toBe(false);
    writeVoiceModeEnabled(true);
    expect(readVoiceModeEnabled()).toBe(true);
  });

  it("maps speech recognition errors for text fallback UX", () => {
    expect(speechRecognitionErrorMessage("not-allowed")).toMatch(/마이크 권한/);
    expect(speechRecognitionErrorMessage("weird")).toMatch(/weird/);
  });

  it("defers submit only in draft mode (assessment runners)", () => {
    expect(shouldDeferVoiceSubmit("draft")).toBe(true);
    expect(shouldDeferVoiceSubmit("submit")).toBe(false);
  });
});

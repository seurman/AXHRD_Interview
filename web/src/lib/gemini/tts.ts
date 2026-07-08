/**
 * Gemini 네이티브 TTS (gemini-2.5-flash-preview-tts) — Google 계열로 통합
 * generateContent가 반환하는 원시 PCM(24kHz, mono, 16-bit)을 WAV 컨테이너로 감싸서
 * 브라우저 <audio>에서 바로 재생 가능하게 만든다.
 * @see https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
 */

import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const TTS_CACHE_MAX = 48;

/** 동일 문장 재합성 방지 — 서버 프로세스 인메모리 (짧은 면접 문항 위주) */
const ttsCache = new Map<string, ArrayBuffer>();

export type TtsSynthesisResult = {
  audio: ArrayBuffer | null;
  cacheHit: boolean;
};

function ttsCacheKey(text: string): string {
  return text.trim().slice(0, 500);
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  const result = await synthesizeSpeechWithMeta(text);
  return result.audio;
}

export async function synthesizeSpeechWithMeta(text: string): Promise<TtsSynthesisResult> {
  const key = ttsCacheKey(text);
  const cached = ttsCache.get(key);
  if (cached) {
    return { audio: cached, cacheHit: true };
  }

  const audio = await synthesizeSpeechUncached(text);
  if (audio) {
    if (ttsCache.size >= TTS_CACHE_MAX) {
      const oldest = ttsCache.keys().next().value;
      if (oldest !== undefined) ttsCache.delete(oldest);
    }
    ttsCache.set(key, audio);
  }
  return { audio, cacheHit: false };
}

async function synthesizeSpeechUncached(text: string): Promise<ArrayBuffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini TTS] API key not configured — skipping synthesis");
    return null;
  }

  const model = process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
  const voice = process.env.GEMINI_TTS_VOICE ?? "Kore"; // 30개 프리셋 보이스 중 하나, 언어는 텍스트에서 자동 감지(한국어 지원)

  let res: Response;
  try {
    res = await fetchWithTimeout(`${GEMINI_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
      timeoutMs: 8000,
      retries: 1,
    });
  } catch (e) {
    console.error("[Gemini TTS] 요청 실패(타임아웃/네트워크):", e);
    return null;
  }

  if (!res.ok) {
    console.error("[Gemini TTS] Error:", await res.text());
    return null;
  }

  const data = await res.json();
  const base64Pcm: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Pcm) return null;

  const pcm = Buffer.from(base64Pcm, "base64");
  const wav = pcmToWav(pcm, SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE);
  return wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
}

/** 44바이트 표준 WAV 헤더를 원시 PCM 앞에 붙인다 (RIFF/WAVE, PCM format=1). */
function pcmToWav(
  pcm: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

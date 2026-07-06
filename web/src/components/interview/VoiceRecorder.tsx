"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconMic, IconSquare } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface VoiceRecorderProps {
  onTranscript: (text: string, durationSec?: number) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const startedAtRef = useRef<number | null>(null);
  // 모바일(특히 안드로이드 Chrome)은 continuous=true라도 내부적으로 인식 세션이
  // 조용히 끊겼다 재시작되는데, 이때 이미 확정(isFinal)된 문장을 다시 결과에 얹어
  // "같은 내용이 반복"되는 경우가 있다. 화면에 보여줄 인식 결과 자체가 아니라
  // 지금까지 확정된 문장들을 여기(ref)에 직접 누적해 매 onresult마다 처음부터
  // 다시 합치지 않도록 한다 — 그래야 세션이 재시작돼도 중복이 안 생긴다.
  const finalTranscriptRef = useRef("");
  // 사용자가 정지 버튼을 눌러 끝낸 것인지 구분 — 아니면 onend에서 자동 재시작한다
  // (모바일은 몇 초 침묵만 있어도 continuous여도 알아서 멈춰버리는 경우가 많음)
  const manualStopRef = useRef(false);

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SR) {
      setSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      const startIndex = event.resultIndex ?? 0;
      for (let i = startIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const already = finalTranscriptRef.current.trim();
          const piece = text.trim();
          // 세션 재시작 직후 방금 확정한 문장이 그대로 다시 들어오는 경우 스킵
          if (piece && !already.endsWith(piece)) {
            finalTranscriptRef.current = already ? `${already} ${piece}` : piece;
          }
        } else {
          interim += text;
        }
      }
      setTranscript(`${finalTranscriptRef.current} ${interim}`.trim());
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      if (manualStopRef.current) {
        setListening(false);
        return;
      }
      // 사용자가 정지를 안 눌렀는데 끊겼다 — 모바일 자동 종료로 보고 이어서 재시작
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    setTranscript("");
    finalTranscriptRef.current = "";
    manualStopRef.current = false;
    startedAtRef.current = Date.now();
    recognitionRef.current.start();
    setListening(true);
  }, [disabled]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
    if (transcript.trim()) {
      const durationSec = startedAtRef.current
        ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        : undefined;
      onTranscript(transcript.trim(), durationSec);
    }
    startedAtRef.current = null;
  }, [onTranscript, transcript]);

  if (!supported) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome/Edge를
        사용해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        {!listening ? (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-light",
              disabled && "opacity-50"
            )}
          >
            <IconMic />
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-danger/80 text-white"
          >
            <IconSquare />
          </button>
        )}
      </div>

      <p className="text-center text-sm text-muted">
        {listening ? (
          <span className="flex items-center justify-center gap-2 text-accent">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
            녹음 중… 답변 후 정지 버튼
          </span>
        ) : (
          "마이크를 눌러 답변을 시작하세요"
        )}
      </p>

      {transcript && (
        <div className="rounded-xl border border-card-border bg-background p-4 text-sm text-foreground">
          {transcript}
        </div>
      )}
    </div>
  );
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex?: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [index: number]: { transcript: string };
  };
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

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
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        final += event.results[i][0].transcript;
      }
      setTranscript(final);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    setTranscript("");
    startedAtRef.current = Date.now();
    recognitionRef.current.start();
    setListening(true);
  }, [disabled]);

  const stop = useCallback(() => {
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
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: { [index: number]: { transcript: string } };
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

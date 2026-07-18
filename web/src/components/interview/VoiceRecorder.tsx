"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconMic, IconSquare } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface VoiceRecorderProps {
  onTranscript: (text: string, durationSec?: number) => void;
  disabled?: boolean;
  /** false면 마이크 UI 없이 텍스트 입력만 제공 */
  voiceInputEnabled?: boolean;
  /** 음성 인식 실패 시 직접 입력 폴백 */
  allowTextFallback?: boolean;
  /** 텍스트 붙여넣기 감지(채점 차단 없음) */
  onPasteDetected?: () => void;
  /**
   * submit: 정지 시 즉시 onTranscript (면접 기본)
   * draft: 정지 후 텍스트로 편집 가능, 확인 버튼으로 onTranscript (서류함·역할연기)
   */
  submitMode?: "submit" | "draft";
  /** draft 모드 확인 버튼 라벨 */
  confirmLabel?: string;
  /** 마이크 안내 문구 */
  idleHint?: string;
}

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.",
  "no-speech": "음성이 감지되지 않았습니다. 조금 더 크게 말씀해 주세요.",
  network: "음성 인식 네트워크 오류입니다. 인터넷 연결을 확인해 주세요.",
  aborted: "음성 인식이 중단되었습니다. 다시 시도해 주세요.",
  "audio-capture": "마이크를 찾을 수 없습니다. 장치 연결을 확인해 주세요.",
  "service-not-allowed": "이 페이지에서는 음성 인식을 사용할 수 없습니다. HTTPS 또는 localhost에서 시도해 주세요.",
};

function speechErrorMessage(code: string): string {
  return SPEECH_ERROR_MESSAGES[code] ?? `음성 인식 오류(${code}). 다시 시도하거나 직접 입력해 주세요.`;
}

export function VoiceRecorder({
  onTranscript,
  disabled,
  voiceInputEnabled = true,
  allowTextFallback = true,
  onPasteDetected,
  submitMode = "submit",
  confirmLabel = "답변 제출",
  idleHint = "마이크를 눌러 답변을 시작하세요",
}: VoiceRecorderProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(!voiceInputEnabled);
  const [textDraft, setTextDraft] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const startedAtRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  const manualStopRef = useRef(false);
  const lastDurationRef = useRef<number | undefined>(undefined);

  const getFullTranscript = useCallback(() => {
    return finalTranscriptRef.current.trim() || transcript.trim();
  }, [transcript]);

  useEffect(() => {
    setShowTextInput(!voiceInputEnabled);
    if (!voiceInputEnabled) {
      setListening(false);
      setError(null);
    }
  }, [voiceInputEnabled]);

  useEffect(() => {
    if (!voiceInputEnabled) return;

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
          if (piece && !already.endsWith(piece)) {
            finalTranscriptRef.current = already ? `${already} ${piece}` : piece;
          }
        } else {
          interim += text;
        }
      }
      setTranscript(`${finalTranscriptRef.current} ${interim}`.trim());
      setError(null);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const code = event.error ?? "unknown";
      setListening(false);
      if (code !== "aborted") {
        setError(speechErrorMessage(code));
      }
    };

    recognition.onend = () => {
      if (manualStopRef.current) {
        setListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
  }, [voiceInputEnabled]);

  const submitText = useCallback(
    (text: string, durationSec?: number) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("답변 내용이 비어 있습니다. 말씀하시거나 직접 입력해 주세요.");
        return;
      }
      setError(null);
      onTranscript(trimmed, durationSec);
    },
    [onTranscript]
  );

  const start = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    setTranscript("");
    setTextDraft("");
    finalTranscriptRef.current = "";
    manualStopRef.current = false;
    setError(null);
    startedAtRef.current = Date.now();
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setError("마이크를 시작할 수 없습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.");
      setListening(false);
    }
  }, [disabled]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);

    const fullText = getFullTranscript();
    const durationSec = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      : undefined;
    startedAtRef.current = null;
    lastDurationRef.current = durationSec;

    if (fullText) {
      if (submitMode === "draft") {
        setTextDraft(fullText);
        setShowTextInput(true);
        setError(null);
      } else {
        submitText(fullText, durationSec);
      }
    } else {
      setError("음성이 인식되지 않았습니다. 조금 더 길게 말씀하시거나 아래에 직접 입력해 주세요.");
      if (allowTextFallback) setShowTextInput(true);
    }
  }, [allowTextFallback, getFullTranscript, submitMode, submitText]);

  const submitDraft = () => {
    submitText(textDraft, lastDurationRef.current);
  };

  if (!voiceInputEnabled) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-muted">텍스트로 답변을 입력해 주세요.</p>
        <TextFallback
          value={textDraft}
          onChange={setTextDraft}
          onSubmit={submitDraft}
          disabled={disabled}
          onPasteDetected={onPasteDetected}
          confirmLabel={confirmLabel}
        />
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          이 브라우저는 Web Speech API를 지원하지 않습니다. Chrome/Edge를 사용하거나 아래에
          직접 입력해 주세요.
        </div>
        {allowTextFallback && (
          <TextFallback
            value={textDraft}
            onChange={setTextDraft}
            onSubmit={submitDraft}
            disabled={disabled}
            onPasteDetected={onPasteDetected}
            confirmLabel={confirmLabel}
          />
        )}
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
          idleHint
        )}
      </p>

      {error && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      )}

      {transcript && listening && (
        <div className="rounded-xl border border-card-border bg-background p-4 text-sm text-foreground">
          {transcript}
        </div>
      )}

      {allowTextFallback && (
        <div className="space-y-2">
          {!showTextInput ? (
            <button
              type="button"
              onClick={() => setShowTextInput(true)}
              className="w-full text-center text-xs text-primary hover:underline"
              disabled={disabled}
            >
              음성이 안 될 때 직접 입력하기
            </button>
          ) : (
            <TextFallback
              value={textDraft}
              onChange={setTextDraft}
              onSubmit={submitDraft}
              disabled={disabled}
              onPasteDetected={onPasteDetected}
              confirmLabel={confirmLabel}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TextFallback({
  value,
  onChange,
  onSubmit,
  disabled,
  onPasteDetected,
  confirmLabel = "답변 제출",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  onPasteDetected?: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={() => onPasteDetected?.()}
        placeholder="답변을 직접 입력하세요…"
        rows={4}
        disabled={disabled}
        className="w-full resize-none rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary/40"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="btn-primary w-full py-3 text-sm disabled:opacity-50"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex?: number;
}

interface SpeechRecognitionErrorEvent {
  error?: string;
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
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

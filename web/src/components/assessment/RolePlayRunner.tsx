"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateScenarioPayload } from "@/lib/assessment/load-scenario-context";
import type { DialogueTurn } from "@/lib/assessment/role-play-engine";
import { VoiceRecorder } from "@/components/interview/VoiceRecorder";
import {
  readVoiceModeEnabled,
  writeVoiceModeEnabled,
} from "@/lib/voice/voice-mode";
import { ttsCacheKey } from "@/lib/interview/tts-cache-key";

/**
 * 역할연기 실행 화면 — 음성 우선, 텍스트 대체.
 * 채점 기준·페르소나 지침은 서버가 내려주지 않으므로 이 화면에는 존재하지 않는다.
 */
export function RolePlayRunner({
  attemptId,
  scenario,
  initialDialogue,
}: {
  attemptId: string;
  scenario: CandidateScenarioPayload;
  initialDialogue: DialogueTurn[];
}) {
  const router = useRouter();
  const [dialogue, setDialogue] = useState<DialogueTurn[]>(initialDialogue);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(dialogue.length <= 1);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
  const [ttsStatus, setTtsStatus] = useState<"idle" | "synthesizing" | "playing">("idle");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenKeyRef = useRef<string | null>(null);

  const turnsUsed = dialogue.filter((t) => t.role === "CANDIDATE").length;
  const canContinue = turnsUsed < scenario.maxTurns;
  const personaName = scenario.personaName ?? "상대역";

  useEffect(() => {
    setVoiceModeEnabled(readVoiceModeEnabled());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dialogue.length]);

  const stopActiveAudio = useCallback(() => {
    const audio = activeAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    activeAudioRef.current = null;
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setVoiceModeEnabled((prev) => {
      const next = !prev;
      writeVoiceModeEnabled(next);
      if (!next) {
        stopActiveAudio();
        setTtsStatus("idle");
      }
      return next;
    });
  }, [stopActiveAudio]);

  const playPersonaTts = useCallback(
    async (text: string, turnKey: string) => {
      if (!voiceModeEnabled || !text.trim()) return;
      const cacheKey = ttsCacheKey(turnKey, text);
      if (lastSpokenKeyRef.current === cacheKey && ttsStatus === "playing") return;

      stopActiveAudio();
      lastSpokenKeyRef.current = cacheKey;

      let url = ttsCacheRef.current.get(cacheKey);
      if (!url) {
        setTtsStatus("synthesizing");
        try {
          const res = await fetch(`/api/assessment/attempts/${attemptId}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ text }),
          });
          if (!res.ok || res.status === 204) {
            setTtsStatus("idle");
            return;
          }
          const blob = await res.blob();
          url = URL.createObjectURL(blob);
          ttsCacheRef.current.set(cacheKey, url);
        } catch {
          setTtsStatus("idle");
          return;
        }
      }

      setTtsStatus("playing");
      try {
        const audio = new Audio(url);
        activeAudioRef.current = audio;
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
        });
      } catch {
        /* 재생 실패 — 텍스트로 계속 */
      } finally {
        activeAudioRef.current = null;
        setTtsStatus("idle");
      }
    },
    [attemptId, stopActiveAudio, ttsStatus, voiceModeEnabled],
  );

  // 최신 PERSONA 턴 자동 재생
  useEffect(() => {
    if (!voiceModeEnabled) return;
    const last = dialogue[dialogue.length - 1];
    if (!last || last.role !== "PERSONA") return;
    const key = `persona-${dialogue.length - 1}`;
    void playPersonaTts(last.text, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 새 PERSONA 턴에만 재생
  }, [dialogue.length, voiceModeEnabled]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || sending || !canContinue) return;
    setSending(true);
    setError(null);
    stopActiveAudio();
    setDialogue((d) => [...d, { role: "CANDIDATE", text: trimmed, at: Date.now() }]);
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? "응답 생성에 실패했습니다. 다시 시도해 주세요.");
        setDialogue((d) => d.slice(0, -1));
        return;
      }
      setDialogue((d) => [...d, { role: "PERSONA", text: data.reply!, at: Date.now() }]);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setDialogue((d) => d.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  async function submit() {
    if (submitting) return;
    if (turnsUsed < 1) {
      setError("최소 1회 이상 발화한 뒤 제출할 수 있습니다.");
      return;
    }
    if (
      canContinue &&
      !window.confirm("대화를 종료하고 제출할까요? 제출 후에는 수정할 수 없습니다.")
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    stopActiveAudio();
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "제출에 실패했습니다.");
        return;
      }
      router.push(`/assessment/attempt/${attemptId}/report`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const lastPersona = [...dialogue].reverse().find((t) => t.role === "PERSONA");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">역할연기 과제</p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{scenario.titleKo}</h1>
          {scenario.roleContext ? (
            <p className="mt-1 text-sm text-muted">{scenario.roleContext}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleVoiceMode}
            className="rounded-full border border-card-border bg-card px-3 py-1 text-xs font-medium text-muted transition hover:text-foreground"
          >
            {voiceModeEnabled ? "음성 ON" : "텍스트 모드"}
          </button>
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted">
            발화 {turnsUsed} / {scenario.maxTurns}턴
          </span>
        </div>
      </div>

      <section className="card-luxe p-4">
        <button
          type="button"
          onClick={() => setBriefOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
        >
          과제 브리핑
          <span className="text-xs text-muted">{briefOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {briefOpen ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
            {scenario.taskBrief}
          </p>
        ) : null}
      </section>

      <section className="card-luxe flex h-[28rem] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {dialogue.map((turn, i) => (
            <div
              key={`${turn.at}-${i}`}
              className={turn.role === "CANDIDATE" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  turn.role === "CANDIDATE"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-foreground px-4 py-2.5 text-sm leading-relaxed text-background"
                    : "max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground"
                }
              >
                {turn.role === "PERSONA" ? (
                  <p className="mb-1 text-xs font-medium text-accent">
                    {personaName}
                    {scenario.personaRole ? ` · ${scenario.personaRole}` : ""}
                  </p>
                ) : null}
                <p className="whitespace-pre-line">{turn.text}</p>
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm text-muted">
                {personaName} 입력 중…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 border-t border-card-border pt-3">
          {error ? <p className="mb-2 text-xs text-warning">{error}</p> : null}
          {ttsStatus !== "idle" && voiceModeEnabled ? (
            <p className="mb-2 text-center text-xs text-muted">
              {ttsStatus === "synthesizing"
                ? `${personaName} 음성 준비 중…`
                : `${personaName} 말하는 중…`}
            </p>
          ) : null}
          {canContinue ? (
            <div className="space-y-2">
              {lastPersona && voiceModeEnabled ? (
                <button
                  type="button"
                  onClick={() =>
                    void playPersonaTts(lastPersona.text, `replay-${dialogue.length}`)
                  }
                  className="w-full text-center text-xs text-primary hover:underline"
                  disabled={sending || submitting}
                >
                  상대역 다시 듣기
                </button>
              ) : null}
              <VoiceRecorder
                voiceInputEnabled={voiceModeEnabled}
                allowTextFallback
                submitMode="draft"
                confirmLabel="전송"
                idleHint={`${personaName}에게 말하기 — 마이크를 누르세요`}
                disabled={sending || submitting}
                onTranscript={(text) => void sendMessage(text)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">
              대화 턴을 모두 사용했습니다. 아래에서 제출해 주세요.
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || sending || turnsUsed < 1}
          className="rounded-xl border border-card-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "채점 중… (최대 1분)" : "대화 종료 · 제출하기"}
        </button>
      </div>
    </div>
  );
}

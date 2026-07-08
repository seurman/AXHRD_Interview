"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconVolume } from "@/components/ui/icons";
import { LevelChip } from "./LevelChip";
import { CompetencyBar } from "./CompetencyBar";
import { VoiceRecorder } from "./VoiceRecorder";
import { AnswerFeedbackPanel } from "./AnswerFeedbackPanel";
import { LoadingRitual } from "@/components/ux/LoadingRitual";
import { ClipDynamic } from "@/components/ui/ClipDynamic";
import { competencyLabel } from "@/lib/labels";
import { displayQuestionText } from "@/lib/interview/build-question";
import type {
  AnswerFeedback,
  ChipEvent,
  CompetencyState,
  InterviewQuestion,
  InterviewSessionState,
} from "@/types";

interface InterviewSessionProps {
  sessionId: string;
  initialState: InterviewSessionState;
  focusCompetency?: string;
  maxItems?: number;
}

export function InterviewSession({
  sessionId,
  initialState,
  focusCompetency,
  maxItems = 3,
}: InterviewSessionProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [processing, setProcessing] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<AnswerFeedback | null>(null);
  const [ttsStatus, setTtsStatus] = useState<"idle" | "synthesizing" | "playing">("idle");

  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const pasteDetectedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        tabSwitchCountRef.current += 1;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const prefetchQuestionTts = useCallback(async (questionId: string, text: string) => {
    if (!text.trim() || ttsCacheRef.current.has(questionId)) return;
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, sessionId }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      ttsCacheRef.current.set(questionId, URL.createObjectURL(blob));
    } catch {
      /* TTS 프리페치 실패는 무시 — 재생 시 재시도 */
    }
  }, []);

  const playQuestionTts = useCallback(async (questionId: string, text: string) => {
    if (!text.trim()) return;

    const cached = ttsCacheRef.current.get(questionId);
    if (cached) {
      setTtsStatus("playing");
      try {
        const audio = new Audio(cached);
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
      } catch {
        /* 재생 실패 */
      } finally {
        setTtsStatus("idle");
      }
      return;
    }

    setTtsStatus("synthesizing");
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, sessionId }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        ttsCacheRef.current.set(questionId, url);
        const audio = new Audio(url);
        setTtsStatus("playing");
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
      }
    } catch {
      // TTS 없으면 텍스트만 표시
    } finally {
      setTtsStatus("idle");
    }
  }, []);

  useEffect(() => {
    const q = state.currentQuestion;
    if (!q) return;
    const text = displayQuestionText(q);
    if (text) void playQuestionTts(q.id, text);
  }, [state.currentQuestion?.id, playQuestionTts, state.currentQuestion]);

  const handleAnswer = async (transcript: string, durationSec?: number) => {
    if (!state.currentQuestion || processing) return;
    setProcessing(true);
    setLastFeedback(null);

    try {
      const res = await fetch("/api/interview/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: state.currentQuestion.id,
          transcript,
          durationSec,
          pasteDetected: pasteDetectedRef.current,
          tabSwitchCount: tabSwitchCountRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `서버 오류 (${res.status})`
        );
      }

      const data = await res.json();

      const nextQuestion = data.nextQuestion as InterviewQuestion | null;
      if (nextQuestion?.id) {
        void prefetchQuestionTts(nextQuestion.id, displayQuestionText(nextQuestion));
      }

      if (data.answerFeedback) {
        setLastFeedback(data.answerFeedback as AnswerFeedback);
      }

      setState((prev) => ({
        ...prev,
        competencyStates: data.competencyStates,
        chipHistory: data.chipEvent
          ? [...prev.chipHistory, data.chipEvent as ChipEvent]
          : prev.chipHistory,
        administeredIds: data.administeredIds,
        totalItems: data.totalItems,
        shouldTerminate: data.shouldTerminate,
        currentQuestion: nextQuestion,
        status: data.shouldTerminate ? "completed" : "in_progress",
      }));

      if (data.shouldTerminate) {
        router.push(
          data.redirectUrl ??
            `/interview/${sessionId}/report`
        );
      }
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error ? e.message : "답변 처리 중 오류가 발생했습니다."
      );
    } finally {
      setProcessing(false);
    }
  };

  const q = state.currentQuestion;
  const isPersonalized = !!q?.resumePersonalized;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="card-luxe p-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
            {ttsStatus === "synthesizing" && (
              <span className="keep-one-line flex items-center gap-1 text-accent">
                <IconVolume className="h-3 w-3 animate-pulse" /> 음성 준비 중…
              </span>
            )}
            {ttsStatus === "playing" && (
              <span className="keep-one-line flex items-center gap-1 text-accent">
                <IconVolume className="h-3 w-3 animate-pulse" /> 질문 재생 중
              </span>
            )}
            {isPersonalized && (
              <span className="keep-one-line rounded-full bg-gold/15 px-2 py-0.5 text-gold">
                자소서 맞춤 질문
              </span>
            )}
            {q?.isFollowUp && (
              <span className="keep-one-line rounded-full bg-accent/15 px-2 py-0.5 text-accent">
                꼬리질문
              </span>
            )}
            {q?.pressureTier === "TOUGH" && (
              <ClipDynamic
                as="span"
                className="keep-one-line max-w-[min(100%,14rem)] rounded-full bg-danger/15 px-2 py-0.5 text-danger sm:max-w-none"
                title={`🔥 ${q.personaLabel ?? "임원 압박면접 모드"}`}
              >
                🔥 {q.personaLabel ?? "임원 압박면접 모드"}
              </ClipDynamic>
            )}
            {q?.pressureTier === "GENTLE" && (
              <ClipDynamic
                as="span"
                className="keep-one-line max-w-[min(100%,14rem)] rounded-full bg-success/15 px-2 py-0.5 text-success sm:max-w-none"
                title={`🙂 ${q.personaLabel ?? "편안한 분위기"}`}
              >
                🙂 {q.personaLabel ?? "편안한 분위기"}
              </ClipDynamic>
            )}
            {q && (
              <ClipDynamic
                as="span"
                className="keep-one-line max-w-[min(100%,12rem)] text-muted sm:max-w-none"
                title={`L${q.level} · ${competencyLabel(q.competency)}`}
              >
                <span>L{q.level}</span>
                <span className="mx-1">·</span>
                <span>{competencyLabel(q.competency)}</span>
              </ClipDynamic>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-relaxed text-foreground">
            {q ? displayQuestionText(q) : "질문을 불러오는 중…"}
          </h2>
          {isPersonalized && q?.resumeAnchors && q.resumeAnchors.length > 0 && (
            <div className="mt-3 rounded-xl border border-gold/20 bg-gold/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-gold">자소서 근거</p>
              <ul className="mt-1.5 space-y-1">
                {q.resumeAnchors.map((anchor) => (
                  <li key={anchor} className="text-xs leading-relaxed text-muted">
                    「{anchor}」
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q?.rationale && (
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer select-none text-accent hover:underline">
                왜 이 질문인가요?
              </summary>
              <p className="mt-1 leading-relaxed">{q.rationale}</p>
            </details>
          )}
        </div>

        {state.chipHistory.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {state.chipHistory.map((chip, i) => (
              <LevelChip
                key={`${chip.competency}-${i}`}
                competency={chip.competency}
                level={chip.level}
                chipType={chip.chip_type}
                feedback={chip.brief_feedback}
                index={i}
              />
            ))}
          </div>
        )}

        <div className="card-luxe p-8">
          {processing ? (
            <LoadingRitual
              variant={state.shouldTerminate ? "report" : "interview"}
              competencyCode={q?.competency ?? focusCompetency}
            />
          ) : (
            <VoiceRecorder
              onTranscript={handleAnswer}
              disabled={!q}
              allowTextFallback
              onPasteDetected={() => {
                pasteDetectedRef.current = true;
              }}
            />
          )}
        </div>

        {lastFeedback && !processing && <AnswerFeedbackPanel feedback={lastFeedback} />}

        <p className="text-center text-xs text-muted">
          문항 {state.totalItems + 1}/{maxItems}
          {focusCompetency ? ` · ${competencyLabel(focusCompetency)}` : ""}
          {" · "}역량별 적응형 IRT
        </p>
      </div>

      <aside className="space-y-6">
        <div className="card-luxe p-5">
          <CompetencyBar
            states={state.competencyStates as Record<string, CompetencyState>}
            activeCompetency={q?.competency}
          />
        </div>

        <div className="card-luxe p-5 text-sm text-muted">
          <p className="mb-2 font-medium text-foreground">IRT 적응형 안내</p>
          <ul className="space-y-1 text-xs">
            <li>
              <span className="text-success">♩</span> 통과 → 더 높은 난이도 문항
            </li>
            <li>
              <span className="text-accent">♪</span> 부분 통과 → 비슷한 수준 유지
            </li>
            <li>
              <span className="text-warning">♭</span> 미달 → 쉬운 난이도로 조정
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed">
            매 답변마다 실력(θ)을 추정해 다음 질문 난이도를 맞춥니다.
          </p>
        </div>
      </aside>
    </div>
  );
}

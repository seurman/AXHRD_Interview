"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader, IconVolume } from "@/components/ui/icons";
import { LevelChip } from "./LevelChip";
import { CompetencyBar } from "./CompetencyBar";
import { VoiceRecorder } from "./VoiceRecorder";
import { AnswerFeedbackPanel } from "./AnswerFeedbackPanel";
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
  // Gemini TTS는 합성 자체에 시간이 걸릴 수 있어 "합성 중"과 "재생 중"을 구분해서 보여준다.
  // 구분 없이 재생 중 배지만 있으면 그 사이에는 아무 피드백이 없어 멈춘 것처럼 보인다.
  const [ttsStatus, setTtsStatus] = useState<"idle" | "synthesizing" | "playing">("idle");

  const playQuestionTts = useCallback(async (text: string) => {
    setTtsStatus("synthesizing");
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setTtsStatus("playing");
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
        URL.revokeObjectURL(url);
      }
    } catch {
      // TTS 없으면 텍스트만 표시
    } finally {
      setTtsStatus("idle");
    }
  }, []);

  useEffect(() => {
    const text = displayQuestionText(state.currentQuestion);
    if (text) playQuestionTts(text);
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
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `서버 오류 (${res.status})`
        );
      }

      const data = await res.json();

      if (data.answerFeedback) {
        setLastFeedback(data.answerFeedback as AnswerFeedback);
      }

      setState((prev) => ({
        ...prev,
        competencyStates: data.competencyStates,
        // 꼬리질문을 내는 턴에는 아직 채점이 확정되지 않아 chipEvent가 없다 —
        // 꼬리질문 답변까지 받아 최종 확정된 턴에만 칩을 추가한다.
        chipHistory: data.chipEvent
          ? [...prev.chipHistory, data.chipEvent as ChipEvent]
          : prev.chipHistory,
        administeredIds: data.administeredIds,
        totalItems: data.totalItems,
        shouldTerminate: data.shouldTerminate,
        currentQuestion: data.nextQuestion as InterviewQuestion | null,
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
              <span className="keep-one-line rounded-full bg-danger/15 px-2 py-0.5 text-danger">
                🔥 {q.personaLabel ?? "임원 압박면접 모드"}
              </span>
            )}
            {q?.pressureTier === "GENTLE" && (
              <span className="keep-one-line rounded-full bg-success/15 px-2 py-0.5 text-success">
                🙂 {q.personaLabel ?? "편안한 분위기"}
              </span>
            )}
            {q && (
              <span className="keep-one-line text-muted">
                <span>L{q.level}</span>
                <span className="mx-1">·</span>
                <span>{competencyLabel(q.competency)}</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-relaxed text-foreground">
            {q ? displayQuestionText(q) : "질문을 불러오는 중…"}
          </h2>
          {q?.rationale && (
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer select-none text-accent hover:underline">
                왜 이 질문인가요?
              </summary>
              <p className="mt-1 leading-relaxed">{q.rationale}</p>
            </details>
          )}
        </div>

        {/* Chip history — musical notes */}
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
            <div className="flex flex-col items-center gap-3 py-8 text-muted">
              <IconLoader className="h-8 w-8 text-accent" />
              <p>답변을 평가하고 IRT 난이도를 조정하는 중…</p>
              <p className="text-xs">STAR 구조·루브릭 기준으로 핵심 피드백을 준비합니다</p>
            </div>
          ) : (
            <VoiceRecorder onTranscript={handleAnswer} disabled={!q} allowTextFallback />
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

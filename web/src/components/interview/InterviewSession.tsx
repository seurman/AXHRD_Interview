"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LevelChip } from "./LevelChip";
import { CompetencyBar } from "./CompetencyBar";
import { VoiceRecorder } from "./VoiceRecorder";
import { AnswerFeedbackPanel } from "./AnswerFeedbackPanel";
import { ClaimVerificationFeedbackPanel } from "./ClaimVerificationFeedbackPanel";
import { TripleFeedbackPanel } from "./TripleFeedbackPanel";
import { QuestionRationaleTooltip } from "./QuestionRationaleTooltip";
import { LoadingRitual } from "@/components/ux/LoadingRitual";
import { LeaveConfirmDialog } from "@/components/ux/LeaveConfirmDialog";
import { ClipDynamic } from "@/components/ui/ClipDynamic";
import { Progress } from "@/components/ui/progress";
import { competencyLabel } from "@/lib/labels";
import { displayQuestionText } from "@/lib/interview/build-question";
import { COMPETENCY_SESSION_MAX_ITEMS } from "@/lib/interview/session-limits";
import { ttsCacheKeyForQuestion } from "@/lib/interview/tts-cache-key";
import {
  readVoiceModeEnabled,
  writeVoiceModeEnabled,
} from "@/lib/voice/voice-mode";
import { cn } from "@/lib/cn";
import { trackFunnel } from "@/lib/analytics/funnel";
import {
  averageDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import type {
  AnswerFeedback,
  ChipEvent,
  CompetencyState,
  InterviewQuestion,
  InterviewSessionState,
} from "@/types";

/** 답변 → 코칭 → 다음 문항 흐름 */
type SessionPhase = "ready" | "evaluating" | "reviewing";

interface InterviewSessionProps {
  sessionId: string;
  initialState: InterviewSessionState;
  focusCompetency?: string;
  maxItems?: number;
  /** 세션 시간 예산(분) — 문항당 권장 시간·페이스 경고에 사용 */
  timeBudgetMinutes?: number;
  tripleFeedbackMode?: boolean;
  /** 설정 화면에서 여러 역량을 골랐을 때, 이 세션 다음에 이어갈 나머지 역량 코드들.
   *  DB에 저장하지 않고 URL로만 들고 다니다가, 세션이 끝나면 리포트 페이지 URL에
   *  그대로 이어 붙여서 "다음 역량 이어서 시작" 버튼이 읽을 수 있게 한다. */
  queue?: string[];
  /** 자소서·공고 등 세션 맥락 — 중간에 근거로 보여 줌 */
  grounding?: {
    companyName?: string | null;
    hasResume?: boolean;
    resumeFileName?: string | null;
    hasJd?: boolean;
  };
}

export function InterviewSession({
  sessionId,
  initialState,
  focusCompetency,
  maxItems = COMPETENCY_SESSION_MAX_ITEMS,
  timeBudgetMinutes,
  tripleFeedbackMode = false,
  queue = [],
  grounding,
}: InterviewSessionProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [phase, setPhase] = useState<SessionPhase>("ready");
  const [lastFeedback, setLastFeedback] = useState<AnswerFeedback | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] =
    useState<InterviewQuestion | null>(null);
  const [lastFailedAnswer, setLastFailedAnswer] = useState<{
    transcript: string;
    durationSec?: number;
  } | null>(null);
  const [dimensionHistory, setDimensionHistory] = useState<AnswerDimensions[]>([]);
  const [ttsStatus, setTtsStatus] = useState<"idle" | "synthesizing" | "playing">("idle");
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [paceWarned, setPaceWarned] = useState(false);
  const [mobileInsightsOpen, setMobileInsightsOpen] = useState(false);

  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const pasteDetectedRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const questionStartedAtRef = useRef<number>(Date.now());

  const recommendedSec = useMemo(() => {
    if (!timeBudgetMinutes || maxItems <= 0) return null;
    return Math.max(45, Math.round((timeBudgetMinutes * 60) / maxItems));
  }, [timeBudgetMinutes, maxItems]);

  useEffect(() => {
    setVoiceModeEnabled(readVoiceModeEnabled());
  }, []);

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

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        tabSwitchCountRef.current += 1;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // 문항이 바뀔 때마다 페이스 타이머 리셋
  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    setElapsedSec(0);
    setPaceWarned(false);
  }, [state.currentQuestion?.id, state.currentQuestion?.isFollowUp]);

  useEffect(() => {
    if (phase === "evaluating" || phase === "reviewing") return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - questionStartedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, state.currentQuestion?.id]);

  useEffect(() => {
    if (!recommendedSec || paceWarned || phase === "evaluating" || phase === "reviewing") {
      return;
    }
    if (elapsedSec >= Math.round(recommendedSec * 0.8)) {
      setPaceWarned(true);
      toast.message("권장 답변 시간의 80%를 지났습니다", {
        description: `이 문항은 약 ${Math.round(recommendedSec / 60)}분 안팎을 권장합니다. 강제 종료는 없습니다.`,
      });
    }
  }, [elapsedSec, recommendedSec, paceWarned, phase]);

  const prefetchQuestionTts = useCallback(async (cacheKey: string, text: string) => {
    if (!text.trim() || ttsCacheRef.current.has(cacheKey)) return;
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, sessionId }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      ttsCacheRef.current.set(cacheKey, URL.createObjectURL(blob));
    } catch {
      /* TTS 프리페치 실패는 무시 — 재생 시 재시도 */
    }
  }, [sessionId]);

  const playQuestionTts = useCallback(async (cacheKey: string, text: string) => {
    if (!text.trim()) return;

    stopActiveAudio();

    const cached = ttsCacheRef.current.get(cacheKey);
    if (cached) {
      setTtsStatus("playing");
      try {
        const audio = new Audio(cached);
        activeAudioRef.current = audio;
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
      } catch {
        /* 재생 실패 */
      } finally {
        activeAudioRef.current = null;
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
        ttsCacheRef.current.set(cacheKey, url);
        const audio = new Audio(url);
        activeAudioRef.current = audio;
        setTtsStatus("playing");
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
      }
    } catch {
      // TTS 없으면 텍스트만 표시
    } finally {
      activeAudioRef.current = null;
      setTtsStatus("idle");
    }
  }, [sessionId, stopActiveAudio]);

  useEffect(() => {
    const q = state.currentQuestion;
    // reviewing/evaluating 중에는 TTS·다음 질문 음성이 겹치지 않게
    if (!q || !voiceModeEnabled || phase === "evaluating" || phase === "reviewing") return;
    const text = displayQuestionText(q);
    if (text) void playQuestionTts(ttsCacheKeyForQuestion(q, text), text);
  }, [
    state.currentQuestion?.id,
    state.currentQuestion?.isFollowUp,
    state.currentQuestion?.personalizedText,
    voiceModeEnabled,
    phase,
    playQuestionTts,
  ]);

  useEffect(() => () => stopActiveAudio(), [stopActiveAudio]);

  const advanceToNextQuestion = useCallback(() => {
    stopActiveAudio();
    setLastFeedback(null);
    setLastFailedAnswer(null);
    setState((prev) => ({
      ...prev,
      currentQuestion: pendingNextQuestion,
    }));
    setPendingNextQuestion(null);
    setPhase("ready");
  }, [pendingNextQuestion, stopActiveAudio]);

  const handleAnswer = async (transcript: string, durationSec?: number) => {
    if (!state.currentQuestion || phase === "evaluating" || phase === "reviewing") return;
    stopActiveAudio();
    setPhase("evaluating");
    setLastFeedback(null);
    setPendingNextQuestion(null);
    setLastFailedAnswer(null);
    trackFunnel("interview_answer", {
      sessionId,
      competency: focusCompetency ?? state.currentQuestion.competency,
      item: state.totalItems + 1,
      isFollowUp: Boolean(state.currentQuestion.isFollowUp),
    });

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
      if (nextQuestion?.id && voiceModeEnabled) {
        const nextText = displayQuestionText(nextQuestion);
        void prefetchQuestionTts(ttsCacheKeyForQuestion(nextQuestion, nextText), nextText);
      }

      const feedback = (data.answerFeedback as AnswerFeedback | undefined) ?? null;
      if (feedback) {
        setLastFeedback(feedback);
        if (feedback.dimensions && !feedback.isInterim) {
          setDimensionHistory((prev) => [...prev, feedback.dimensions!]);
        }
      }

      const holdForFeedback = Boolean(feedback) && !data.shouldTerminate;

      setState((prev) => ({
        ...prev,
        competencyStates: data.competencyStates,
        chipHistory: data.chipEvent
          ? [...prev.chipHistory, data.chipEvent as ChipEvent]
          : prev.chipHistory,
        administeredIds: data.administeredIds,
        totalItems: data.totalItems,
        shouldTerminate: data.shouldTerminate,
        currentQuestion: holdForFeedback ? prev.currentQuestion : nextQuestion,
        status: data.shouldTerminate ? "completed" : "in_progress",
      }));

      if (holdForFeedback) {
        setPendingNextQuestion(nextQuestion);
        setPhase("reviewing");
      } else {
        setPendingNextQuestion(null);
        setPhase("ready");
      }

      if (data.shouldTerminate) {
        const base = data.redirectUrl ?? `/interview/${sessionId}/report`;
        if (queue.length > 0) {
          const [path, existingQs] = base.split("?");
          const params = new URLSearchParams(existingQs ?? "");
          params.set("queue", queue.join(","));
          router.push(`${path}?${params.toString()}`);
        } else {
          router.push(base);
        }
      }
    } catch (e) {
      console.error(e);
      setLastFailedAnswer({ transcript, durationSec });
      setPhase("ready");
      toast.error(
        e instanceof Error ? e.message : "답변 처리 중 오류가 발생했습니다.",
        {
          action: {
            label: "다시 제출",
            onClick: () => {
              void handleAnswer(transcript, durationSec);
            },
          },
        },
      );
    }
  };

  const q = state.currentQuestion;
  const isPersonalized = !!q?.resumePersonalized;
  const isFollowUp = Boolean(q?.isFollowUp);
  const sessionAverage =
    dimensionHistory.length > 1
      ? averageDimensions(dimensionHistory.slice(0, -1))
      : null;

  const itemProgress =
    q?.isClaimVerification || q?.isBonusQuestion || isFollowUp
      ? Math.min(100, (state.totalItems / maxItems) * 100)
      : Math.min(100, ((state.totalItems + 1) / maxItems) * 100);

  const paceRatio =
    recommendedSec && recommendedSec > 0
      ? Math.min(1, elapsedSec / recommendedSec)
      : null;

  return (
    <div className="product-stage product-stage--wide">
      <div className="product-stage__inner !max-w-5xl space-y-5">
        <div className="interview-progress">
          <div className="interview-progress__row">
            <span className="interview-progress__label">
              {q?.isClaimVerification
                ? `경험 확인 질문 (참고용)${focusCompetency ? ` · ${competencyLabel(focusCompetency)}` : ""}`
                : q?.isBonusQuestion
                  ? `보너스 질문 (참고용)${focusCompetency ? ` · ${competencyLabel(focusCompetency)}` : ""}`
                  : isFollowUp
                    ? `꼬리질문 · 직전 답변 심화${focusCompetency ? ` · ${competencyLabel(focusCompetency)}` : ""}`
                    : `문항 ${state.totalItems + 1}/${maxItems}${focusCompetency ? ` · ${competencyLabel(focusCompetency)}` : ""}`}
            </span>
            <div className="flex items-center gap-3">
              <span className="interview-progress__pct">{Math.round(itemProgress)}%</span>
              <button
                type="button"
                className="shrink-0 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setLeaveOpen(true)}
              >
                나가기
              </button>
            </div>
          </div>
          <Progress value={itemProgress} aria-label="면접 문항 진행률" />
          {recommendedSec && phase !== "reviewing" && phase !== "evaluating" ? (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
              <span>
                이 문항 권장 {Math.round(recommendedSec / 60)}분 · 경과{" "}
                {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
              </span>
              {paceRatio != null && paceRatio >= 0.8 ? (
                <span className="font-medium text-warning">페이스 안내 (강제 종료 없음)</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 sm:space-y-6">
        <div
          className={cn(
            "card-luxe card-luxe--session p-4 sm:p-6",
            isFollowUp && "border-accent/40 ring-1 ring-accent/20",
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
            {voiceModeEnabled && ttsStatus !== "idle" && phase === "ready" && (
              <span className="sr-only">
                {ttsStatus === "synthesizing" ? "음성 준비 중" : "질문 재생 중"}
              </span>
            )}
            {isFollowUp && (
              <span className="keep-one-line rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">
                꼬리질문
              </span>
            )}
            {isPersonalized && (
              <span className="keep-one-line rounded-full bg-gold/15 px-2 py-0.5 text-gold">
                자소서 맞춤 질문
              </span>
            )}
            {q?.isBonusQuestion && !q?.isClaimVerification && (
              <span className="keep-one-line rounded-full bg-muted/20 px-2 py-0.5 text-muted">
                공고 맞춤 보너스 · 점수 미반영
              </span>
            )}
            {q?.isClaimVerification && (
              <span className="keep-one-line rounded-full bg-gold/15 px-2 py-0.5 text-gold">
                경험 확인 질문 · 점수 미반영
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
            <button
              type="button"
              onClick={toggleVoiceMode}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                voiceModeEnabled
                  ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15"
                  : "border-card-border bg-background text-muted hover:text-foreground"
              )}
              aria-pressed={voiceModeEnabled}
            >
              {voiceModeEnabled ? "보이스 모드 켜짐" : "보이스 모드 꺼짐"}
            </button>
          </div>
          {isFollowUp ? (
            <p className="mb-2 text-xs font-medium text-accent">
              직전 답변을 더 구체적으로 확인하는 꼬리질문입니다. 진행률에는 별도 문항으로
              잡히지 않습니다.
            </p>
          ) : null}
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold leading-relaxed tracking-tight text-foreground sm:text-xl">
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
          {q?.rationale && <QuestionRationaleTooltip rationale={q.rationale} />}
          {(grounding?.hasResume || grounding?.hasJd || grounding?.companyName) && (
            <div className="mt-3 rounded-xl border border-card-border bg-background/70 px-3 py-2 text-xs text-muted">
              <span className="font-semibold text-foreground">세션 맥락 · </span>
              {[
                grounding.companyName ? `${grounding.companyName}` : null,
                grounding.hasResume
                  ? grounding.resumeFileName
                    ? `자소서(${grounding.resumeFileName})`
                    : "자소서 반영"
                  : null,
                grounding.hasJd ? "채용공고 반영" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {isPersonalized ? " · 이 문항은 자소서 근거와 연결됩니다" : ""}
            </div>
          )}
        </div>

        {state.chipHistory.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              className="text-xs font-medium text-muted underline-offset-2 hover:underline lg:hidden"
              onClick={() => setMobileInsightsOpen((v) => !v)}
            >
              {mobileInsightsOpen ? "레벨 칩 접기" : `레벨 칩 ${state.chipHistory.length}개 보기`}
            </button>
            <div
              className={cn(
                "flex flex-wrap gap-2",
                !mobileInsightsOpen && "hidden lg:flex",
              )}
            >
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
          </div>
        )}

        <div className="card-luxe card-luxe--session interview-answer-dock p-4 sm:p-8">
          {phase === "evaluating" ? (
            <LoadingRitual
              variant={state.shouldTerminate ? "report" : "interview"}
              competencyCode={q?.competency ?? focusCompetency}
            />
          ) : phase === "reviewing" ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted">
                아래 피드백을 확인한 뒤 다음 질문으로 넘어가세요.
              </p>
              <button
                type="button"
                className="btn-primary px-6 py-2.5 text-sm"
                onClick={advanceToNextQuestion}
              >
                다음 질문으로
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <VoiceRecorder
                onTranscript={handleAnswer}
                disabled={!q}
                allowTextFallback
                voiceInputEnabled={voiceModeEnabled}
                submitMode="draft"
                confirmLabel="답변 제출"
                idleHint="마이크를 눌러 답변을 녹음하세요. 정지 후 내용을 확인·수정할 수 있습니다."
                onPasteDetected={() => {
                  pasteDetectedRef.current = true;
                }}
              />
              {lastFailedAnswer ? (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-center">
                  <p className="text-xs text-danger">
                    직전 답변 제출에 실패했습니다. 진행 상태는 유지됩니다.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary mt-2 px-4 py-1.5 text-sm"
                    onClick={() =>
                      void handleAnswer(
                        lastFailedAnswer.transcript,
                        lastFailedAnswer.durationSec,
                      )
                    }
                  >
                    같은 답변 다시 제출
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {lastFeedback && phase === "reviewing" ? (
          lastFeedback.claimVerification ? (
            <ClaimVerificationFeedbackPanel feedback={lastFeedback} />
          ) : tripleFeedbackMode && lastFeedback.tripleFeedback ? (
            <TripleFeedbackPanel
              feedback={lastFeedback}
              tripleFeedback={lastFeedback.tripleFeedback}
              sessionAverage={sessionAverage}
            />
          ) : (
            <AnswerFeedbackPanel feedback={lastFeedback} sessionAverage={sessionAverage} />
          )
        ) : null}

      </div>

      <aside className="space-y-4 sm:space-y-6">
        <div className="card-luxe card-luxe--session p-4 sm:p-5">
          <button
            type="button"
            className="section-eyebrow mb-3 flex w-full items-center justify-between text-left lg:pointer-events-none"
            onClick={() => setMobileInsightsOpen((v) => !v)}
          >
            <span>실시간 추정</span>
            <span className="text-[10px] font-normal text-muted lg:hidden">
              {mobileInsightsOpen ? "접기" : "펼치기"}
            </span>
          </button>
          <div className={cn(!mobileInsightsOpen && "hidden lg:block")}>
            <CompetencyBar
              states={state.competencyStates as Record<string, CompetencyState>}
              activeCompetency={q?.competency}
            />
          </div>
        </div>

        <div className="card-luxe card-luxe--session hidden p-5 text-sm text-muted lg:block">
          <p className="mb-2 font-[family-name:var(--font-outfit)] font-bold text-foreground">
            IRT 적응형 안내
          </p>
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

      <LeaveConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="면접을 잠시 나가시겠습니까?"
        description="진행 상태는 저장됩니다. 같은 세션 링크로 돌아오면 이어서 볼 수 있습니다. 설정 화면으로 나가도 세션은 삭제되지 않습니다."
        leaveHref="/interview/setup"
        sessionUrl={`/interview/${sessionId}`}
      />
      </div>
    </div>
  );
}
